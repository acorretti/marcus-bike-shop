/**
 * Example data for the bicycle shop
 *
 * This file demonstrates how the data model would be populated
 * with sample categories, products, parts, and rules
 */

// Sample Categories
const categories = [
  {
    id: 1,
    name: 'Bicycles',
    description: 'All types of bicycles available for customization',
    active: 1,
  },
  {
    id: 2,
    name: 'Skis',
    description: 'Winter sports equipment',
    active: 1,
  },
];

// Sample Products
const products = [
  {
    id: 1,
    category_id: 1,
    name: 'Adventure Bike',
    description: 'Perfect for trail and mountain riding',
    base_price: 120.0,
    active: 1,
  },
  {
    id: 2,
    category_id: 1,
    name: 'City Cruiser',
    description: 'Comfortable ride for urban environments',
    base_price: 100.0,
    active: 1,
  },
];

// Sample Part Types
const partTypes = [
  {
    id: 1,
    name: 'Frame Type',
    description: 'The main structure of the bicycle',
    required: 1,
  },
  {
    id: 2,
    name: 'Frame Finish',
    description: 'Surface treatment and color of the frame',
    required: 1,
  },
  {
    id: 3,
    name: 'Wheels',
    description: 'Type of wheels that determine the riding surface',
    required: 1,
  },
  {
    id: 4,
    name: 'Rim Color',
    description: 'Color of the wheel rims',
    required: 1,
  },
  {
    id: 5,
    name: 'Chain',
    description: 'Type of chain that affects gearing',
    required: 1,
  },
];

// Map products to their part types
const productPartTypes = [
  // Adventure Bike parts
  { product_id: 1, part_type_id: 1, display_order: 1 },
  { product_id: 1, part_type_id: 2, display_order: 2 },
  { product_id: 1, part_type_id: 3, display_order: 3 },
  { product_id: 1, part_type_id: 4, display_order: 4 },
  { product_id: 1, part_type_id: 5, display_order: 5 },

  // City Cruiser parts
  { product_id: 2, part_type_id: 1, display_order: 1 },
  { product_id: 2, part_type_id: 2, display_order: 2 },
  { product_id: 2, part_type_id: 3, display_order: 3 },
  { product_id: 2, part_type_id: 4, display_order: 4 },
  { product_id: 2, part_type_id: 5, display_order: 5 },
];

// Sample Part Options
const partOptions = [
  // Frame Types
  {
    id: 1,
    part_type_id: 1,
    name: 'Full-suspension',
    description: 'Front and rear shock absorbers for rough terrain',
    base_price: 130.0,
    active: 1,
  },
  {
    id: 2,
    part_type_id: 1,
    name: 'Diamond',
    description: 'Traditional frame design with improved stability',
    base_price: 100.0,
    active: 1,
  },
  {
    id: 3,
    part_type_id: 1,
    name: 'Step-through',
    description: 'Low top tube for easy mounting and dismounting',
    base_price: 110.0,
    active: 1,
  },

  // Frame Finishes
  {
    id: 4,
    part_type_id: 2,
    name: 'Matte',
    description: 'Non-reflective finish',
    base_price: 0.0, // Base price is 0 because it varies with frame type
    active: 1,
  },
  {
    id: 5,
    part_type_id: 2,
    name: 'Shiny',
    description: 'Glossy reflective finish',
    base_price: 30.0,
    active: 1,
  },

  // Wheels
  {
    id: 6,
    part_type_id: 3,
    name: 'Road Wheels',
    description: 'Thin, fast wheels for paved surfaces',
    base_price: 80.0,
    active: 1,
  },
  {
    id: 7,
    part_type_id: 3,
    name: 'Mountain Wheels',
    description: 'Sturdy wheels with good traction for trails',
    base_price: 95.0,
    active: 1,
  },
  {
    id: 8,
    part_type_id: 3,
    name: 'Fat Bike Wheels',
    description: 'Extra wide wheels for sand and snow',
    base_price: 120.0,
    active: 1,
  },

  // Rim Colors
  {
    id: 9,
    part_type_id: 4,
    name: 'Red',
    description: 'Bright red color',
    base_price: 20.0,
    active: 1,
  },
  {
    id: 10,
    part_type_id: 4,
    name: 'Black',
    description: 'Classic black color',
    base_price: 15.0,
    active: 1,
  },
  {
    id: 11,
    part_type_id: 4,
    name: 'Blue',
    description: 'Deep blue color',
    base_price: 20.0,
    active: 1,
  },

  // Chains
  {
    id: 12,
    part_type_id: 5,
    name: 'Single-speed Chain',
    description: 'Simple chain for bikes without gears',
    base_price: 43.0,
    active: 1,
  },
  {
    id: 13,
    part_type_id: 5,
    name: '8-speed Chain',
    description: 'Chain compatible with 8-speed gear systems',
    base_price: 55.0,
    active: 1,
  },
];

// Sample Inventory
const inventory = [
  // Full inventory for Frame Types
  { part_option_id: 1, quantity: 15, in_stock: 1 },
  { part_option_id: 2, quantity: 20, in_stock: 1 },
  { part_option_id: 3, quantity: 18, in_stock: 1 },

  // Full inventory for Frame Finishes
  { part_option_id: 4, quantity: 50, in_stock: 1 },
  { part_option_id: 5, quantity: 40, in_stock: 1 },

  // Some inventory issues with wheels
  { part_option_id: 6, quantity: 25, in_stock: 1 },
  { part_option_id: 7, quantity: 10, in_stock: 1 },
  {
    part_option_id: 8,
    quantity: 0,
    in_stock: 0,
    expected_restock_date: '2025-06-15',
  },

  // Rim Colors
  { part_option_id: 9, quantity: 30, in_stock: 1 },
  { part_option_id: 10, quantity: 35, in_stock: 1 },
  { part_option_id: 11, quantity: 15, in_stock: 1 },

  // Chains
  { part_option_id: 12, quantity: 45, in_stock: 1 },
  { part_option_id: 13, quantity: 40, in_stock: 1 },
];

// Sample Incompatibility Rules
const incompatibilityRules = [
  {
    id: 1,
    name: 'Mountain wheels require full-suspension',
    description: 'Mountain wheels can only be used with full-suspension frames',
    active: 1,
  },
  {
    id: 2,
    name: 'Fat wheels with rim colors',
    description: 'Red rim color unavailable with fat bike wheels',
    active: 1,
  },
];

// Sample Rule Conditions
const ruleConditions = [
  // If mountain wheels selected, only full-suspension frame is allowed
  { rule_id: 1, part_option_id: 7, incompatible_with_part_option_id: 2 },
  { rule_id: 1, part_option_id: 7, incompatible_with_part_option_id: 3 },

  // If fat bike wheels selected, red rim is unavailable
  { rule_id: 2, part_option_id: 8, incompatible_with_part_option_id: 9 },
];

// Example data export
module.exports = {
  categories,
  products,
  partTypes,
  productPartTypes,
  partOptions,
  inventory,
  incompatibilityRules,
  ruleConditions,
};
