-- SQL Schema for Bicycle Shop E-commerce Platform

-- Categories represents the top-level product categories (bicycles, skis, surfboards, etc.)
CREATE TABLE Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Products represent specific product types within a category
CREATE TABLE Products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES Categories(id)
);


-- PartTypes represent the types of parts that can be customized
CREATE TABLE PartTypes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT TRUE
);

-- ProductPartTypes links products to relevant part types
CREATE TABLE ProductPartTypes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  part_type_id INTEGER NOT NULL,
  display_order INTEGER,
  FOREIGN KEY (product_id) REFERENCES Products(id),
  FOREIGN KEY (part_type_id) REFERENCES PartTypes(id)
);

-- PartOptions represent the specific options for each part type
CREATE TABLE PartOptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_type_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (part_type_id) REFERENCES PartTypes(id)
);

-- Inventory tracks stock levels for specific part options
CREATE TABLE Inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_option_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  in_stock BOOLEAN,
  expected_restock_date DATE,
  FOREIGN KEY (part_option_id) REFERENCES PartOptions(id)
);

-- IncompatibilityRules defines which combinations of parts are not allowed
CREATE TABLE IncompatibilityRules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255),
  description TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- RuleConditions defines the specific conditions for incompatibility rules
CREATE TABLE RuleConditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  part_option_id INTEGER NOT NULL,
  incompatible_with_part_option_id INTEGER NOT NULL,
  FOREIGN KEY (rule_id) REFERENCES IncompatibilityRules(id),
  FOREIGN KEY (part_option_id) REFERENCES PartOptions(id),
  FOREIGN KEY (incompatible_with_part_option_id) REFERENCES PartOptions(id)
);

-- Customers table for user accounts
CREATE TABLE Customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order represents a customer order
CREATE TABLE Orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT,
  payment_reference VARCHAR(255),
  FOREIGN KEY (customer_id) REFERENCES Customers(id)
);

-- OrderItems represents individual products in an order
CREATE TABLE OrderItems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES Orders(id),
  FOREIGN KEY (product_id) REFERENCES Products(id)
);

-- OrderItemConfiguration represents the selected part options for an order item
CREATE TABLE OrderItemConfiguration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  part_option_id INTEGER NOT NULL,
  FOREIGN KEY (order_item_id) REFERENCES OrderItems(id),
  FOREIGN KEY (part_option_id) REFERENCES PartOptions(id)
);
