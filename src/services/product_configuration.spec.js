const ProductConfigurationService = require('./product_configuration');
const database = require('../../tests/mock_database');

describe('ProductConfigurationService', () => {
  const options = [
    { id: 10, name: 'Option A', base_price: 100 },
    { id: 11, name: 'Option B', base_price: 200 },
  ];
  const inventory = [
    {
      part_option_id: 10,
      quantity: 5,
      in_stock: true,
      expected_restock_date: null,
    },
    {
      part_option_id: 11,
      quantity: 0,
      in_stock: false,
      expected_restock_date: '2025-06-01',
    },
  ];

  let configService;

  beforeEach(() => {
    database.reset();
    configService = new ProductConfigurationService(database);
  });

  describe('getAvailableOptions', () => {
    it('returns options with inventory status', async () => {
      database.query
        .mockResolvedValueOnce(options) // For PartOptions
        .mockResolvedValueOnce(inventory); // For Inventory

      const result = await configService.getAvailableOptions(1, 2, []);

      expect(database.query).toHaveBeenCalledWith(
        'SELECT * FROM PartOptions WHERE part_type_id = ? AND active = TRUE',
        [2]
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT part_option_id, quantity, in_stock'),
        [10, 11]
      );
      expect(result).toEqual([
        {
          ...options[0],
          inventory: inventory[0],
          basePrice: 100,
          finalPrice: 100,
          priceAdjustments: [],
        },
        {
          ...options[1],
          inventory: inventory[1],
          basePrice: 200,
          finalPrice: 200,
          priceAdjustments: [],
        },
      ]);
    });

    it('returns empty array if no options found', async () => {
      database.query.mockResolvedValueOnce([]); // No options

      const result = await configService.getAvailableOptions(1, 2, []);
      expect(result).toEqual([]);
      expect(database.query).toHaveBeenCalledTimes(1);
    });

    it('filters out incompatible options based on current selections', async () => {
      // Mock: options, incompatibilities, inventory
      const currentSelections = [{ partOptionId: 10 }];
      const incompatibilities = [
        { part_option_id: 11, incompatible_with_part_option_id: 10 },
      ];
      database.query
        .mockResolvedValueOnce(options) // For PartOptions
        .mockResolvedValueOnce(incompatibilities) // For incompatibility rules
        .mockResolvedValueOnce([inventory[0]]) // Only compatible inventory
        .mockResolvedValueOnce([]) // pricingRules
        .mockResolvedValueOnce([]); // pricingRules

      const result = await configService.getAvailableOptions(
        1,
        2,
        currentSelections
      );

      expect(result).toEqual([
        {
          ...options[0],
          inventory: inventory[0],
          basePrice: 100,
          finalPrice: 100,
          priceAdjustments: [],
        },
      ]);
    });
  });

  describe('filterIncompatibleOptions', () => {
    it('returns all options if currentSelections is empty', async () => {
      const result = await configService.filterIncompatibleOptions(options, []);
      expect(result).toEqual(options);
    });

    it('filters out options that are incompatible', async () => {
      const currentSelections = [{ partOptionId: 10 }];
      const incompatibilities = [
        { part_option_id: 11, incompatible_with_part_option_id: 10 },
      ];
      database.query.mockResolvedValueOnce(incompatibilities);

      const result = await configService.filterIncompatibleOptions(
        options,
        currentSelections
      );
      expect(result).toEqual([options[0]]);
    });

    it('returns all options if no incompatibilities found', async () => {
      const currentSelections = [{ partOptionId: 10 }];
      database.query.mockResolvedValueOnce([]); // No incompatibilities

      const result = await configService.filterIncompatibleOptions(
        options,
        currentSelections
      );
      expect(result).toEqual(options);
    });

    it('filters out multiple incompatible options from multiple selections', async () => {
      const currentSelections = [
        { partOptionId: options[0].id },
        { partOptionId: 99 },
      ];
      // First selection incompatible with options[0], second with none
      database.query.mockResolvedValueOnce([
        {
          part_option_id: currentSelections[0].partOptionId,
          incompatible_with_part_option_id: options[0].id,
        },
      ]);

      const result = await configService.filterIncompatibleOptions(
        options,
        currentSelections
      );
      expect(result).toEqual([options[1]]); // Only Option B remains (Option A is filtered out)
    });
  });

  describe('addInventoryStatus', () => {
    it('adds inventory info to each option', async () => {
      const localOptions = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      const localInventory = [
        { part_option_id: 1, quantity: 3, in_stock: true },
        { part_option_id: 2, quantity: 0, in_stock: false },
      ];
      database.query.mockResolvedValueOnce(localInventory);

      const result = await configService.addInventoryStatus(localOptions);

      expect(result).toEqual([
        { ...localOptions[0], inventory: localInventory[0] },
        { ...localOptions[1], inventory: localInventory[1] },
      ]);
    });

    it('returns options with default inventory if missing', async () => {
      const localOptions = [{ id: 1, name: 'A' }];
      database.query.mockResolvedValueOnce([]); // No inventory records

      const result = await configService.addInventoryStatus(localOptions);

      expect(result).toEqual([
        { ...localOptions[0], inventory: { in_stock: false, quantity: 0 } },
      ]);
    });

    it('returns early if options array is empty', async () => {
      const result = await configService.addInventoryStatus([]);
      expect(result).toEqual([]);
      expect(database.query).not.toHaveBeenCalled();
    });
  });

  describe('validateConfiguration', () => {
    let configService;
    beforeEach(() => {
      database.reset();
      configService = new ProductConfigurationService(database);
    });

    it('returns invalid if required part types are missing', async () => {
      // Mock required part types
      database.query
        .mockResolvedValueOnce([
          { id: 1, name: 'Frame' },
          { id: 2, name: 'Wheel' },
        ]) // requiredPartTypes
        .mockResolvedValueOnce({ part_type_id: 1 }); // Only Frame selected

      const selectedOptions = [{ partOptionId: 10 }];
      const result = await configService.validateConfiguration(
        5,
        selectedOptions
      );

      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/Missing required selections/);
      expect(result.message).toContain('Wheel');
    });

    it('returns invalid if selected options are incompatible', async () => {
      // Mock required part types (all present)
      database.query
        .mockResolvedValueOnce([{ id: 1, name: 'Frame' }]) // requiredPartTypes
        .mockResolvedValueOnce([{ part_type_id: 1 }]) // for option 1
        .mockResolvedValueOnce([{ part_type_id: 1 }]) // for option 2
        .mockResolvedValueOnce([{}]); // conflict found

      const selectedOptions = [{ partOptionId: 10 }, { partOptionId: 11 }];
      const result = await configService.validateConfiguration(
        5,
        selectedOptions
      );

      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/incompatible combinations/);
      expect(result.incompatibilities.length).toBeGreaterThan(0);
    });

    it('returns invalid if any selected option is out of stock', async () => {
      // Mock required part types (all present)
      database.query
        .mockResolvedValueOnce([{ id: 1, name: 'Frame' }]) // requiredPartTypes
        .mockResolvedValueOnce([{ part_type_id: 1 }]) // for option
        .mockResolvedValueOnce([]) // no incompatibilities
        .mockResolvedValueOnce([{ in_stock: false, quantity: 0 }]); // inventory

      const selectedOptions = [{ partOptionId: 10 }];
      const result = await configService.validateConfiguration(
        5,
        selectedOptions
      );

      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/out of stock/);
      expect(result.unavailableOptions).toContain(10);
    });

    it('returns valid if all checks pass', async () => {
      database.query
        .mockResolvedValueOnce([{ id: 1, name: 'Frame' }]) // requiredPartTypes
        .mockResolvedValueOnce([{ part_type_id: 1 }]) // for option
        .mockResolvedValueOnce([{ in_stock: true, quantity: 5 }]); // inventory

      const selectedOptions = [{ partOptionId: 10 }];
      const result = await configService.validateConfiguration(
        5,
        selectedOptions
      );

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Configuration is valid');
    });
  });

  describe('calculateOptionPrices', () => {
    it('returns options with basePrice, finalPrice, and priceAdjustments', async () => {
      const testOptions = [
        { id: 10, name: 'Option A', base_price: 100 },
        { id: 11, name: 'Option B', base_price: 200 },
      ];
      // Mock getPriceAdjustments to return a flat adjustment for Option A, none for Option B
      jest
        .spyOn(configService, 'getPriceAdjustments')
        .mockImplementationOnce(async () => [
          { price_adjustment: 10, is_percentage: false },
        ])
        .mockImplementationOnce(async () => []);

      const result = await configService.calculateOptionPrices(
        testOptions,
        1,
        []
      );

      expect(result[0]).toMatchObject({
        id: 10,
        basePrice: 100,
        finalPrice: 110,
        priceAdjustments: [{ price_adjustment: 10, is_percentage: false }],
      });
      expect(result[1]).toMatchObject({
        id: 11,
        basePrice: 200,
        finalPrice: 200,
        priceAdjustments: [],
      });
    });

    it('applies percentage adjustments correctly', async () => {
      const testOptions = [{ id: 12, name: 'Option C', base_price: 100 }];
      jest
        .spyOn(configService, 'getPriceAdjustments')
        .mockResolvedValueOnce([{ price_adjustment: 10, is_percentage: true }]);
      const result = await configService.calculateOptionPrices(
        testOptions,
        1,
        []
      );
      expect(result[0].finalPrice).toBeCloseTo(110);
    });
  });

  describe('getPriceAdjustments', () => {
    it('returns empty array if selections length <= 1', async () => {
      const result = await configService.getPriceAdjustments(1, [
        { partOptionId: 10 },
      ]);
      expect(result).toEqual([]);
    });

    it('returns pricing rules for multiple selections', async () => {
      const pricingRules = [
        { id: 1, name: 'Combo', price_adjustment: 20, is_percentage: false },
      ];
      database.query.mockResolvedValueOnce(pricingRules);

      const result = await configService.getPriceAdjustments(1, [
        { partOptionId: 10 },
        { partOptionId: 11 },
      ]);
      expect(result).toEqual(pricingRules);
    });
  });

  describe('calculateTotalPrice', () => {
    it('returns correct total with base price, option prices, and adjustments', async () => {
      database.query
        .mockResolvedValueOnce([{ base_price: 100 }]) // Product base price
        .mockResolvedValueOnce([
          { id: 10, base_price: 20 },
          { id: 11, base_price: 30 },
        ]) // Option prices
        .mockResolvedValueOnce([
          { price_adjustment: 10, is_percentage: false },
          { price_adjustment: 10, is_percentage: true },
        ]); // Adjustments

      const selectedOptions = [{ partOptionId: 10 }, { partOptionId: 11 }];
      const result = await configService.calculateTotalPrice(
        1,
        selectedOptions
      );

      // Calculation: (100 + 20 + 30) + 10 = 160, then *1.10 = 176
      expect(result.basePrice).toBe(100);
      expect(result.optionPriceSum).toBe(50);
      expect(result.adjustments.length).toBe(2);
      expect(result.totalPrice).toBeCloseTo(176);
    });

    it('returns total with no options and no adjustments', async () => {
      database.query
        .mockResolvedValueOnce([{ base_price: 100 }]) // Product base price
        .mockResolvedValueOnce([]) // Option prices
        .mockResolvedValueOnce([]); // Adjustments

      const result = await configService.calculateTotalPrice(1, []);
      expect(result.basePrice).toBe(100);
      expect(result.optionPriceSum).toBe(0);
      expect(result.adjustments).toEqual([]);
      expect(result.totalPrice).toBe(100);
    });
  });
});
