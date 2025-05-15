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
