/**
 * Main application entry point
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const SQLiteDatabase = require('./db/database');
const { createDatabase, getDatabaseFilePath } = require('./db/setup');

const ProductConfigurationService = require('./services/product_configuration');
const OrderService = require('./services/orders');
const AdminService = require('./services/admin');

const dbPath = getDatabaseFilePath();

// Initialize the database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  console.debug(`Initializing database at`, `${dbPath}...`.green);
  createDatabase(dbPath);
  console.debug('Database initialized successfully.'.underline.green);
}

// Create database connection
const db = new SQLiteDatabase(dbPath);

// Initialize services
const productConfigService = new ProductConfigurationService(db);
const orderService = new OrderService(db);
const adminService = new AdminService(db);

// Simple example usage
async function exampleUsage() {
  try {
    console.debug('============================'.rainbow);
    console.debug('  ~~~ Marcus Bike Shop ~~~  '.bold.white);
    console.debug('============================\n'.rainbow);

    // First check if database was seeded properly
    const categories = await db.query('SELECT * FROM Categories LIMIT 1');
    if (!categories || categories.length === 0) {
      console.debug(
        'Database not seeded yet.'.red,
        '\nRun:',
        'npm run db:seed'.green
      );
      return;
    }

    try {
      // Get a single product to verify database setup
      const products = await db.query('SELECT * FROM Products LIMIT 1');
      if (products && products.length > 0) {
        console.debug('Found product:'.magenta, `${products[0].name}`.green);
      }

      // Get available frame types for the first product
      const frameOptions = await productConfigService.getAvailableOptions(
        1,
        1,
        []
      );
      if (frameOptions && frameOptions.length > 0) {
        console.debug(
          'Available frame types:'.magenta,
          frameOptions.map((opt) => opt.name)
        );
      } else {
        console.debug(
          'No frame options found. Check that data is properly seeded.'.red
        );
      }

      // Get orders (would be empty in a new database)
      const orders = await adminService.getOrders({ limit: 5 });
      console.debug(
        'Recent orders:'.magenta,
        `${orders.length ? orders : 'No orders found'}`.green
      );
    } catch (err) {
      console.error('Error accessing product data:'.red, err.message);
      console.debug(
        'Make sure to run',
        'npm run db:seed'.green,
        'to populate the database first'
      );
    }

    console.debug('\nServices initialized successfully.'.cyan);
    console.debug('Run tests with:', 'npm test\n'.magenta);
  } catch (error) {
    console.error('Error:'.red, error);
    console.debug(
      'Make sure to run:',
      'npm run db:seed'.green,
      'to populate the database first'
    );
  } finally {
    // Close database connection
    db.close();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

// Export for use in other files
module.exports = {
  db,
  productConfigService,
  orderService,
  adminService,
};
