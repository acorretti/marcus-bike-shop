/**
 * Database setup utility
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Create a database connection
function connectDatabase(dbPath = ':memory:') {
  return new Database(dbPath);
}

// Initialize the database schema
function initializeSchema(db) {
  const schemaPath = path.join(__dirname, '..', 'models', 'data_model.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split the schema into separate statements and execute each one
  const statements = schema
    .split(';')
    .filter((statement) => statement.trim() !== '');

  for (const statement of statements) {
    db.exec(statement + ';');
  }

  return db;
}

// Utility function to create a database
function createDatabase(dbPath) {
  const db = connectDatabase(dbPath);
  initializeSchema(db);
  return db;
}

module.exports = {
  connectDatabase,
  initializeSchema,
  createDatabase,
};
