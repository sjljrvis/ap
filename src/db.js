const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let defaultDb = null;

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Run schema migrations on the provided SQLite database connection.
 * @param {Database.Database} db
 */
function executeMigration(db) {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
}

/**
 * Initialize a SQLite database connection with appropriate pragmas and schema.
 * @param {string} [dbPath] - Database file path or ':memory:'
 * @returns {Database.Database}
 */
function initDb(dbPath) {
  const targetPath = dbPath || process.env.DB_PATH || path.join(__dirname, '../accounts_payable.db');
  const db = new Database(targetPath, { timeout: 10000 });

  db.pragma('busy_timeout = 10000');
  try {
    db.pragma('journal_mode = WAL');
  } catch (_) {}
  db.pragma('foreign_keys = ON');

  executeMigration(db);
  return db;
}

/**
 * Get or create the singleton SQLite database instance.
 * @param {string} [dbPath]
 * @returns {Database.Database}
 */
function getDb(dbPath) {
  if (!defaultDb) {
    defaultDb = initDb(dbPath);
  }
  return defaultDb;
}

/**
 * Close the singleton database connection and reset the instance.
 */
function closeDb() {
  if (defaultDb) {
    try {
      defaultDb.close();
    } finally {
      defaultDb = null;
    }
  }
}

module.exports = {
  initDb,
  getDb,
  closeDb,
  executeMigration,
  SCHEMA_PATH,
};
