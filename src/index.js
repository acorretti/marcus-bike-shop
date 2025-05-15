/**
 * Main application entry point
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const SQLiteDatabase = require('./db/database');
const { createDatabase, getDatabaseFilePath } = require('./db/setup');

const dbPath = getDatabaseFilePath();

// Initialize the database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  console.debug(`Initializing database at ${dbPath}...`);
  createDatabase(dbPath);
  console.debug('Database initialized successfully.');
}
