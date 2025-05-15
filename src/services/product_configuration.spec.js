const ProductConfigurationService = require('./product_configuration');
const database = require('../../tests/mock_database');

describe('ProductConfigurationService', () => {
  const options = [
    { id: 10, name: 'Option A' },
    { id: 11, name: 'Option B' },
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

  let service;

  beforeEach(() => {
    database.reset();
    service = new ProductConfigurationService(database);
  });

  describe('getAvailableOptions', () => {
    it('returns options with inventory status', async () => {
      database.query
        .mockResolvedValueOnce(options) // For PartOptions
        .mockResolvedValueOnce(inventory); // For Inventory

      const result = await service.getAvailableOptions(1, 2, []);

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
        },
        {
          ...options[1],
          inventory: inventory[1],
        },
      ]);
    });

    it('returns empty array if no options found', async () => {
      database.query.mockResolvedValueOnce([]); // No options

      const result = await service.getAvailableOptions(1, 2, []);
      expect(result).toEqual([]);
      expect(database.query).toHaveBeenCalledTimes(1);
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

      const result = await service.addInventoryStatus(localOptions);

      expect(result).toEqual([
        { ...localOptions[0], inventory: localInventory[0] },
        { ...localOptions[1], inventory: localInventory[1] },
      ]);
    });

    it('returns options with default inventory if missing', async () => {
      const localOptions = [{ id: 1, name: 'A' }];
      database.query.mockResolvedValueOnce([]); // No inventory records

      const result = await service.addInventoryStatus(localOptions);

      expect(result).toEqual([
        { ...localOptions[0], inventory: { in_stock: false, quantity: 0 } },
      ]);
    });

    it('returns early if options array is empty', async () => {
      const result = await service.addInventoryStatus([]);
      expect(result).toEqual([]);
      expect(database.query).not.toHaveBeenCalled();
    });
  });
});
