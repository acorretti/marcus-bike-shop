/**
 * OrderService
 *
 * Handles cart, checkout, and order management functionality
 */
const ProductConfigurationService = require('./product_configuration');

class OrderService {
  constructor(database) {
    this.database = database;
    this.productConfigService = new ProductConfigurationService(database);
  }

  /**
   * Adds a configured product to the cart
   *
   * @param {number} customerId - The customer ID
   * @param {number} productId - The product being added
   * @param {Array} selectedOptions - Selected part options
   * @param {number} quantity - Number of items to add
   * @returns {Object} Result of the operation
   */
  async addToCart(customerId, productId, selectedOptions, quantity = 1) {
    // 1. Validate the configuration first
    const validationResult =
      await this.productConfigService.validateConfiguration(
        productId,
        selectedOptions
      );

    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message,
        details: validationResult,
      };
    }

    // 2. Calculate the price for this configuration
    const pricing = await this.productConfigService.calculateTotalPrice(
      productId,
      selectedOptions
    );

    // 3. Get or create cart for this customer
    let cart = await this.getOrCreateCart(customerId);

    // 4. Add item to cart
    const [cartItem] = await this.database.query(
      `INSERT INTO OrderItems 
         (order_id, product_id, quantity, price) 
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [cart.id, productId, quantity, pricing.totalPrice]
    );

    // 5. Save the configuration for this cart item
    for (const option of selectedOptions) {
      await this.database.query(
        `INSERT INTO OrderItemConfiguration
           (order_item_id, part_option_id)
         VALUES (?, ?)`,
        [cartItem.id, option.partOptionId]
      );
    }

    // 6. Update cart total
    await this.updateCartTotal(cart.id);

    return {
      success: true,
      message: 'Item added to cart',
      cartItemId: cartItem.id,
    };
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

    // Get configuration details for each item
    for (const item of items) {
      const configuration = await this.database.query(
        `SELECT oic.part_option_id, po.name as option_name, pt.name as part_type
         FROM OrderItemConfiguration oic
         JOIN PartOptions po ON oic.part_option_id = po.id
         JOIN PartTypes pt ON po.part_type_id = pt.id
         WHERE oic.order_item_id = ?`,
        [item.id]
      );

      item.configuration = configuration;
    }

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

    // Verify inventory availability
    const inventoryCheck = await this.verifyInventoryForCart(cartId);

    if (!inventoryCheck.available) {
      return {
        success: false,
        message: 'Some items are no longer available',
        unavailableItems: inventoryCheck.unavailableItems,
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
   * Verifies inventory availability for all items in a cart
   */
  async verifyInventoryForCart(cartId) {
    const unavailableItems = [];

    // Get all items and their configurations
    const items = await this.database.query(
      `SELECT oi.id, oi.product_id, oi.quantity
       FROM OrderItems oi
       WHERE oi.order_id = ?`,
      [cartId]
    );

    for (const item of items) {
      const configurations = await this.database.query(
        `SELECT oic.part_option_id
         FROM OrderItemConfiguration oic
         WHERE oic.order_item_id = ?`,
        [item.id]
      );

      for (const config of configurations) {
        const inventory = await this.database.query(
          `SELECT in_stock, quantity
           FROM Inventory
           WHERE part_option_id = ?`,
          [config.part_option_id]
        );

        if (
          !inventory ||
          !inventory.in_stock ||
          inventory.quantity < item.quantity
        ) {
          unavailableItems.push({
            orderItemId: item.id,
            partOptionId: config.part_option_id,
            requestedQuantity: item.quantity,
            availableQuantity: inventory ? inventory.quantity : 0,
          });
        }
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
    };
  }

  /**
   * Updates inventory after an order is placed
   */
  async updateInventoryFromOrder(orderId) {
    // Get all items and their configurations
    const items = await this.database.query(
      `SELECT oi.id, oi.quantity
       FROM OrderItems oi
       WHERE oi.order_id = ?`,
      [orderId]
    );

    for (const item of items) {
      const configurations = await this.database.query(
        `SELECT oic.part_option_id
         FROM OrderItemConfiguration oic
         WHERE oic.order_item_id = ?`,
        [item.id]
      );

      for (const config of configurations) {
        // Reduce inventory
        await this.database.query(
          `UPDATE Inventory
           SET quantity = quantity - ?
           WHERE part_option_id = ?`,
          [item.quantity, config.part_option_id]
        );

        // If quantity becomes 0, update in_stock status
        await this.database.query(
          `UPDATE Inventory
           SET in_stock = (quantity > 0)
           WHERE part_option_id = ? AND quantity <= 0`,
          [config.part_option_id]
        );
      }
    }
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
