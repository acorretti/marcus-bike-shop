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

    return optionsWithInventory;
  }

  /**
   * Filters out options that are incompatible with current selections
   */
  async filterIncompatibleOptions(options, currentSelections) {
    if (currentSelections.length === 0) {
      return options;
    }

    const incompatibleOptionIds = new Set();

    // Get all incompatible combinations involving current selections
    for (const selection of currentSelections) {
      const incompatibilities = await this.database.query(
        `SELECT incompatible_with_part_option_id 
         FROM RuleConditions rc
         JOIN IncompatibilityRules ir ON rc.rule_id = ir.id
         WHERE rc.part_option_id = ? AND ir.active = TRUE`,
        [selection.partOptionId]
      );

      incompatibilities.forEach((item) => {
        incompatibleOptionIds.add(item.incompatible_with_part_option_id);
      });
    }

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
}

module.exports = ProductConfigurationService;
