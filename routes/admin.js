const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 获取所有模块配置
router.get('/modules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const modules = db.prepare('SELECT * FROM module_config ORDER BY sort_order').all();
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('获取模块配置错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新模块可见性
router.put('/modules/:id/visibility', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { is_visible } = req.body;
    
    db.prepare('UPDATE module_config SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(is_visible ? 1 : 0, id);
    
    res.json({ success: true, message: '模块可见性更新成功' });
  } catch (error) {
    console.error('更新模块可见性错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新模块排序
router.put('/modules/:id/sort', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { sort_order } = req.body;
    
    db.prepare('UPDATE module_config SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sort_order, id);
    
    res.json({ success: true, message: '模块排序更新成功' });
  } catch (error) {
    console.error('更新模块排序错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 批量更新模块配置
router.put('/modules/batch', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { modules } = req.body;
    
    const updateStmt = db.prepare('UPDATE module_config SET is_visible = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    const updateMany = db.transaction((modules) => {
      for (const module of modules) {
        updateStmt.run(module.is_visible ? 1 : 0, module.sort_order, module.id);
      }
    });
    
    updateMany(modules);
    
    res.json({ success: true, message: '模块配置批量更新成功' });
  } catch (error) {
    console.error('批量更新模块配置错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取平台统计信息
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts').get().count;
    const regulationCount = db.prepare('SELECT COUNT(*) as count FROM regulations').get().count;
    const complianceCount = db.prepare('SELECT COUNT(*) as count FROM compliance_checks').get().count;
    const riskCount = db.prepare('SELECT COUNT(*) as count FROM risks').get().count;
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM department_work').get().count;
    
    res.json({
      success: true,
      data: {
        users: userCount,
        contracts: contractCount,
        regulations: regulationCount,
        compliance: complianceCount,
        risks: riskCount,
        tasks: taskCount
      }
    });
  } catch (error) {
    console.error('获取平台统计错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取所有用户
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, real_name, department, role, email, phone, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 创建用户
router.post('/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { username, password, real_name, department, role, email, phone } = req.body;
    
    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    
    const result = db.prepare(`
      INSERT INTO users (username, password, real_name, department, role, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, real_name, department, role || 'user', email, phone);
    
    res.json({ success: true, message: '用户创建成功', userId: result.lastInsertRowid });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新用户
router.put('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { real_name, department, role, email, phone } = req.body;
    
    db.prepare(`
      UPDATE users SET real_name = ?, department = ?, role = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(real_name, department, role, email, phone, id);
    
    res.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 重置用户密码
router.put('/users/:id/reset-password', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, id);
    
    res.json({ success: true, message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除用户
router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // 不能删除自己
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: '不能删除自己的账号' });
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取平台日志（最近100条）
router.get('/logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    // 这里可以扩展为真正的日志平台
    // 目前返回一些模拟数据
    const logs = [
      { id: 1, action: '用户登录', user: 'admin', time: new Date().toISOString(), ip: '127.0.0.1' },
      { id: 2, action: '创建合同', user: 'admin', time: new Date().toISOString(), ip: '127.0.0.1' },
      { id: 3, action: '更新模块配置', user: 'admin', time: new Date().toISOString(), ip: '127.0.0.1' }
    ];
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('获取平台日志错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 合规类型配置 ====================

// 获取所有合规类型
router.get('/compliance-types', authenticateToken, requireAdmin, (req, res) => {
  try {
    const types = db.prepare('SELECT * FROM compliance_types ORDER BY sort_order, id').all();
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('获取合规类型错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加合规类型
router.post('/compliance-types', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '类型名称不能为空' });
    }
    
    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM compliance_types WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ success: false, message: '该类型已存在' });
    }
    
    const result = db.prepare(
      'INSERT INTO compliance_types (name, sort_order) VALUES (?, ?)'
    ).run(name, sort_order || 0);
    
    res.json({ success: true, message: '合规类型添加成功', id: result.lastInsertRowid });
  } catch (error) {
    console.error('添加合规类型错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新合规类型
router.put('/compliance-types/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, is_active, update_archived } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '类型名称不能为空' });
    }
    
    // 获取旧名称
    const oldType = db.prepare('SELECT name FROM compliance_types WHERE id = ?').get(id);
    if (!oldType) {
      return res.status(404).json({ success: false, message: '类型不存在' });
    }
    
    // 检查新名称是否与其他类型重复
    const duplicate = db.prepare('SELECT id FROM compliance_types WHERE name = ? AND id != ?').get(name, id);
    if (duplicate) {
      return res.status(400).json({ success: false, message: '该类型名称已存在' });
    }
    
    // 更新类型配置
    db.prepare(
      'UPDATE compliance_types SET name = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : 1, id);
    
    // 如果名称发生变化且用户选择同步更新已归档项
    if (oldType.name !== name && update_archived === true) {
      db.prepare('UPDATE compliance_checks SET type = ? WHERE type = ?').run(name, oldType.name);
      res.json({ success: true, message: '合规类型更新成功，已同步更新所有已归档项' });
    } else {
      res.json({ success: true, message: '合规类型更新成功，仅新保存的项使用新名称' });
    }
  } catch (error) {
    console.error('更新合规类型错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除合规类型
router.delete('/compliance-types/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有合规检查使用该类型
    const type = db.prepare('SELECT name FROM compliance_types WHERE id = ?').get(id);
    if (!type) {
      return res.status(404).json({ success: false, message: '类型不存在' });
    }
    
    const usageCount = db.prepare('SELECT COUNT(*) as count FROM compliance_checks WHERE type = ?').get(type.name);
    if (usageCount.count > 0) {
      return res.status(400).json({ success: false, message: `该类型已被 ${usageCount.count} 个合规检查使用，无法删除` });
    }
    
    db.prepare('DELETE FROM compliance_types WHERE id = ?').run(id);
    res.json({ success: true, message: '合规类型删除成功' });
  } catch (error) {
    console.error('删除合规类型错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 部门配置 ====================

// 获取所有部门
router.get('/departments', authenticateToken, requireAdmin, (req, res) => {
  try {
    const departments = db.prepare('SELECT * FROM departments ORDER BY sort_order, id').all();
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('获取部门列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 添加部门
router.post('/departments', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '部门名称不能为空' });
    }
    
    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM departments WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ success: false, message: '该部门已存在' });
    }
    
    const result = db.prepare(
      'INSERT INTO departments (name, sort_order) VALUES (?, ?)'
    ).run(name, sort_order || 0);
    
    res.json({ success: true, message: '部门添加成功', id: result.lastInsertRowid });
  } catch (error) {
    console.error('添加部门错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新部门
router.put('/departments/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, is_active, update_archived } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '部门名称不能为空' });
    }
    
    // 获取旧名称
    const oldDept = db.prepare('SELECT name FROM departments WHERE id = ?').get(id);
    if (!oldDept) {
      return res.status(404).json({ success: false, message: '部门不存在' });
    }
    
    // 检查新名称是否与其他部门重复
    const duplicate = db.prepare('SELECT id FROM departments WHERE name = ? AND id != ?').get(name, id);
    if (duplicate) {
      return res.status(400).json({ success: false, message: '该部门名称已存在' });
    }
    
    // 更新部门配置
    db.prepare(
      'UPDATE departments SET name = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : 1, id);
    
    // 如果名称发生变化且用户选择同步更新已归档项
    if (oldDept.name !== name && update_archived === true) {
      db.prepare('UPDATE compliance_checks SET submit_department = ? WHERE submit_department = ?').run(name, oldDept.name);
      res.json({ success: true, message: '部门更新成功，已同步更新所有已归档项' });
    } else {
      res.json({ success: true, message: '部门更新成功，仅新保存的项使用新部门' });
    }
  } catch (error) {
    console.error('更新部门错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除部门
router.delete('/departments/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有合规检查使用该部门
    const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: '部门不存在' });
    }
    
    const usageCount = db.prepare('SELECT COUNT(*) as count FROM compliance_checks WHERE submit_department = ?').get(dept.name);
    if (usageCount.count > 0) {
      return res.status(400).json({ success: false, message: `该部门已被 ${usageCount.count} 个合规检查使用，无法删除` });
    }
    
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    res.json({ success: true, message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
