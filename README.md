# Bicycle Shop E-Commerce Solution

This solution provides a model for Marcus's bicycle shop e-commerce website, allowing customers to customize and purchase bicycles with various options while supporting future product expansion.

## Data Model Overview

The solution uses a relational data model to represent products, customizable parts, options, inventory, and pricing logic.

## Key Features

- Flexible product customization
- Support for prohibited combinations of options
- Inventory tracking with out-of-stock management
- Dynamic pricing based on option combinations
- Expandable to different product types beyond bicycles

## Project Structure

```
src/
├── models/                                # Core domain models
│   └── data_model.sql                       # SQL schema implementation
├── services/                              # Business logic services
│   ├── product_configuration.js             # Product customization
│   ├── orders.js                            # Cart & checkout
│   └── admin.js                             # Admin workflows
├── db/                                    # Database utilities
│   ├── setup.js                             # Database initialization
│   ├── database.js                          # Database interface
│   └── seed.js                              # Data seeding
├── tests/                                 # Unit tests
│   └── integration.test.js                  # Integration tests
│   └── mock_database.js                     # Product database mock
├── example_data.js                        # Product database sample data
├── REQUIREMENTS.md                        # Provided requirements (verbatim)
└── WORKFLOWS.md                           # User workflows breakdown
```

## Setup Instructions

### Prerequisites

- Node.js 18.x or higher

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment file and configure as needed:

```bash
cp .env.example .env
```

### Running the Application

Initialize and seed the database:

```bash
npm run db:seed
```

Start the application:

```bash
npm start
```

### Running Tests

Execute all tests:

```bash
npm test
```

## Database Schema

Key tables include:

- **Categories**: Top-level product categories
- **Products**: Specific product types
- **PartTypes**: Types of customizable parts
- **PartOptions**: Specific options for each part
- **Inventory**: Stock tracking
- **IncompatibilityRules**: Define prohibited combinations
- **PricingRules**: Special pricing logic

See `src/models/data_model.sql` for the complete schema.

## Design Decisions and Trade-offs

### 1. Relational Database Model

**Decision**: Used a relational database approach.

**Rationale**:

- **Strong data integrity** for complex relationships between products, parts, and rules
- **Structured querying** capabilities for filtering compatible options
- **Transaction support** for inventory management
- **Normalized design** reduces redundancy and ensures data consistency

**Trade-offs**:

- Less flexibility for rapidly changing product structures
- More complex joins for retrieval operations

### 2. Rules Engine Pattern for Compatibility and Pricing

**Decision**: Implemented a rules-based system.

**Rationale**:

- **Separation of business rules** from application logic
- **Flexibility for store manager** to add/modify rules without code changes
- **Scalable approach** for handling complex combinations

**Trade-offs**:

- More complex queries to evaluate rules
- Increased computational overhead for rule evaluation
- Added complexity in validating all option combinations to avoid restricting the customization flow (e.g., preventing a rigid, step-by-step selection process like some car configurators)

### 3. Granular Inventory Management

**Decision**: Tracked inventory at the individual part option level.

**Rationale**:

- **Direct alignment** with store manager's requirement for marking options as out of stock
- **Precise control** over availability of specific configurations
- **Simplifies reordering** process for specific parts

**Trade-offs**:

- More inventory records to manage
- Complexity in inventory updates

### 4. Extensibility for Future Product Types

**Decision**: Designed the category system to support different product types.

**Rationale**:

- **Future-proofs** the system for Marcus's growth plans
- **Consistent approach** to product configuration across different categories
- **Reuses core functionality** for different product types

**Trade-offs**:

- Initial over-engineering
- Some additional complexity in the data model
