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

// Example data export
module.exports = {
  categories,
  products,
};
