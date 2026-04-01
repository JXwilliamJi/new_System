const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'legal-compliance-secret-key-2026';

// 用户登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      });
    }

    // 查询用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    // 验证密码
    const isValidPassword = bcrypt.compareSync(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 用户注册
router.post('/register', (req, res) => {
  try {
    const { username, password, real_name, department, email } = req.body;

    if (!username || !password || !real_name || !department) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 加密密码
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // 插入新用户
    const result = db.prepare(`
      INSERT INTO users (username, password, real_name, department, email)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, hashedPassword, real_name, department, email || null);

    res.json({
      success: true,
      message: '注册成功',
      data: {
        id: result.lastInsertRowid,
        username,
        real_name,
        department
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取当前用户信息
router.get('/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }
});

// 修改密码
router.put('/password', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { oldPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证旧密码
    const isValidPassword = bcrypt.compareSync(oldPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '原密码错误'
      });
    }

    // 加密新密码
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // 更新密码
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hashedPassword, user.id);

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取模块配置（根据用户角色返回不同模块）
router.get('/modules', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 获取用户信息
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(decoded.id);
    
    // 获取可见的模块配置
    let modules = db.prepare('SELECT module_key, module_name, sort_order FROM module_config WHERE is_visible = 1 ORDER BY sort_order').all();
    
    // 如果不是管理员，隐藏后台管理模块
    if (user && user.role !== 'admin') {
      modules = modules.filter(module => module.module_key !== 'admin');
    }
    
    res.json({
      success: true,
      data: modules
    });

  } catch (error) {
    console.error('获取模块配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
