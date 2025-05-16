# Bicycle Shop E-Commerce Solution

## User Workflows

### 1. Product Page (Read Operation)

When a customer views a product page:

1. The system loads the product details
2. The system loads all part types for this product
3. For each part type, the system loads compatible options based on:
   - Current selections made by the user
   - Inventory availability
   - Compatibility rules
4. The interface dynamically updates as the user makes selections:
   - Options that are incompatible with current selections are disabled
   - Out-of-stock options are marked as unavailable
   - The price updates based on the selected options and pricing rules

#### Price Calculation Logic

1. Start with the product's base price
2. Add the base price of each selected part option
3. Apply any special pricing rules based on the combination of selected options
4. Display the final price to the customer

### 2. Add to Cart Action

When a customer clicks "Add to Cart":

1. The system validates the configuration:
   - Ensures all required part types have selections
   - Verifies that selected options are compatible
   - Checks inventory availability
2. The system calculates the final price
3. If the customer has an existing cart:
   - The configured product is added to the existing cart
   - The cart total is updated
4. If the customer doesn't have a cart:
   - A new cart (order with "cart" status) is created
   - The configured product is added to the cart
5. The customer receives confirmation that the item was added to the cart

### 3. Checkout Process

1. The customer reviews their cart contents
2. The system re-validates all configurations and inventory availability
3. The customer enters shipping and payment information
4. When the order is placed:
   - The system reserves the inventory
   - The system processes the payment
   - The order status changes from "cart" to "pending"
   - The customer receives order confirmation

## Administrative Workflows

### 1. New Product Creation

When Marcus wants to add a new product:

1. He selects a category (or creates a new one)
2. He enters product details:
   - Name
   - Description
   - Base price
   - Active status
3. He selects which part types are applicable to this product
4. For each part type, he specifies:
   - Whether it's required
   - Display order in the UI

### 2. Adding a New Part Choice

When Marcus wants to add a new rim color:

1. He navigates to the part type management section
2. He selects the relevant part type (e.g., "Rim color")
3. He creates a new part option:
   - Name (e.g., "Green")
   - Description
   - Base price
   - Initial inventory quantity
4. Optionally, he sets up incompatibility rules:
   - Selecting which other part option(s) are incompatible
   - Providing reasons for the incompatibility

### 3. Setting Prices

When Marcus wants to change pricing:

#### Simple Price Updates

1. He navigates to the part option management section
2. He selects the part option to update
3. He changes the base price

#### Complex Pricing Rules

1. He navigates to the pricing rules section
2. He creates a new pricing rule:
   - Name and description for the rule
   - Part options that trigger this rule
   - Price adjustment (fixed amount or percentage)
3. The rule applies when the specified combination of options is selected

### 4. Inventory Management

1. He navigates to the inventory management section
2. He can filter by part types or search for specific part options
3. For each part option, he can:
   - Update the current quantity
   - Mark items as in/out of stock
   - Set expected restock dates

### 5. Order Management

1. He can view all orders with various filters (date, status, etc.)
2. For each order, he can:
   - View complete order details with all configured products
   - Update order status (processing, shipped, delivered, etc.)
   - View customer information

## Technical Implementation Details

### 1. Handling Prohibited Combinations

The system uses a rules-based approach where:

- Rules define which combinations are prohibited
- When a user selects an option, the system filters out incompatible options
- This ensures customers can only select valid configurations

### 2. Dynamic Pricing

The system supports complex pricing rules:

- Base prices for individual part options
- Special pricing for specific combinations
- Percentage or fixed-amount adjustments
- Multiple pricing rules can stack

### 3. Inventory Management

- Real-time inventory tracking for each part option
- Ability to mark items as temporarily out of stock
- Expected restock dates for better customer communication

### 4. Extensibility

The design supports future expansion:

- The category system allows adding new product types beyond bicycles
- The part type and option system is flexible and extensible
- Pricing and compatibility rules work across all product types
