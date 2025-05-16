/**
 * ProductConfigurationService
 *
 * Handles logic for product configuration, checking compatibility,
 * and calculating prices based on selected options
 */

class ProductConfigurationService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Retrieves available options for a given part type, taking into account
   * current selections and inventory status
   *
   * @param {number} productId - The product being configured
   * @param {number} partTypeId - The part type to get options for
   * @param {Array} currentSelections - Current part options selected by user
   * @returns {Array} Available options with pricing and stock information
   */
  async getAvailableOptions(productId, partTypeId, currentSelections = []) {
    // 1. Get all options for this part type
    const options = await this.database.query(
      'SELECT * FROM PartOptions WHERE part_type_id = ? AND active = TRUE',
      [partTypeId]
    );

    // 2. Filter out incompatible options based on current selections
    const compatibleOptions = await this.filterIncompatibleOptions(
      options,
      currentSelections
    );

    // 3. Get inventory status for remaining options
    const optionsWithInventory =
      await this.addInventoryStatus(compatibleOptions);

    // 4. Calculate adjusted prices based on current selections
    const optionsWithPricing = await this.calculateOptionPrices(
      optionsWithInventory,
      productId,
      currentSelections
    );

    return optionsWithPricing;
  }

  /**
   * Filters out options that are incompatible with current selections
   */
  async filterIncompatibleOptions(options, currentSelections) {
    if (currentSelections.length === 0 || options.length === 0) {
      return options;
    }

    // Gather all option IDs and current selection IDs
    const conflicts = await this.database.query(
      `SELECT rc.part_option_id, rc.incompatible_with_part_option_id
       FROM RuleConditions rc
       JOIN IncompatibilityRules ir ON rc.rule_id = ir.id
       WHERE rc.part_option_id IN (?)
         AND rc.incompatible_with_part_option_id IN (?)
         AND ir.active = TRUE`,
      [options.map((o) => o.id), currentSelections.map((s) => s.partOptionId)]
    );

    // Build a Set of option IDs that are incompatible with current selections
    const incompatibleOptionIds = new Set(
      conflicts.map((c) => c.part_option_id)
    );

    // Filter out incompatible options
    return options.filter((option) => !incompatibleOptionIds.has(option.id));
  }

  /**
   * Adds inventory status to options
   */
  async addInventoryStatus(options) {
    if (options.length === 0) {
      return options; // Return early if no options to process
    }

    const optionIds = options.map((option) => option.id);

    // Use separate placeholders for each ID to avoid the IN clause array issue
    const placeholders = optionIds.map(() => '?').join(',');
    const inventoryStatus = await this.database.query(
      `SELECT part_option_id, quantity, in_stock, expected_restock_date
       FROM Inventory
       WHERE part_option_id IN (${placeholders})`,
      optionIds
    );

    // Map inventory status to options
    const inventoryMap = {};
    inventoryStatus.forEach((item) => {
      inventoryMap[item.part_option_id] = item;
    });

    return options.map((option) => ({
      ...option,
      inventory: inventoryMap[option.id] || { in_stock: false, quantity: 0 },
    }));
  }

  /**
   * Calculates adjusted prices for options based on current selections
   */
  async calculateOptionPrices(options, productId, currentSelections) {
    return Promise.all(
      options.map(async (option) => {
        const basePrice = option.base_price;

        // Get pricing rules that apply when this option is selected with current selections
        const adjustments = await this.getPriceAdjustments(productId, [
          ...currentSelections,
          { partOptionId: option.id },
        ]);

        // Apply all adjustments to get final price
        const finalPrice = adjustments.reduce((price, adjustment) => {
          if (adjustment.is_percentage) {
            return price * (1 + adjustment.price_adjustment / 100);
          } else {
            return price + adjustment.price_adjustment;
          }
        }, basePrice);

        return {
          ...option,
          basePrice,
          finalPrice,
          priceAdjustments: adjustments,
        };
      })
    );
  }

  /**
   * Gets price adjustments based on selected options
   */
  async getPriceAdjustments(productId, selections) {
    if (selections.length <= 1) {
      return [];
    }

    const selectionIds = selections.map((s) => s.partOptionId);

    // Use separate placeholders for each ID to avoid the IN clause array issue
    const placeholders = selectionIds.map(() => '?').join(',');

    // Find pricing rules that match the current selection combination
    const pricingRules = await this.database.query(
      `SELECT pr.id, pr.name, pr.price_adjustment, pr.is_percentage 
       FROM PricingRules pr
       JOIN PricingRuleConditions prc ON pr.id = prc.pricing_rule_id
       WHERE pr.active = TRUE
       AND prc.part_option_id IN (${placeholders})
       GROUP BY pr.id
       HAVING COUNT(DISTINCT prc.part_option_id) = COUNT(*)`,
      selectionIds
    );

    return pricingRules;
  }

  /**
   * Calculates total price for a configured product
   *
   * @param {number} productId - The product being configured
   * @param {Array} selectedOptions - All selected part options
   * @returns {Object} Price details including base price, adjustments, and total
   */
  async calculateTotalPrice(productId, selectedOptions) {
    // Get product base price
    const [product] = await this.database.query(
      'SELECT base_price FROM Products WHERE id = ?',
      [productId]
    );

    const basePrice = product.base_price;

    // Get all selected options with their base prices
    const optionIds = selectedOptions.map((option) => option.partOptionId);

    // Use separate placeholders for each ID
    const placeholders = optionIds.map(() => '?').join(',');
    const optionPrices = await this.database.query(
      `SELECT id, base_price FROM PartOptions WHERE id IN (${placeholders})`,
      optionIds
    );

    // Calculate sum of option base prices
    const optionPriceSum = optionPrices.reduce((sum, option) => {
      return sum + option.base_price;
    }, 0);

    // Get price adjustments for the combination
    const adjustments = await this.getPriceAdjustments(
      productId,
      selectedOptions
    );

    // Calculate adjusted total
    let totalPrice = basePrice + optionPriceSum;

    // Apply all price adjustments
    adjustments.forEach((adjustment) => {
      if (adjustment.is_percentage) {
        totalPrice = totalPrice * (1 + adjustment.price_adjustment / 100);
      } else {
        totalPrice = totalPrice + adjustment.price_adjustment;
      }
    });

    return {
      basePrice,
      optionPriceSum,
      adjustments,
      totalPrice,
    };
  }

  /**
   * Validates a complete product configuration
   *
   * @param {number} productId - The product being configured
   * @param {Array} selectedOptions - All selected part options
   * @returns {Object} Validation result
   */
  async validateConfiguration(productId, selectedOptions) {
    // Get all required part types for this product
    const requiredPartTypes = await this.database.query(
      `SELECT pt.id, pt.name 
     FROM PartTypes pt
     JOIN ProductPartTypes ppt ON pt.id = ppt.part_type_id
     WHERE ppt.product_id = ? AND pt.required = TRUE`,
      [productId]
    );

    // Check if all required part types are selected
    const selectedPartTypes = new Set();
    const selectedPartOptions = new Map();

    for (const option of selectedOptions) {
      const partOptionResults = await this.database.query(
        'SELECT part_type_id FROM PartOptions WHERE id = ?',
        [option.partOptionId]
      );

      if (partOptionResults.length) {
        const partOption = partOptionResults.shift();
        selectedPartTypes.add(partOption.part_type_id);
        selectedPartOptions.set(partOption.part_type_id, option.partOptionId);
      }
    }

    const missingPartTypes = requiredPartTypes.filter(
      (partType) => !selectedPartTypes.has(partType.id)
    );

    if (missingPartTypes.length > 0) {
      return {
        valid: false,
        message: `Missing required selections: ${missingPartTypes.map((pt) => pt.name).join(', ')}`,
      };
    }

    // Check if selected options are compatible with each other
    const incompatibilities = [];

    for (let i = 0; i < selectedOptions.length; i++) {
      for (let j = i + 1; j < selectedOptions.length; j++) {
        const optionA = selectedOptions[i].partOptionId;
        const optionB = selectedOptions[j].partOptionId;

        const conflict = await this.database.query(
          `SELECT 1
         FROM RuleConditions rc
         JOIN IncompatibilityRules ir ON rc.rule_id = ir.id
         WHERE (rc.part_option_id = ? AND rc.incompatible_with_part_option_id = ?)
         OR (rc.part_option_id = ? AND rc.incompatible_with_part_option_id = ?)
         AND ir.active = TRUE
         LIMIT 1`,
          [optionA, optionB, optionB, optionA]
        );

        if (conflict.length) {
          incompatibilities.push({ optionA, optionB });
        }
      }
    }

    if (incompatibilities.length > 0) {
      return {
        valid: false,
        message: 'Selected options contain incompatible combinations',
        incompatibilities,
      };
    }

    // Check inventory availability
    const unavailableOptions = [];

    for (const option of selectedOptions) {
      const inventory = await this.database.query(
        'SELECT in_stock, quantity FROM Inventory WHERE part_option_id = ?',
        [option.partOptionId]
      );

      if (
        !inventory.length ||
        !inventory[0].in_stock ||
        inventory[0].quantity <= 0
      ) {
        unavailableOptions.push(option.partOptionId);
      }
    }

    if (unavailableOptions.length > 0) {
      return {
        valid: false,
        message: 'Some selected options are out of stock',
        unavailableOptions,
      };
    }

    return {
      valid: true,
      message: 'Configuration is valid',
    };
  }
}

module.exports = ProductConfigurationService;
