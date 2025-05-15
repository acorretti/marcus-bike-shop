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
      .mockResolvedValueOnce([{ id: 10 }]); // items found

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
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query
      .mockResolvedValueOnce(order) // insert OrderItems
      .mockResolvedValueOnce([order.id, orderItemConf.partOptionId]) // insert OrderItemConfiguration
      .mockResolvedValueOnce({}); // updateCartTotal

    const result = await orderService.addToCart(
      cart.customer,
      productId,
      [orderItemConf],
      quantity,
      totalPrice
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
    const newCart = { id: 99, customer: 98 };
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(newCart);
    database.query
      .mockResolvedValueOnce({ id: 77 }) // insert OrderItems
      .mockResolvedValueOnce({}); // updateCartTotal

    const result = await orderService.addToCart(
      newCart.customer,
      productId,
      [orderItemConf],
      quantity,
      totalPrice
    );

    expect(orderService.getOrCreateCart).toHaveBeenCalledWith(98);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO OrderItems'),
      [newCart.id, productId, quantity, totalPrice]
    );
    expect(result.cartItemId).toBe(77);
  });

  it('handles empty selectedOptions array', async () => {
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query
      .mockResolvedValueOnce(order) // insert OrderItems
      .mockResolvedValueOnce({}); // updateCartTotal

    const result = await orderService.addToCart(
      cart.customer,
      productId,
      [],
      quantity,
      totalPrice
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
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query.mockRejectedValueOnce(new Error('DB error'));

    await expect(
      orderService.addToCart(
        cart.customer,
        productId,
        [orderItemConf],
        quantity,
        totalPrice
      )
    ).rejects.toThrow('DB error');
  });

  it('adds multiple selectedOptions', async () => {
    orderService.getOrCreateCart = jest.fn().mockResolvedValue(cart);
    database.query
      .mockResolvedValueOnce(order) // insert OrderItems
      .mockResolvedValueOnce({}) // insert OrderItemConfiguration for first option
      .mockResolvedValueOnce({}) // insert OrderItemConfiguration for second option
      .mockResolvedValueOnce({}); // updateCartTotal

    const options = [{ partOptionId: 7 }, { partOptionId: 8 }];

    const result = await orderService.addToCart(
      cart.customer,
      productId,
      options,
      quantity,
      totalPrice
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
