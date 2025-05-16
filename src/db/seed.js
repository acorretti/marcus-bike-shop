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

    // Insert part types
    for (const partType of exampleData.partTypes) {
      await db.query(
        'INSERT INTO PartTypes (id, name, description, required) VALUES (?, ?, ?, ?)',
        [partType.id, partType.name, partType.description, partType.required]
      );
    }

    // Insert product part types
    for (const ppt of exampleData.productPartTypes) {
      await db.query(
        'INSERT INTO ProductPartTypes (product_id, part_type_id, display_order) VALUES (?, ?, ?)',
        [ppt.product_id, ppt.part_type_id, ppt.display_order]
      );
    }

    // Insert part options
    for (const option of exampleData.partOptions) {
      await db.query(
        'INSERT INTO PartOptions (id, part_type_id, name, description, base_price, active) VALUES (?, ?, ?, ?, ?, ?)',
        [
          option.id,
          option.part_type_id,
          option.name,
          option.description,
          option.base_price,
          option.active,
        ]
      );
    }

    // Insert inventory
    for (const inv of exampleData.inventory) {
      await db.query(
        'INSERT INTO Inventory (part_option_id, quantity, in_stock, expected_restock_date) VALUES (?, ?, ?, ?)',
        [
          inv.part_option_id,
          inv.quantity,
          inv.in_stock,
          inv.expected_restock_date,
        ]
      );
    }

    // Insert incompatibility rules
    for (const rule of exampleData.incompatibilityRules) {
      await db.query(
        'INSERT INTO IncompatibilityRules (id, name, description, active) VALUES (?, ?, ?, ?)',
        [rule.id, rule.name, rule.description, rule.active]
      );
    }

    // Insert rule conditions
    for (const cond of exampleData.ruleConditions) {
      await db.query(
        'INSERT INTO RuleConditions (rule_id, part_option_id, incompatible_with_part_option_id) VALUES (?, ?, ?)',
        [
          cond.rule_id,
          cond.part_option_id,
          cond.incompatible_with_part_option_id,
        ]
      );
    }

    // Insert pricing rules
    for (const rule of exampleData.pricingRules) {
      await db.query(
        'INSERT INTO PricingRules (id, name, description, price_adjustment, is_percentage, active) VALUES (?, ?, ?, ?, ?, ?)',
        [
          rule.id,
          rule.name,
          rule.description,
          rule.price_adjustment,
          rule.is_percentage,
          rule.active,
        ]
      );
    }

    // Insert pricing rule conditions
    for (const cond of exampleData.pricingRuleConditions) {
      await db.query(
        'INSERT INTO PricingRuleConditions (pricing_rule_id, part_option_id) VALUES (?, ?)',
        [cond.pricing_rule_id, cond.part_option_id]
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
