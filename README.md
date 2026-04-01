# 法务合规管理系统

一个基于 Node.js + SQLite 的企业法务合规管理系统，包含合同管理、制度管理、合规管理、风险管理四大模块。

## 功能特性

### 📱 移动端响应式适配
- **响应式布局** - 自适应手机、平板、桌面设备
- **移动端导航** - 汉堡菜单、滑动关闭、遮罩层
- **触摸优化** - 最小44px触摸区域、点击反馈
- **表格优化** - 水平滚动、操作按钮自适应
- **表单优化** - 16px字体防止iOS缩放、全宽输入框
- **模态框优化** - 自适应大小、全宽按钮
- **安全区域适配** - 支持iPhone X及以上刘海屏
- **性能优化** - 减少动画、延迟加载
- **无障碍优化** - 足够对比度、清晰焦点样式

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
- **Excel导入功能** - 支持从Excel文件批量导入合规检查数据

### ⚠️ 风险管理
- 风险事项列表
- 新增/编辑/删除风险
- 风险等级评估
- 发生概率和影响程度分析
- 风险状态跟踪

### ⚙️ 后台管理
- 合规类型配置 - 自定义合规检查类型
- 部门配置 - 管理组织部门
- 用户管理 - 系统用户管理

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **前端**: 原生 HTML/CSS/JavaScript
- **图表**: Chart.js
- **图标**: Font Awesome
- **Excel解析**: xlsx
- **文件上传**: multer

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

## Excel导入功能

### 功能特性

#### 1. 智能Sheet页识别
- 自动查找包含"合规审核"字样的Sheet页
- 如果找不到对应Sheet页，会提示用户

#### 2. 智能数据扫描
- 自动识别表头行（包含"类型"、"标题"、"检查"等关键字）
- 从有类型数据的行开始扫描
- 自动跳过空行和不相关的行

#### 3. 数据验证
- 必填字段验证（标题、类型）
- 用户信息自动匹配（经办人、审核人、复核人）
- 文件格式和大小验证

#### 4. 导入反馈
- 实时进度显示
- 详细的导入结果统计
- 错误详情展示

### Excel格式要求

#### Sheet页要求
- 必须包含"合规审核"字样的Sheet页名称
- 例如："合规审核数据"、"合规审核表"、"合规审核"等

#### 数据列顺序
| 列号 | 列名 | 是否必填 | 说明 |
|------|------|----------|------|
| 1 | 标题 | ✅ 是 | 合规检查标题 |
| 2 | 类型 | ✅ 是 | 合规检查类型 |
| 3 | 提交部门 | 否 | 提交部门名称 |
| 4 | 经办人 | 否 | 经办人姓名 |
| 5 | 检查日期 | 否 | 日期格式：YYYY-MM-DD |
| 6 | 检查结果 | 否 | 检查结果描述 |
| 7 | 状态 | 否 | pending/completed/failed |
| 8 | 审核人 | 否 | 审核人姓名 |
| 9 | 复核人 | 否 | 复核人姓名 |
| 10 | 描述 | 否 | 检查描述 |

### 使用导入功能

1. 登录系统（admin / admin123）
2. 进入合规管理模块
3. 点击"导入Excel"按钮
4. 选择Excel文件
5. 点击"开始导入"
6. 查看导入结果

### 生成测试文件

```bash
npm run test:import:api
```

这将生成 `test_compliance.xlsx` 测试文件。

## 后台管理功能

### 合规类型配置
- 默认类型：合同审查、项目采购、制度审查、合法性审查、法律服务
- 支持添加、编辑、删除合规类型
- 支持设置排序和启用/禁用状态
- 编辑类型时可选择是否同步更新已归档的项

### 部门配置
- 默认部门：办公室、科技一部、科技二部、业务一部、业务二部
- 支持添加、编辑、删除部门
- 支持设置排序和启用/禁用状态
- 编辑部门时可选择是否同步更新已归档的项

### 使用方法
1. 登录后台管理页面
2. 点击左侧菜单"合规类型"或"部门配置"
3. 进行相应的添加、编辑、删除操作

## 项目结构

```
legal-compliance-system/
├── database/
│   ├── init.js          # 数据库初始化脚本
│   ├── db.js            # 数据库连接配置
│   ├── migrate_compliance.js  # 合规模块数据库迁移
│   └── migrate_contracts.js   # 合同模块数据库迁移
├── routes/
│   ├── auth.js          # 认证相关路由
│   ├── dashboard.js     # 仪表板数据路由
│   ├── contracts.js     # 合同管理路由
│   ├── regulations.js   # 制度管理路由
│   ├── compliance.js    # 合规管理路由（含Excel导入）
│   ├── risks.js         # 风险管理路由
│   ├── tasks.js         # 任务管理路由
│   └── admin.js         # 后台管理路由
├── public/
│   ├── css/
│   │   ├── style.css    # 公共样式
│   │   └── mobile-responsive.css  # 移动端响应式样式
│   ├── js/
│   │   ├── common.js    # 公共JavaScript工具
│   │   └── mobile-menu.js  # 移动端菜单控制脚本
│   ├── pages/
│   │   ├── dashboard.html    # 工作台页面
│   │   ├── contracts.html    # 合同管理页面
│   │   ├── regulations.html  # 制度管理页面
│   │   ├── compliance.html   # 合规管理页面（含导入功能）
│   │   ├── risks.html        # 风险管理页面
│   │   ├── department_work.html  # 部门工作页面
│   │   └── admin.html        # 后台管理页面
│   ├── templates/
│   │   └── compliance_import_template.xlsx  # 合规导入模板
│   ├── test-mobile.html  # 移动端适配测试页面
│   └── index.html       # 登录页面
├── uploads/              # 文件上传目录
├── server.js            # 主服务器文件
├── package.json         # 项目配置
├── README.md           # 项目说明
└── MOBILE_RESPONSIVE_GUIDE.md  # 移动端适配指南
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
- `POST /api/compliance/import` - 导入Excel文件中的合规检查数据

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

### 后台管理接口
- `GET /api/admin/compliance-types` - 获取合规类型列表
- `POST /api/admin/compliance-types` - 创建合规类型
- `PUT /api/admin/compliance-types/:id` - 更新合规类型
- `DELETE /api/admin/compliance-types/:id` - 删除合规类型
- `GET /api/admin/departments` - 获取部门列表
- `POST /api/admin/departments` - 创建部门
- `PUT /api/admin/departments/:id` - 更新部门
- `DELETE /api/admin/departments/:id` - 删除部门

## 数据库表结构

### users (用户表)
- id, username, password, real_name, department, role, email, phone, created_at, updated_at

### contracts (合同表)
- id, contract_no, title, type, party_a, party_b, amount, start_date, end_date, status, risk_level, created_by, created_at, updated_at

### regulations (制度表)
- id, title, category, version, effective_date, expiry_date, status, content, created_by, created_at, updated_at

### compliance_checks (合规检查表)
- id, title, type, description, check_date, result, status, assigned_to, submit_department, submit_user, created_by, created_at, updated_at

### risks (风险表)
- id, title, category, description, level, probability, impact, status, assigned_to, created_by, created_at, updated_at

### tasks (任务表)
- id, title, type, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at

### compliance_types (合规类型配置表)
- id, name, sort_order, is_active, created_at, updated_at

### departments (部门配置表)
- id, name, sort_order, is_active, created_at, updated_at

## 注意事项

1. 首次运行前必须执行 `node database/init.js` 初始化数据库
2. 默认端口为 3000，可在 server.js 中修改
3. 生产环境请修改 JWT_SECRET 密钥
4. 建议在生产环境中使用环境变量管理配置
5. Excel导入功能支持 .xlsx 和 .xls 格式，文件大小限制10MB
6. 删除类型或部门时，如果已被合规检查使用，系统会阻止删除并提示

## 更新日志

### v1.2 (2026-04-01)
- ✅ 新增移动端响应式适配功能
- ✅ 创建移动端响应式CSS文件 (mobile-responsive.css)
- ✅ 创建移动端菜单控制脚本 (mobile-menu.js)
- ✅ 更新所有HTML文件，添加移动端支持
- ✅ 优化移动端导航菜单（汉堡菜单、滑动关闭）
- ✅ 优化移动端表格显示（水平滚动、操作按钮自适应）
- ✅ 优化移动端表单输入（16px字体、全宽输入框）
- ✅ 优化移动端模态框（自适应大小、全宽按钮）
- ✅ 添加触摸优化（最小44px触摸区域、点击反馈）
- ✅ 添加安全区域适配（支持iPhone X及以上刘海屏）
- ✅ 添加性能优化（减少动画、延迟加载）
- ✅ 添加无障碍优化（足够对比度、清晰焦点样式）
- ✅ 创建移动端适配测试页面 (test-mobile.html)
- ✅ 创建移动端适配指南文档 (MOBILE_RESPONSIVE_GUIDE.md)

### v1.1 (2026-03-30)
- ✅ 新增合规管理模块Excel导入功能
- ✅ 支持从"合规审核"sheet页导入数据
- ✅ 自动跳过不相关的行
- ✅ 从有类型数据的行开始扫描
- ✅ 实时进度显示
- ✅ 详细的导入结果统计
- ✅ 错误详情展示
- ✅ 用户信息自动匹配
- ✅ 数据验证和错误处理

### v1.0 (2026-03-25)
- ✅ 初始版本发布
- ✅ 用户认证功能
- ✅ 合同管理模块
- ✅ 制度管理模块
- ✅ 合规管理模块
- ✅ 风险管理模块
- ✅ 工作台仪表板
- ✅ 任务管理功能

## 许可证

MIT
