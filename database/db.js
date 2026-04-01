const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'legal_compliance.db');
const db = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

module.exports = db;
