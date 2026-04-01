const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'legal_compliance.db');
const db = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

console.log('开始迁移数据库...');

try {
  // 创建合规类型配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS compliance_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ 合规类型配置表创建成功');

  // 插入默认合规类型
  const insertType = db.prepare(`
    INSERT OR IGNORE INTO compliance_types (name, sort_order, is_active)
    VALUES (?, ?, 1)
  `);

  const defaultTypes = [
    { name: '合同审查', order: 1 },
    { name: '项目采购', order: 2 },
    { name: '制度审查', order: 3 },
    { name: '合法性审查', order: 4 },
    { name: '法律服务', order: 5 }
  ];

  defaultTypes.forEach(type => {
    insertType.run(type.name, type.order);
  });
  console.log('✅ 默认合规类型插入成功');

  // 创建部门配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ 部门配置表创建成功');

  // 插入默认部门
  const insertDepartment = db.prepare(`
    INSERT OR IGNORE INTO departments (name, sort_order, is_active)
    VALUES (?, ?, 1)
  `);

  const defaultDepartments = [
    { name: '办公室', order: 1 },
    { name: '科技一部', order: 2 },
    { name: '科技二部', order: 3 },
    { name: '业务一部', order: 4 },
    { name: '业务二部', order: 5 }
  ];

  defaultDepartments.forEach(dept => {
    insertDepartment.run(dept.name, dept.order);
  });
  console.log('✅ 默认部门插入成功');

  // 检查compliance_checks表是否已有submit_department字段
  const tableInfo = db.prepare("PRAGMA table_info(compliance_checks)").all();
  const hasSubmitDepartment = tableInfo.some(col => col.name === 'submit_department');
  const hasSubmitUser = tableInfo.some(col => col.name === 'submit_user');
  const hasReviewer = tableInfo.some(col => col.name === 'reviewer');

  // 如果没有submit_department字段，则添加
  if (!hasSubmitDepartment) {
    db.exec(`
      ALTER TABLE compliance_checks ADD COLUMN submit_department TEXT
    `);
    console.log('✅ 添加submit_department字段成功');
  } else {
    console.log('ℹ️ submit_department字段已存在');
  }

  // 如果没有submit_user字段，则添加
  if (!hasSubmitUser) {
    db.exec(`
      ALTER TABLE compliance_checks ADD COLUMN submit_user INTEGER
    `);
    console.log('✅ 添加submit_user字段成功');
  } else {
    console.log('ℹ️ submit_user字段已存在');
  }

  // 如果没有reviewer字段，则添加
  if (!hasReviewer) {
    db.exec(`
      ALTER TABLE compliance_checks ADD COLUMN reviewer INTEGER
    `);
    console.log('✅ 添加reviewer字段成功');
  } else {
    console.log('ℹ️ reviewer字段已存在');
  }

  // 为现有数据设置默认值
  const updateExistingData = db.prepare(`
    UPDATE compliance_checks 
    SET submit_department = '办公室', submit_user = created_by
    WHERE submit_department IS NULL
  `);
  const result = updateExistingData.run();
  if (result.changes > 0) {
    console.log(`✅ 为 ${result.changes} 条现有数据设置了默认提交部门和提交人`);
  }

  console.log('\n✅ 数据库迁移完成！');
} catch (error) {
  console.error('❌ 数据库迁移失败:', error);
} finally {
  db.close();
}
