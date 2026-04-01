const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, 'legal_compliance.db');
const db = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

// 创建用户表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    real_name TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建合同表
db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_no TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    party_a TEXT,
    party_b TEXT,
    amount REAL,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'pending',
    risk_level TEXT DEFAULT 'low',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// 创建制度表
db.exec(`
  CREATE TABLE IF NOT EXISTS regulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT,
    effective_date DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'active',
    content TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// 创建合规检查表
db.exec(`
  CREATE TABLE IF NOT EXISTS compliance_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    check_date DATE,
    result TEXT,
    status TEXT DEFAULT 'pending',
    assigned_to INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// 创建风险事项表
db.exec(`
  CREATE TABLE IF NOT EXISTS risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    level TEXT DEFAULT 'medium',
    probability TEXT,
    impact TEXT,
    status TEXT DEFAULT 'open',
    assigned_to INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// 创建部门工作表（原任务表）
db.exec(`
  CREATE TABLE IF NOT EXISTS department_work (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number TEXT,
    task_name TEXT NOT NULL,
    work_content TEXT,
    task_source TEXT,
    assign_time DATE,
    required_complete_time DATE,
    responsibility_line TEXT,
    responsible_person INTEGER,
    coordinator TEXT,
    progress_status TEXT DEFAULT 'pending',
    complete_time DATE,
    work_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (responsible_person) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// 创建模块配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS module_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_key TEXT UNIQUE NOT NULL,
    module_name TEXT NOT NULL,
    is_visible INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 插入默认模块配置
const insertModule = db.prepare(`
  INSERT OR IGNORE INTO module_config (module_key, module_name, is_visible, sort_order, description)
  VALUES (?, ?, ?, ?, ?)
`);

insertModule.run('dashboard', '仪表盘', 1, 1, '平台概览和数据统计');
insertModule.run('contracts', '合同管理', 1, 2, '管理各类合同信息');
insertModule.run('regulations', '制度管理', 1, 3, '管理公司制度规范');
insertModule.run('compliance', '合规检查', 1, 4, '管理合规检查任务');
insertModule.run('risks', '风险管理', 1, 5, '管理风险事项');
insertModule.run('department_work', '部门工作', 1, 6, '管理部门工作事项');
insertModule.run('admin', '后台管理', 1, 7, '平台后台管理配置');

// 插入初始用户数据（密码是加密的）
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password, real_name, department, role, email)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// 创建两个真实可登录的账号
// 密码: admin123 和 manager123
const salt = bcrypt.genSaltSync(10);
const adminPassword = bcrypt.hashSync('admin123', salt);
const managerPassword = bcrypt.hashSync('manager123', salt);

// 插入管理员账号
insertUser.run('admin', adminPassword, '张经理', '法务部', 'admin', 'admin@company.com');

// 插入普通用户账号
insertUser.run('zhangsan', managerPassword, '张三', '法务部', 'user', 'zhangsan@company.com');

// 插入示例数据
// 插入示例合同
const insertContract = db.prepare(`
  INSERT OR IGNORE INTO contracts (contract_no, title, type, party_a, party_b, amount, start_date, end_date, status, risk_level, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertContract.run('HT-2026-001', '2026年度供应商框架协议', '采购合同', '我方公司', '供应商A', 500000, '2026-01-01', '2026-12-31', 'pending', 'low', 1);
insertContract.run('HT-2026-002', '软件开发服务合同', '服务合同', '我方公司', '科技公司B', 200000, '2026-02-01', '2026-08-31', 'active', 'medium', 1);
insertContract.run('HT-2026-003', '办公场地租赁合同', '租赁合同', '我方公司', '物业C', 360000, '2026-01-01', '2028-12-31', 'active', 'low', 1);

// 插入示例制度
const insertRegulation = db.prepare(`
  INSERT OR IGNORE INTO regulations (title, category, version, effective_date, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertRegulation.run('员工商业行为准则', '行为规范', '2026版', '2026-03-01', 'active', 1);
insertRegulation.run('采购招标管理办法', '采购管理', '2026版', '2026-02-15', 'active', 1);
insertRegulation.run('印章使用管理规定', '行政管理', '2026版', '2026-01-20', 'active', 1);

// 插入示例合规检查
const insertComplianceCheck = db.prepare(`
  INSERT OR IGNORE INTO compliance_checks (title, type, description, check_date, result, status, assigned_to, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertComplianceCheck.run('数据安全合规性自查报告', '数据安全', '检查公司数据安全合规情况', '2026-03-15', null, 'pending', 1, 1);
insertComplianceCheck.run('反洗钱合规检查', '反洗钱', '检查反洗钱相关合规情况', '2026-03-10', '合规', 'completed', 1, 1);

// 插入示例风险事项
const insertRisk = db.prepare(`
  INSERT OR IGNORE INTO risks (title, category, description, level, probability, impact, status, assigned_to, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertRisk.run('知识产权侵权风险', '知识产权', '存在潜在的知识产权侵权风险', 'high', 'medium', 'high', 'open', 1, 1);
insertRisk.run('合同违约风险', '合同管理', '供应商可能无法按时交付', 'medium', 'low', 'medium', 'monitoring', 1, 1);

// 插入示例部门工作数据
const insertDepartmentWork = db.prepare(`
  INSERT OR IGNORE INTO department_work (serial_number, task_name, work_content, task_source, assign_time, required_complete_time, responsibility_line, responsible_person, coordinator, progress_status, complete_time, work_type, year, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 重点工作
insertDepartmentWork.run('ZX-2026-001', '2026年度供应商框架协议审核', '审核年度供应商框架协议，确保合规性', '法务部', '2026-01-15', '2026-03-30', '法务部', 1, '张三', 'pending', null, 'key_work', 2026, 1);
insertDepartmentWork.run('ZX-2026-002', '数据安全合规性自查报告', '完成数据安全合规性自查报告', '合规部', '2026-02-01', '2026-03-25', '合规部', 1, '李四', 'in_progress', null, 'key_work', 2026, 1);

// 督办事项
insertDepartmentWork.run('DB-2026-001', '知识产权侵权风险评估', '评估知识产权侵权风险并制定应对措施', '管理层', '2026-02-10', '2026-03-28', '法务部', 1, '王五', 'pending', null, 'supervision', 2026, 1);

// 常态工作
insertDepartmentWork.run('CT-2026-001', '合同审核', '日常合同审核工作', '业务部', '2026-01-01', '2026-12-31', '法务部', 1, '赵六', 'in_progress', null, 'routine', 2026, 1);

// 整改清单
insertDepartmentWork.run('ZG-2026-001', '合规检查整改', '根据合规检查结果进行整改', '合规部', '2026-03-01', '2026-04-30', '合规部', 1, '钱七', 'pending', null, 'rectification', 2026, 1);

console.log('✅ 数据库初始化完成！');
console.log('📊 已创建表：users, contracts, regulations, compliance_checks, risks, tasks, module_config');
console.log('👤 已创建用户账号：');
console.log('   - 管理员: admin / admin123');
console.log('   - 普通用户: zhangsan / manager123');
console.log('⚙️ 已初始化模块配置：dashboard, contracts, regulations, compliance, risks, tasks, admin');

db.close();
