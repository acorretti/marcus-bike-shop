const OrderService = require('./orders');
const database = require('../../tests/mock_database');

describe('OrderService.checkout', () => {
  let orderService;

  beforeEach(() => {
    database.reset();
    orderService = new OrderService(database);
  });

  it('returns failure if cart not found', async () => {
    database.query.mockResolvedValueOnce(null);

    const result = await orderService.checkout(1, {}, {});

    expect(result).toEqual({
      success: false,
      message: 'Cart not found',
    });
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, customer_id, total_price'),
      [1]
    );
  });

  it('returns failure if cart is empty', async () => {
    database.query
      .mockResolvedValueOnce({ id: 1, customer_id: 2, total_price: 100 }) // cart found
      .mockResolvedValueOnce([]); // no items

    const result = await orderService.checkout(1, {}, {});

    expect(result).toEqual({
      success: false,
      message: 'Cart is empty',
    });
    expect(database.query).toHaveBeenCalledTimes(2);
  });

  it('returns failure if payment fails', async () => {
    database.query
      .mockResolvedValueOnce({ id: 1, customer_id: 2, total_price: 100 }) // cart found
      .mockResolvedValueOnce([{ id: 10 }]) // items found
      .mockResolvedValueOnce([]); // inventory check

    jest.spyOn(orderService, 'processPayment').mockResolvedValueOnce({
      success: false,
      details: 'Card declined',
    });

    const result = await orderService.checkout(1, {}, {});

    expect(result).toEqual({
      success: false,
      message: 'Payment failed',
      details: 'Card declined',
    });
    expect(orderService.processPayment).toHaveBeenCalledWith(100, {});
  });

  it('updates order and returns success if payment succeeds', async () => {
    database.query
      .mockResolvedValueOnce({ id: 1, customer_id: 2, total_price: 100 }) // cart found
      .mockResolvedValueOnce([{ id: 10 }]) // items found
      .mockResolvedValueOnce([]) // inventory check
      .mockResolvedValueOnce({}); // update query

    jest.spyOn(orderService, 'processPayment').mockResolvedValueOnce({
      success: true,
      reference: 'PAY-123',
    });

    const shippingDetails = { address: '123 Main St' };
    const paymentDetails = { card: '****' };

    const result = await orderService.checkout(
      1,
      shippingDetails,
      paymentDetails
    );

    expect(result).toEqual({
      success: true,
      message: 'Order placed successfully',
      orderId: 1,
      paymentReference: 'PAY-123',
    });

    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Orders'),
      [JSON.stringify(shippingDetails), 'PAY-123', 1]
    );
  });
});

describe('OrderService.addToCart', () => {
  // Mock data
  const cart = { id: 5, customer: 1 };
  const productId = 2;
  const quantity = 3;
  const totalPrice = 123;
  const order = { id: 42 };
  const orderItemConf = { partOptionId: 7 };

  let orderService;

  beforeEach(() => {
    database.reset();
    orderService = new OrderService(database);
  });

  it('adds item to existing cart and updates total', async () => {
    // Mock validateConfiguration DB calls
    database.query
      .mockResolvedValueOnce([{ id: 7, name: 'Part' }]) // requiredPartTypes
      .mockResolvedValueOnce({ part_type_id: 7 }) // selectedOptions
      .mockResolvedValueOnce({ in_stock: true, quantity: 5 }) // checkInventory
      .mockResolvedValueOnce({ base_price: totalPrice }) // calculateTotalPrice
      .mockResolvedValueOnce([{ id: productId, base_price: 0 }]); // getProductPrice
    // Mock getOrCreateCart to return existing cart
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query
      .mockResolvedValueOnce(order) // insert OrderItems
      .mockResolvedValueOnce({}) // insert OrderItemConfiguration
      .mockResolvedValueOnce({}); // updateCartTotal

    const result = await orderService.addToCart(
      cart.customer,
      productId,
      [orderItemConf],
      quantity
    );

    expect(orderService.getOrCreateCart).toHaveBeenCalledWith(1);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItems'),
      [cart.id, productId, quantity, totalPrice]
    );
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItemConfiguration'),
      [order.id, orderItemConf.partOptionId]
    );
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Orders'),
      [5, 5]
    );
    expect(result).toEqual({
      success: true,
      message: 'Item added to cart',
      cartItemId: 42,
    });
  });

  it('creates a new cart if none exists', async () => {
    // Mock validateConfiguration DB calls
    database.query
      .mockResolvedValueOnce([{ id: 7, name: 'Part' }]) // requiredPartTypes
      .mockResolvedValueOnce({ part_type_id: 7 }) // selectedOptions
      .mockResolvedValueOnce({ in_stock: true, quantity: 5 }) // checkInventory
      .mockResolvedValueOnce({ base_price: totalPrice }) // calculateTotalPrice
      .mockResolvedValueOnce([{ id: productId, base_price: 0 }]); // getProductPrice

    const newCart = { id: 99, customer: 98 };
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(newCart);
    database.query
      .mockResolvedValueOnce({ id: 77 }) // insert OrderItems
      .mockResolvedValueOnce({}); // updateCartTotal

    const result = await orderService.addToCart(
      newCart.customer,
      productId,
      [orderItemConf],
      quantity
    );

    expect(orderService.getOrCreateCart).toHaveBeenCalledWith(98);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItems'),
      [newCart.id, productId, quantity, totalPrice]
    );
    expect(result.cartItemId).toBe(77);
  });

  it('handles empty selectedOptions array', async () => {
    // Mock validateConfiguration DB calls
    database.query
      .mockResolvedValueOnce([]) // requiredPartTypes
      .mockResolvedValueOnce({ base_price: totalPrice }) // calculateTotalPrice
      .mockResolvedValueOnce([]); // optionPrices

    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query
      .mockResolvedValueOnce(order) // insert OrderItems
      .mockResolvedValueOnce({}); // updateCartTotal

    const result = await orderService.addToCart(
      cart.customer,
      productId,
      [],
      quantity
    );

    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItems'),
      [cart.id, productId, quantity, totalPrice]
    );
    // Should not call INSERT INTO OrderItemConfiguration
    expect(database.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItemConfiguration'),
      expect.anything()
    );
    expect(result.success).toBe(true);
    expect(result.cartItemId).toBe(order.id);
  });

  it('throws if database.query for OrderItems fails', async () => {
    database.query
      .mockResolvedValueOnce([{ valid: true, message: 'ok' }]) // validateConfiguration
      .mockResolvedValueOnce({ totalPrice }); // calculateTotalPrice
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query.mockRejectedValueOnce(new Error('DB error'));

    await expect(
      orderService.addToCart(
        cart.customer,
        productId,
        [orderItemConf],
        quantity
      )
    ).rejects.toThrow('DB error');
  });

  it('adds multiple selectedOptions', async () => {
    database.query
      .mockResolvedValueOnce([
        { id: 7, name: 'Part 1' },
        { id: 8, name: 'Part 2' },
      ]) // requiredPartTypes
      .mockResolvedValueOnce({ part_type_id: 7 }) // selectedOptions
      .mockResolvedValueOnce({ part_type_id: 8 }) // selectedOptions
      .mockResolvedValueOnce(0) // checkConflict
      .mockResolvedValueOnce({ in_stock: true, quantity: 5 }) // checkInventory
      .mockResolvedValueOnce({ in_stock: true, quantity: 5 }) // checkInventory
      .mockResolvedValueOnce({ base_price: totalPrice }) // calculateTotalPrice
      .mockResolvedValueOnce([{ id: productId, base_price: 0 }]) // getProductPrice
      .mockResolvedValueOnce([]); // priceAdjustments

    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query
      .mockResolvedValueOnce(order) // insert OrderItems
      .mockResolvedValueOnce({ id: 77 }) // insert OrderItemConfiguration for first option
      .mockResolvedValueOnce({ id: 78 }) // insert OrderItemConfiguration for second option
      .mockResolvedValueOnce({}); // updateCartTotal

    const options = [{ partOptionId: 7 }, { partOptionId: 8 }];

    const result = await orderService.addToCart(
      cart.customer,
      productId,
      options,
      quantity
    );

    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItemConfiguration'),
      [order.id, 7]
    );
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItemConfiguration'),
      [order.id, 8]
    );
    expect(result.success).toBe(true);
    expect(result.cartItemId).toBe(order.id);
  });
});

describe('OrderService.verifyInventoryForCart', () => {
  let orderService;

  beforeEach(() => {
    database.reset();
    orderService = new OrderService(database);
  });

  it('returns available=true if all inventory is sufficient', async () => {
    // Mock items in cart
    database.query
      .mockResolvedValueOnce([{ id: 1, product_id: 2, quantity: 2 }]) // OrderItems
      .mockResolvedValueOnce([{ part_option_id: 10 }]) // Configurations for item 1
      .mockResolvedValueOnce({
        in_stock: true,
        quantity: 5,
      }); // Inventory for part_option_id 10

    const result = await orderService.verifyInventoryForCart(123);

    expect(result.available).toBe(true);
    expect(result.unavailableItems).toEqual([]);
  });

  it('returns available=false if inventory is insufficient', async () => {
    database.query
      .mockResolvedValueOnce([{ id: 1, product_id: 2, quantity: 3 }]) // OrderItems
      .mockResolvedValueOnce([{ part_option_id: 10 }]) // Configurations for item 1
      .mockResolvedValueOnce({
        in_stock: true,
        quantity: 2,
      }); // Inventory for part_option_id 10

    const result = await orderService.verifyInventoryForCart(123);

    expect(result.available).toBe(false);
    expect(result.unavailableItems.length).toBe(1);
    expect(result.unavailableItems[0]).toMatchObject({
      orderItemId: 1,
      partOptionId: 10,
      requestedQuantity: 3,
      availableQuantity: 2,
    });
  });

  it('returns available=false if inventory is not in stock', async () => {
    database.query
      .mockResolvedValueOnce([{ id: 1, product_id: 2, quantity: 1 }]) // OrderItems
      .mockResolvedValueOnce([{ part_option_id: 11 }]) // Configurations for item 1
      .mockResolvedValueOnce({
        in_stock: false,
        quantity: 0,
      }); // Inventory for part_option_id 11

    const result = await orderService.verifyInventoryForCart(123);

    expect(result.available).toBe(false);
    expect(result.unavailableItems[0].partOptionId).toBe(11);
  });

  it('returns available=false if inventory record is missing', async () => {
    database.query
      .mockResolvedValueOnce([{ id: 1, product_id: 2, quantity: 1 }]) // OrderItems
      .mockResolvedValueOnce([{ part_option_id: 12 }]) // Configurations for item 1
      .mockResolvedValueOnce(null); // Inventory missing

    const result = await orderService.verifyInventoryForCart(123);

    expect(result.available).toBe(false);
    expect(result.unavailableItems[0].partOptionId).toBe(12);
    expect(result.unavailableItems[0].availableQuantity).toBe(0);
  });
});

describe('OrderService.updateInventoryFromOrder', () => {
  let orderService;

  beforeEach(() => {
    database.reset();
    orderService = new OrderService(database);
  });

  it('updates inventory quantities and in_stock status for each configuration', async () => {
    // Mock OrderItems
    database.query
      .mockResolvedValueOnce([{ id: 1, quantity: 2 }]) // OrderItems for order
      .mockResolvedValueOnce([{ part_option_id: 10 }]) // Configurations for item 1
      .mockResolvedValueOnce({}) // UPDATE Inventory quantity
      .mockResolvedValueOnce({}); // UPDATE Inventory in_stock

    await orderService.updateInventoryFromOrder(123);

    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Inventory'),
      [2, 10]
    );
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Inventory'),
      [10]
    );
  });
});
