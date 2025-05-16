/**
 * AdminService
 *
 * Handles administrative operations for the shop owner
 */

class AdminService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Creates a new product
   *
   * @param {Object} productData - Product details
   * @returns {Object} The created product
   */
  async createProduct(productData) {
    // Insert new product
    const [newProduct] = await this.database.query(
      `INSERT INTO Products
         (category_id, name, description, base_price, active)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [
        productData.categoryId,
        productData.name,
        productData.description,
        productData.basePrice,
        productData.active !== undefined ? productData.active : true,
      ]
    );

    // Associate part types with the new product
    if (productData.partTypes && productData.partTypes.length > 0) {
      for (let i = 0; i < productData.partTypes.length; i++) {
        await this.database.query(
          `INSERT INTO ProductPartTypes (product_id, part_type_id, sort_order) VALUES (?, ?, ?)`,
          [newProduct.id, productData.partTypes[i], i + 1]
        );
      }
    }

    return {
      id: newProduct.id,
      ...productData,
    };
  }

  /**
   * Creates a new part type
   *
   * @param {Object} partTypeData - Part type details
   * @returns {Object} The created part type
   */
  async createPartType(partTypeData) {
    const [newPartType] = await this.database.query(
      `INSERT INTO PartTypes
         (name, description, required)
       VALUES (?, ?, ?)
       RETURNING id`,
      [
        partTypeData.name,
        partTypeData.description,
        partTypeData.required !== undefined ? partTypeData.required : true,
      ]
    );

    return {
      id: newPartType.id,
      ...partTypeData,
    };
  }

  /**
   * Creates a new part option
   *
   * @param {Object} partOptionData - Part option details
   * @returns {Object} The created part option
   */
  async createPartOption(partOptionData) {
    // 1. Create the part option
    const [newPartOption] = await this.database.query(
      `INSERT INTO PartOptions
         (part_type_id, name, description, base_price, active)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [
        partOptionData.partTypeId,
        partOptionData.name,
        partOptionData.description,
        partOptionData.basePrice,
        partOptionData.active !== undefined ? partOptionData.active : true,
      ]
    );

    // 2. Set up initial inventory
    if (partOptionData.initialStock !== undefined) {
      await this.database.query(
        `INSERT INTO Inventory (part_option_id, quantity, in_stock)
         VALUES (?, ?, ?)`,
        [newPartOption.id, partOptionData.initialStock, true]
      );
    }

    return {
      id: newPartOption.id,
      ...partOptionData,
    };
  }

  /**
   * Updates inventory for a part option
   *
   * @param {number} partOptionId - The part option ID
   * @param {Object} inventoryData - Inventory details
   * @returns {Object} The updated inventory
   */
  async updateInventory(partOptionId, inventoryData) {
    // Check if inventory exists
    const existingInventory = await this.database.query(
      `SELECT id FROM Inventory WHERE part_option_id = ?`,
      [partOptionId]
    );

    if (existingInventory && existingInventory.length > 0) {
      await this.database.query(
        `UPDATE Inventory
         SET quantity = ?, in_stock = ?, expected_restock_date = ?
         WHERE part_option_id = ?`,
        [
          inventoryData.quantity,
          inventoryData.inStock,
          inventoryData.expectedRestockDate,
          partOptionId,
        ]
      );
    } else {
      await this.database.query(
        `INSERT INTO Inventory (part_option_id, quantity, in_stock, expected_restock_date)
         VALUES (?, ?, ?, ?)`,
        [
          partOptionId,
          inventoryData.quantity,
          inventoryData.inStock,
          inventoryData.expectedRestockDate,
        ]
      );
    }

    return {
      partOptionId,
      ...inventoryData,
    };
  }

  /**
   * Creates a new incompatibility rule
   *
   * @param {Object} ruleData - Rule details
   * @returns {Object} The created rule
   */
  async createIncompatibilityRule(ruleData) {
    // 1. Create the rule
    const [newRule] = await this.database.query(
      `INSERT INTO IncompatibilityRules
         (name, description, active)
       VALUES (?, ?, ?)
       RETURNING id`,
      [
        ruleData.name,
        ruleData.description,
        ruleData.active !== undefined ? ruleData.active : true,
      ]
    );

    // 2. Add rule conditions
    if (ruleData.conditions && ruleData.conditions.length > 0) {
      for (const cond of ruleData.conditions) {
        await this.database.query(
          `INSERT INTO RuleConditions (rule_id, part_option_id, incompatible_with_part_option_id)
           VALUES (?, ?, ?)`,
          [newRule.id, cond.partOptionId, cond.incompatibleWithPartOptionId]
        );
      }
    }

    return {
      id: newRule.id,
      ...ruleData,
    };
  }

  /**
   * Creates a new pricing rule
   *
   * @param {Object} ruleData - Rule details
   * @returns {Object} The created rule
   */
  async createPricingRule(ruleData) {
    // 1. Create the rule
    const [newRule] = await this.database.query(
      `INSERT INTO PricingRules
         (name, description, price_adjustment, is_percentage, active)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [
        ruleData.name,
        ruleData.description,
        ruleData.priceAdjustment,
        ruleData.isPercentage !== undefined ? ruleData.isPercentage : false,
        ruleData.active !== undefined ? ruleData.active : true,
      ]
    );

    // 2. Add rule conditions
    if (ruleData.conditions && ruleData.conditions.length > 0) {
      for (const cond of ruleData.conditions) {
        await this.database.query(
          `INSERT INTO PricingRuleConditions (rule_id, part_option_id)
           VALUES (?, ?)`,
          [newRule.id, cond]
        );
      }
    }

    return {
      id: newRule.id,
      ...ruleData,
    };
  }

  /**
   * Get all orders with optional filtering
   *
   * @param {Object} filters - Filter options
   * @returns {Array} Orders matching the filters
   */
  async getOrders(filters = {}) {
    let query = `
      SELECT id, customer_id, date_created, status, total_price
      FROM Orders
      WHERE status != 'cart'
    `;

    const queryParams = [];

    if (filters.status) {
      query += ' AND status = ?';
      queryParams.push(filters.status);
    }

    if (filters.dateFrom) {
      query += ' AND date_created >= ?';
      queryParams.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ' AND date_created <= ?';
      queryParams.push(filters.dateTo);
    }

    query += ' ORDER BY date_created DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      queryParams.push(filters.limit);
    }

    const orders = await this.database.query(query, queryParams);
    return orders;
  }

  /**
   * Get detailed information about a specific order
   *
   * @param {number} orderId - The order ID
   * @returns {Object} Order details
   */
  async getOrderDetails(orderId) {
    const order = await this.database.query(
      `SELECT id, customer_id, date_created, status, total_price
       FROM Orders WHERE id = ?`,
      [orderId]
    );
    if (!order || order.length === 0) return null;

    const items = await this.database.query(
      `SELECT id, product_id, product_name, quantity, price
       FROM OrderItems WHERE order_id = ?`,
      [orderId]
    );

    // For each item, get configuration
    for (const item of items) {
      item.configuration = await this.database.query(
        `SELECT part_option_id, option_name, part_type
         FROM OrderItemConfiguration WHERE order_item_id = ?`,
        [item.id]
      );
    }

    return {
      ...order[0],
      items,
    };
  }

  /**
   * Update order status
   *
   * @param {number} orderId - The order ID
   * @param {string} newStatus - The new status
   * @returns {Object} Result of the operation
   */
  async updateOrderStatus(orderId, newStatus) {
    await this.database.query(`UPDATE Orders SET status = ? WHERE id = ?`, [
      newStatus,
      orderId,
    ]);
    return {
      success: true,
      message: `Order status updated to ${newStatus}`,
    };
  }
}

module.exports = AdminService;
