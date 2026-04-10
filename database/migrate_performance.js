const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'legal_compliance.db');
const db = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

console.log('开始创建合同履行情况报送记录表...');

try {
  // 创建合同履行情况报送记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_performance_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_no TEXT NOT NULL,
      contract_no TEXT NOT NULL,
      report_date DATE NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contract_no) REFERENCES contracts(contract_no),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // 创建索引以提高查询性能
  db.exec(`CREATE INDEX IF NOT EXISTS idx_performance_contract_no ON contract_performance_reports(contract_no)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_performance_doc_no ON contract_performance_reports(doc_no)`);

  console.log('✅ 合同履行情况报送记录表创建完成！');
  
  // 显示表结构
  const tableInfo = db.prepare("PRAGMA table_info(contract_performance_reports)").all();
  console.log('\n表结构:');
  tableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });

} catch (error) {
  console.error('❌ 创建表失败:', error);
  process.exit(1);
} finally {
  db.close();
}
