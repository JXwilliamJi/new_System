const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// 获取本机IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// 初始化数据库
require('./database/init');

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 根路由
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '法务合规管理平台 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      contracts: '/api/contracts',
      regulations: '/api/regulations',
      compliance: '/api/compliance',
      risks: '/api/risks',
      department_work: '/api/department_work',
      dashboard: '/api/dashboard',
      admin: '/api/admin'
    }
  });
});

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/regulations', require('./routes/regulations'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/risks', require('./routes/risks'));
app.use('/api/department_work', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 页面路由
app.get('/pages/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', req.params.page));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌无效或已过期，请重新登录'
    });
  }
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

app.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log(`🚀 法务合规管理平台服务器已启动`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 局域网访问: http://${localIP}:${PORT}`);
  console.log(`📊 API 文档: http://${localIP}:${PORT}/api`);
  console.log(`📋 API 列表: http://${localIP}:${PORT}/api`);
});

module.exports = app;
