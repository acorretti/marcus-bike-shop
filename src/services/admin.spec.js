const AdminService = require('./admin');
const database = require('../../tests/mock_database');

describe('AdminService', () => {
  const productData = {
    categoryId: 1,
    name: 'Road Bike',
    description: 'A fast bike',
    basePrice: 999,
    active: true,
    partTypes: [10, 20],
  };
  const partTypeData = {
    name: 'Frame',
    description: 'Bike frame',
    required: true,
  };
  const partOptionData = {
    partTypeId: 10,
    name: 'Aluminum Frame',
    description: 'Lightweight',
    basePrice: 200,
    active: true,
    initialStock: 5,
  };
  const inventoryData = {
    quantity: 10,
    inStock: true,
    expectedRestockDate: '2025-06-01',
  };
  const incompatibilityRuleData = {
    name: 'Frame/Wheel clash',
    description: 'Frame X cannot use Wheel Y',
    active: true,
    conditions: [{ partOptionId: 1, incompatibleWithPartOptionId: 2 }],
  };
  const pricingRuleData = {
    name: 'Combo Discount',
    description: 'Discount for combo',
    priceAdjustment: 50,
    isPercentage: false,
    active: true,
    conditions: [1, 2],
  };

  let adminService;

  beforeEach(() => {
    database.reset();
    adminService = new AdminService(database);
  });

  describe('createProduct', () => {
    it('creates a new product and associates part types', async () => {
      database.query
        .mockResolvedValueOnce([{ id: 42 }]) // Product insert
        .mockResolvedValueOnce([{}]) // ProductPartTypes 1
        .mockResolvedValueOnce([{}]); // ProductPartTypes 2

      const result = await adminService.createProduct(productData);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Products'),
        expect.arrayContaining([
          productData.categoryId,
          productData.name,
          productData.description,
          productData.basePrice,
          productData.active,
        ])
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ProductPartTypes'),
        [42, 10, 1]
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ProductPartTypes'),
        [42, 20, 2]
      );
      expect(result).toMatchObject({
        id: 42,
        ...productData,
      });
    });

    it('creates a product without part types', async () => {
      const data = { ...productData, partTypes: undefined };
      database.query.mockResolvedValueOnce([{ id: 99 }]);
      const result = await adminService.createProduct(data);
      expect(result.id).toBe(99);
    });
  });

  describe('createPartType', () => {
    it('creates a new part type', async () => {
      database.query.mockResolvedValueOnce([{ id: 7 }]);
      const result = await adminService.createPartType(partTypeData);
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PartTypes'),
        expect.arrayContaining([
          partTypeData.name,
          partTypeData.description,
          partTypeData.required,
        ])
      );
      expect(result).toMatchObject({
        id: 7,
        ...partTypeData,
      });
    });
  });

  describe('createPartOption', () => {
    it('creates a new part option and sets up inventory', async () => {
      database.query
        .mockResolvedValueOnce([{ id: 5 }]) // PartOption insert
        .mockResolvedValueOnce([{}]); // Inventory insert

      const result = await adminService.createPartOption(partOptionData);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PartOptions'),
        expect.arrayContaining([
          partOptionData.partTypeId,
          partOptionData.name,
          partOptionData.description,
          partOptionData.basePrice,
          partOptionData.active,
        ])
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Inventory'),
        [5, partOptionData.initialStock, true]
      );
      expect(result).toMatchObject({
        id: 5,
        ...partOptionData,
      });
    });

    it('creates a part option without initialStock', async () => {
      const data = { ...partOptionData };
      delete data.initialStock;
      database.query.mockResolvedValueOnce([{ id: 6 }]);
      const result = await adminService.createPartOption(data);
      expect(result.id).toBe(6);
    });
  });

  describe('updateInventory', () => {
    it('updates existing inventory', async () => {
      database.query
        .mockResolvedValueOnce([{ id: 1 }]) // Inventory exists
        .mockResolvedValueOnce([{}]); // Update

      const result = await adminService.updateInventory(1, inventoryData);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Inventory'),
        expect.arrayContaining([
          inventoryData.quantity,
          inventoryData.inStock,
          inventoryData.expectedRestockDate,
          1,
        ])
      );
      expect(result).toMatchObject({
        partOptionId: 1,
        ...inventoryData,
      });
    });

    it('creates new inventory if not exists', async () => {
      database.query
        .mockResolvedValueOnce([]) // Inventory not found
        .mockResolvedValueOnce([{}]); // Insert

      const result = await adminService.updateInventory(2, inventoryData);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Inventory'),
        expect.arrayContaining([
          2,
          inventoryData.quantity,
          inventoryData.inStock,
          inventoryData.expectedRestockDate,
        ])
      );
      expect(result.partOptionId).toBe(2);
    });
  });

  describe('createIncompatibilityRule', () => {
    it('creates a new incompatibility rule and adds conditions', async () => {
      database.query
        .mockResolvedValueOnce([{ id: 11 }]) // Rule insert
        .mockResolvedValueOnce([{}]); // Condition insert

      const result = await adminService.createIncompatibilityRule(
        incompatibilityRuleData
      );

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO IncompatibilityRules'),
        expect.arrayContaining([
          incompatibilityRuleData.name,
          incompatibilityRuleData.description,
          incompatibilityRuleData.active,
        ])
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO RuleConditions'),
        [
          11,
          incompatibilityRuleData.conditions[0].partOptionId,
          incompatibilityRuleData.conditions[0].incompatibleWithPartOptionId,
        ]
      );
      expect(result).toMatchObject({
        id: 11,
        ...incompatibilityRuleData,
      });
    });

    it('creates a rule without conditions', async () => {
      const data = { ...incompatibilityRuleData, conditions: undefined };
      database.query.mockResolvedValueOnce([{ id: 12 }]);
      const result = await adminService.createIncompatibilityRule(data);
      expect(result.id).toBe(12);
    });
  });

  describe('createPricingRule', () => {
    it('creates a new pricing rule and adds conditions', async () => {
      database.query
        .mockResolvedValueOnce([{ id: 21 }]) // Rule insert
        .mockResolvedValueOnce([{}]) // Condition 1
        .mockResolvedValueOnce([{}]); // Condition 2

      const result = await adminService.createPricingRule(pricingRuleData);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PricingRules'),
        expect.arrayContaining([
          pricingRuleData.name,
          pricingRuleData.description,
          pricingRuleData.priceAdjustment,
          pricingRuleData.isPercentage,
          pricingRuleData.active,
        ])
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PricingRuleConditions'),
        [21, 1]
      );
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PricingRuleConditions'),
        [21, 2]
      );
      expect(result).toMatchObject({
        id: 21,
        ...pricingRuleData,
      });
    });

    it('creates a pricing rule without conditions', async () => {
      const data = { ...pricingRuleData, conditions: undefined };
      database.query.mockResolvedValueOnce([{ id: 22 }]);
      const result = await adminService.createPricingRule(data);
      expect(result.id).toBe(22);
    });
  });

  describe('getOrders', () => {
    it('returns orders with filters', async () => {
      const orders = [
        {
          id: 1,
          customer_id: 2,
          date_created: '2025-05-01',
          status: 'paid',
          total_price: 100,
        },
      ];
      database.query.mockResolvedValueOnce(orders);

      const result = await adminService.getOrders({ status: 'paid', limit: 1 });

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, customer_id'),
        expect.arrayContaining(['paid', 1])
      );
      expect(result).toEqual(orders);
    });

    it('returns orders without filters', async () => {
      database.query.mockResolvedValueOnce([]);
      const result = await adminService.getOrders();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOrderDetails', () => {
    it('returns order details with items and configuration', async () => {
      const order = [
        {
          id: 1,
          customer_id: 2,
          date_created: '2025-05-01',
          status: 'paid',
          total_price: 100,
        },
      ];
      const items = [
        {
          id: 10,
          product_id: 5,
          product_name: 'Bike',
          quantity: 1,
          price: 100,
        },
      ];
      const configuration = [
        { part_option_id: 7, option_name: 'Red', part_type: 'Color' },
      ];
      database.query
        .mockResolvedValueOnce(order) // Order
        .mockResolvedValueOnce(items) // Items
        .mockResolvedValueOnce(configuration); // Config for item

      const result = await adminService.getOrderDetails(1);

      expect(result).toMatchObject({
        id: 1,
        items: [
          {
            id: 10,
            configuration,
          },
        ],
      });
    });

    it('returns null if order not found', async () => {
      database.query.mockResolvedValueOnce([]);
      const result = await adminService.getOrderDetails(999);
      expect(result).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    it('updates the order status', async () => {
      database.query.mockResolvedValueOnce([{}]);
      const result = await adminService.updateOrderStatus(1, 'shipped');
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Orders'),
        ['shipped', 1]
      );
      expect(result).toEqual({
        success: true,
        message: 'Order status updated to shipped',
      });
    });
  });
});
