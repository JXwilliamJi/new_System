const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'legal_compliance.db');
const db = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

console.log('开始迁移合同表结构...');

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

  // 定义需要添加的新字段
  const newColumns = [
    { name: 'agent', type: 'TEXT', description: '经办人' },
    { name: 'agent_department', type: 'TEXT', description: '经办人部门' },
    { name: 'contract_stage', type: 'TEXT', description: '合同当前阶段' },
    { name: 'contract_category', type: 'TEXT', description: '合同分类' },
    { name: 'our_signing_entity', type: 'TEXT', description: '我方签约主体' },
    { name: 'supplier', type: 'TEXT', description: '签约供应商' },
    { name: 'is_sme', type: 'TEXT', description: '是否为中小企业' },
    { name: 'signed_amount', type: 'REAL', description: '已签订合同金额' },
    { name: 'acceptance_deadline', type: 'DATE', description: '验收截止日期' },
    { name: 'warranty_period', type: 'TEXT', description: '维保期/质保期' },
    { name: 'contract_content', type: 'TEXT', description: '合同标的内容' },
    { name: 'signed_date', type: 'DATE', description: '合同签署日期' },
    { name: 'performance_status', type: 'TEXT', description: '合同履行情况' }
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

  console.log('✅ 合同表结构迁移完成！');
  
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
