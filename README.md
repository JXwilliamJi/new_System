# 法务合规管理系统

一个基于 Node.js + SQLite 的企业法务合规管理系统，包含合同管理、制度管理、合规管理、风险管理四大模块。

## 功能特性

### 🔐 用户认证
- 用户登录/注册
- JWT Token 认证
- 密码加密存储

### 📊 工作台
- 关键指标展示（待审合同、新增制度、高风险事项、培训完成率）
- 合同签署与风险趋势图表
- 合同类型分布饼图
- 最新待办任务列表
- 最新制度发布列表

### 📄 合同管理
- 合同列表展示
- 新增/编辑/删除合同
- 合同状态管理（待审核、已生效、已完成）
- 风险等级评估（低、中、高）
- 搜索和筛选功能

### 📚 制度管理
- 制度列表展示
- 新增/编辑/删除制度
- 制度分类管理
- 版本控制
- 生效日期管理

### ✅ 合规管理
- 合规检查列表
- 新增/编辑/删除检查
- 检查类型管理（数据安全、反洗钱、反腐败等）
- 检查结果记录

### ⚠️ 风险管理
- 风险事项列表
- 新增/编辑/删除风险
- 风险等级评估
- 发生概率和影响程度分析
- 风险状态跟踪

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **前端**: 原生 HTML/CSS/JavaScript
- **图表**: Chart.js
- **图标**: Font Awesome

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
node database/init.js
```

这将创建数据库表并插入初始数据，包括两个测试账号。

### 3. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

### 4. 访问系统

打开浏览器访问: http://localhost:3000

## 测试账号

系统已预置两个可登录的账号：

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`
- 角色: 管理员

### 普通用户账号
- 用户名: `zhangsan`
- 密码: `manager123`
- 角色: 普通用户

## 项目结构

```
legal-compliance-system/
├── database/
│   ├── init.js          # 数据库初始化脚本
│   └── db.js            # 数据库连接配置
├── routes/
│   ├── auth.js          # 认证相关路由
│   ├── dashboard.js     # 仪表板数据路由
│   ├── contracts.js     # 合同管理路由
│   ├── regulations.js   # 制度管理路由
│   ├── compliance.js    # 合规管理路由
│   ├── risks.js         # 风险管理路由
│   └── tasks.js         # 任务管理路由
├── public/
│   ├── css/
│   │   └── style.css    # 公共样式
│   ├── js/
│   │   └── common.js    # 公共JavaScript工具
│   ├── pages/
│   │   ├── dashboard.html    # 工作台页面
│   │   ├── contracts.html    # 合同管理页面
│   │   ├── regulations.html  # 制度管理页面
│   │   ├── compliance.html   # 合规管理页面
│   │   └── risks.html        # 风险管理页面
│   └── index.html       # 登录页面
├── server.js            # 主服务器文件
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/password` - 修改密码

### 仪表板接口
- `GET /api/dashboard/stats` - 获取统计数据
- `GET /api/dashboard/contract-trend` - 获取合同趋势
- `GET /api/dashboard/contract-distribution` - 获取合同分布
- `GET /api/dashboard/latest-tasks` - 获取最新任务
- `GET /api/dashboard/latest-regulations` - 获取最新制度

### 合同管理接口
- `GET /api/contracts` - 获取合同列表
- `GET /api/contracts/:id` - 获取单个合同
- `POST /api/contracts` - 创建合同
- `PUT /api/contracts/:id` - 更新合同
- `DELETE /api/contracts/:id` - 删除合同

### 制度管理接口
- `GET /api/regulations` - 获取制度列表
- `GET /api/regulations/:id` - 获取单个制度
- `POST /api/regulations` - 创建制度
- `PUT /api/regulations/:id` - 更新制度
- `DELETE /api/regulations/:id` - 删除制度

### 合规管理接口
- `GET /api/compliance` - 获取合规检查列表
- `GET /api/compliance/:id` - 获取单个合规检查
- `POST /api/compliance` - 创建合规检查
- `PUT /api/compliance/:id` - 更新合规检查
- `DELETE /api/compliance/:id` - 删除合规检查

### 风险管理接口
- `GET /api/risks` - 获取风险列表
- `GET /api/risks/:id` - 获取单个风险
- `POST /api/risks` - 创建风险
- `PUT /api/risks/:id` - 更新风险
- `DELETE /api/risks/:id` - 删除风险

### 任务管理接口
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取单个任务
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

## 数据库表结构

### users (用户表)
- id, username, password, real_name, department, role, email, phone, created_at, updated_at

### contracts (合同表)
- id, contract_no, title, type, party_a, party_b, amount, start_date, end_date, status, risk_level, created_by, created_at, updated_at

### regulations (制度表)
- id, title, category, version, effective_date, expiry_date, status, content, created_by, created_at, updated_at

### compliance_checks (合规检查表)
- id, title, type, description, check_date, result, status, assigned_to, created_by, created_at, updated_at

### risks (风险表)
- id, title, category, description, level, probability, impact, status, assigned_to, created_by, created_at, updated_at

### tasks (任务表)
- id, title, type, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at

## 注意事项

1. 首次运行前必须执行 `node database/init.js` 初始化数据库
2. 默认端口为 3000，可在 server.js 中修改
3. 生产环境请修改 JWT_SECRET 密钥
4. 建议在生产环境中使用环境变量管理配置

## 许可证

MIT
