/**
 * Tests for the product configuration functionality
 *
 * These tests verify that:
 * 1. Compatible options are correctly filtered
 * 2. Prices are calculated correctly
 * 3. Configurations can be validated
 *
 * These tests run against a SQLite database using the example data provided.
 * It's required to have the database seeded running `npm run db:seed`.
 */
require('dotenv').config();
const ProductConfigurationService = require('../src/services/product_configuration');
const SQLiteDatabase = require('../src/db/database');
const { getDatabaseFilePath } = require('../src/db/setup');

describe('Integration tests', () => {
  let configService;

  beforeEach(() => {
    const db = new SQLiteDatabase(getDatabaseFilePath());
    configService = new ProductConfigurationService(db);
  });

  test('should return all frame options when no prior selections', async () => {
    const frameOptions = await configService.getAvailableOptions(1, 1, []);
    expect(frameOptions.length).toBe(3);
  });

  test('should return compatible wheel options after selecting full-suspension frame', async () => {
    const wheelOptions = await configService.getAvailableOptions(1, 3, [
      { partOptionId: 1 }, // Full-suspension frame
    ]);

    // With our test data, we should have both Road Wheels and Mountain Wheels,
    // but Fat Bike Wheels will be filtered out because it's out of stock

    const inStockOptions = wheelOptions.filter((opt) => opt.inventory.in_stock);
    expect(inStockOptions.length).toBe(2);
  });

  test('should filter incompatible wheel options after selecting diamond frame', async () => {
    const wheelOptionsForDiamond = await configService.getAvailableOptions(
      1,
      3,
      [
        { partOptionId: 2 }, // Diamond frame
      ]
    );

    // With Diamond frame, Mountain Wheels should be incompatible, so we should
    // only have Road Wheels as an available option (id 3)
    expect(wheelOptionsForDiamond.length).toBe(2);

    // Mountain Wheels should be filtered out due to the incompatibility rule
    const mountainWheelsOption = wheelOptionsForDiamond.find(
      (opt) => opt.id === 4
    );
    expect(mountainWheelsOption).toBeFalsy();
  });

  test('should filter incompatible wheel options after red rim color', async () => {
    const wheelOptionsForRimColor = await configService.getAvailableOptions(
      1,
      3,
      [
        { partOptionId: 9 }, // Red rim color
      ]
    );

    // With Diamond frame, Mountain Wheels should be incompatible, so we should
    // only have Road Wheels as an available option (id 3)
    expect(wheelOptionsForRimColor.length).toBe(2);

    // Mountain Wheels should be filtered out due to the incompatibility rule
    const fatWheels = wheelOptionsForRimColor.find((opt) => opt.id === 8);
    expect(fatWheels).toBeFalsy();
  });

  test('should calculate price correctly for a complete configuration', async () => {
    // Get the product base price from the new sample data
    const productQuery = await configService.database.query(
      'SELECT base_price FROM Products WHERE id = ?',
      [1]
    );
    // Adjust this expectation based on the new base price in example_data.js
    expect(productQuery[0].base_price).toBe(120.0);

    // Now test the price calculation with updated partOptionIds and expected values
    const priceDetails = await configService.calculateTotalPrice(1, [
      { partOptionId: 2 }, // Updated frame option
      { partOptionId: 5 }, // Updated wheel option
      { partOptionId: 9 }, // Updated rim option
    ]);

    expect(priceDetails.basePrice).toBe(120);
    expect(priceDetails.optionPriceSum).toBe(150); // 140 + 90 + 20
    expect(priceDetails.totalPrice).toBe(305);
  });

  test('should validate a complete valid configuration', async () => {
    const validationResult = await configService.validateConfiguration(1, [
      { partOptionId: 1 }, // Full-suspension frame
      { partOptionId: 4 }, // Non-reflective finish
      { partOptionId: 6 }, // Road wheels
      { partOptionId: 9 }, // Black rim
      { partOptionId: 12 }, // Single-speed chain
    ]);

    expect(validationResult.valid).toBeTruthy();
  });

  test('should reject an invalid configuration with missing parts', async () => {
    const invalidValidationResult = await configService.validateConfiguration(
      1,
      [
        { partOptionId: 1 }, // Full-suspension frame
        { partOptionId: 3 }, // Road wheels
      ]
    );

    expect(invalidValidationResult.valid).toBeFalsy();
  });
});
