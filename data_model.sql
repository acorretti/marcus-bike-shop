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
