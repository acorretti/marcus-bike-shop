/**
 * OrderService
 *
 * Handles cart, checkout, and order management functionality
 */

class OrderService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Gets the current cart for a customer or creates a new one
   */
  async getOrCreateCart(customerId) {
    // Look for an existing cart (order with 'cart' status)
    const existingCart = await this.database.query(
      `SELECT id FROM Orders 
       WHERE customer_id = ? AND status = 'cart'
       LIMIT 1`,
      [customerId]
    );

    if (existingCart) {
      return existingCart;
    }

    // Create a new cart
    const newCart = await this.database.query(
      `INSERT INTO Orders
         (customer_id, status, total_price)
       VALUES (?, 'cart', 0)
       RETURNING id`,
      [customerId]
    );

    return newCart;
  }

  /**
   * Updates the total price of a cart
   */
  async updateCartTotal(cartId) {
    await this.database.query(
      `UPDATE Orders
       SET total_price = (
         SELECT SUM(price * quantity)
         FROM OrderItems
         WHERE order_id = ?
       )
       WHERE id = ?`,
      [cartId, cartId]
    );
  }

  /**
   * Gets the current cart contents for a customer
   *
   * @param {number} customerId - The customer ID
   * @returns {Object} Cart details with items
   */
  async getCart(customerId) {
    const cart = await this.database.query(
      `SELECT id, date_created, status, total_price
       FROM Orders
       WHERE customer_id = ? AND status = 'cart'
       LIMIT 1`,
      [customerId]
    );

    if (!cart) {
      return { items: [], total: 0 };
    }

    const items = await this.database.query(
      `SELECT oi.id, oi.product_id, p.name as product_name, 
              oi.quantity, oi.price
       FROM OrderItems oi
       JOIN Products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [cart.id]
    );

    return {
      id: cart.id,
      dateCreated: cart.date_created,
      items,
      total: cart.total_price,
    };
  }

  /**
   * Processes checkout from cart to order
   *
   * @param {number} cartId - The cart ID
   * @param {Object} shippingDetails - Shipping information
   * @param {Object} paymentDetails - Payment information
   * @returns {Object} Result of the checkout operation
   */
  async checkout(cartId, shippingDetails, paymentDetails) {
    // Verify cart exists and has items
    const cart = await this.database.query(
      `SELECT id, customer_id, total_price
       FROM Orders
       WHERE id = ? AND status = 'cart'`,
      [cartId]
    );

    if (!cart) {
      return {
        success: false,
        message: 'Cart not found',
      };
    }

    const items = await this.database.query(
      `SELECT id FROM OrderItems WHERE order_id = ?`,
      [cartId]
    );

    if (items.length === 0) {
      return {
        success: false,
        message: 'Cart is empty',
      };
    }

    // Process payment (simplified)
    const paymentResult = await this.processPayment(
      cart.total_price,
      paymentDetails
    );

    if (!paymentResult.success) {
      return {
        success: false,
        message: 'Payment failed',
        details: paymentResult.details,
      };
    }

    // Update order status
    await this.database.query(
      `UPDATE Orders
       SET status = 'pending',
           shipping_address = ?,
           payment_reference = ?
       WHERE id = ?`,
      [JSON.stringify(shippingDetails), paymentResult.reference, cartId]
    );

    return {
      success: true,
      message: 'Order placed successfully',
      orderId: cartId,
      paymentReference: paymentResult.reference,
    };
  }

  /**
   * Processes a payment (simplified mock)
   */
  async processPayment(amount, paymentDetails) {
    // This would call a payment gateway

    // Mock implementation
    return {
      success: true,
      reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  }
}

module.exports = OrderService;
