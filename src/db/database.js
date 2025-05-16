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

      // Handle IN clause with array parameter
      if (
        sql.includes(' IN (?)') &&
        params.length === 1 &&
        Array.isArray(params[0])
      ) {
        const arrayParam = params[0];

        if (arrayParam.length === 0) {
          // Handle empty array case - use a condition that's always false
          processedSql = sql.replace('IN (?)', 'IN (-1)');
          processedParams = [];
        } else {
          // Create a placeholder for each array item
          const placeholders = arrayParam.map(() => '?').join(',');
          processedSql = sql.replace('IN (?)', `IN (${placeholders})`);
          // Flatten the array for parameters
          processedParams = arrayParam;
        }
      }

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
