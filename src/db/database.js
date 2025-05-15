require('colors');
const { connectDatabase } = require('./setup');

/**
 * Database interface implementation using better-sqlite3
 */
class SQLiteDatabase {
  constructor(dbPath) {
    // If not provided, use an in-memory database
    this.dbPath = dbPath || ':memory:';
    this.db = connectDatabase(this.dbPath);
  }

  /**
   * Execute a query with parameters and return results
   */
  async query(sql, params = []) {
    try {
      // Process SQL for IN clauses with array parameters
      let processedSql = sql;
      let processedParams = params;

      // Check if the query is a SELECT
      const isSelect = processedSql.trim().toLowerCase().startsWith('select');

      if (isSelect) {
        // For SELECT queries, return all results
        const stmt = this.db.prepare(processedSql);
        return stmt.all(...processedParams);
      } else {
        // For other queries, just execute
        const stmt = this.db.prepare(processedSql);
        const result = stmt.run(...processedParams);

        return {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        };
      }
    } catch (error) {
      console.error('Database error'.red);
      console.debug(
        'Executed:'.cyan,
        `${sql}`.green,
        '\nwith params:'.cyan,
        `${params}`.green
      );
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = SQLiteDatabase;
