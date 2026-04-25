// sql.js is a pure-WASM build of SQLite — no native C++ compilation needed,
// so it works on any platform without Visual Studio or build tools.
const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db/buynest.db');

let db; // module-level singleton

async function init() {
  const SQL = await initSqlJs();

  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL,
      price       REAL    NOT NULL,
      category    TEXT    NOT NULL,
      stock       INTEGER NOT NULL DEFAULT 0,
      color       TEXT    NOT NULL DEFAULT '#6c757d',
      emoji       TEXT    NOT NULL DEFAULT '📦',
      created_at  TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id         TEXT    UNIQUE NOT NULL,
      customer_name    TEXT    NOT NULL,
      customer_email   TEXT    NOT NULL,
      customer_address TEXT    NOT NULL,
      items            TEXT    NOT NULL,
      total            REAL    NOT NULL,
      created_at       TEXT    DEFAULT (datetime('now'))
    )
  `);

  persist();
}

// Write in-memory database back to disk after every mutation
function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// Returns an array of plain row objects
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Returns the first row or undefined
function get(sql, params = []) {
  return all(sql, params)[0];
}

// Executes a write and saves to disk
function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

module.exports = { init, all, get, run };
