/**
 * Database seeding script
 *
 * This script populates the database with initial test data
 */
require('dotenv').config();
require('colors');
const path = require('path');
const fs = require('fs');
const SQLiteDatabase = require('./database');
const { createDatabase, getDatabaseFilePath } = require('./setup');

const exampleData = require('../models/example_data');

const dbPath = getDatabaseFilePath();

// Create a clean database
async function seedDatabase() {
  console.debug(`Creating and seeding database at`.cyan, `${dbPath}`.green);

  // Delete existing database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Initialize the database with schema
  createDatabase(dbPath);

  // Connect to the database
  const db = new SQLiteDatabase(dbPath);

  try {
    // Insert categories
    for (const category of exampleData.categories) {
      await db.query(
        'INSERT INTO Categories (id, name, description, active) VALUES (?, ?, ?, ?)',
        [category.id, category.name, category.description, category.active]
      );
    }

    // Insert products
    for (const product of exampleData.products) {
      await db.query(
        'INSERT INTO Products (id, category_id, name, description, base_price, active) VALUES (?, ?, ?, ?, ?, ?)',
        [
          product.id,
          product.category_id,
          product.name,
          product.description,
          product.base_price,
          product.active,
        ]
      );
    }
    console.debug('Database seeded successfully!'.green);
  } catch (error) {
    console.error('Error seeding database'.red, error);
  } finally {
    // Close database connection
    db.close();
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
