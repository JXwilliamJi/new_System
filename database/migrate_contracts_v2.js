const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'legal_compliance.db');
const db = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

console.log('开始迁移合同表结构(v2)...');

try {
  // 检查表是否存在
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'").get();
  
  if (!tableExists) {
    console.log('contracts表不存在，跳过迁移');
    process.exit(0);
  }

  // 获取当前表结构
  const tableInfo = db.prepare("PRAGMA table_info(contracts)").all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log('现有字段:', existingColumns);

  // 定义需要添加的新字段（Excel导入所需的字段）
  const newColumns = [
    { name: 'procurement_name', type: 'TEXT', description: '采购名称' },
    { name: 'budget_amount', type: 'REAL', description: '采购申请总体预算金额' },
    { name: 'submit_leader', type: 'TEXT', description: '呈报领导' },
    { name: 'submission_completed_date', type: 'DATE', description: '合同请示完成日期' }
  ];

  // 添加新字段
  for (const column of newColumns) {
    if (!existingColumns.includes(column.name)) {
      const sql = `ALTER TABLE contracts ADD COLUMN ${column.name} ${column.type}`;
      console.log(`添加字段: ${column.name} (${column.description})`);
      db.exec(sql);
    } else {
      console.log(`字段已存在: ${column.name}，跳过`);
    }
  }

  console.log('✅ 合同表结构迁移完成(v2)！');
  
  // 显示新的表结构
  const newTableInfo = db.prepare("PRAGMA table_info(contracts)").all();
  console.log('\n新的表结构:');
  newTableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });

} catch (error) {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
} finally {
  db.close();
}
