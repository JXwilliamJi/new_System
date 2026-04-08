const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 获取所有风险事项
router.get('/', (req, res) => {
  try {
    const { level, status, page = 1, limit = 10 } = req.query;
    let whereClause = '';
    const params = [];

    if (level) {
      whereClause += ' WHERE r.level = ?';
      params.push(level);
    }

    if (status) {
      whereClause += whereClause ? ' AND r.status = ?' : ' WHERE r.status = ?';
      params.push(status);
    }

    const offset = (page - 1) * limit;

    const risks = db.prepare(`
      SELECT 
        r.*,
        u1.real_name as assigned_to_name,
        u2.real_name as created_by_name
      FROM risks r
      LEFT JOIN users u1 ON r.assigned_to = u1.id
      LEFT JOIN users u2 ON r.created_by = u2.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM risks r ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        risks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          totalPages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取风险列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个风险事项
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const risk = db.prepare(`
      SELECT 
        r.*,
        u1.real_name as assigned_to_name,
        u2.real_name as created_by_name
      FROM risks r
      LEFT JOIN users u1 ON r.assigned_to = u1.id
      LEFT JOIN users u2 ON r.created_by = u2.id
      WHERE r.id = ?
    `).get(id);

    if (!risk) {
      return res.status(404).json({
        success: false,
        message: '风险事项不存在'
      });
    }

    res.json({
      success: true,
      data: risk
    });

  } catch (error) {
    console.error('获取风险详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建风险事项
router.post('/', (req, res) => {
  try {
    const { title, category, description, level, probability, impact, status, assigned_to, created_by } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: '请填写风险标题和分类'
      });
    }

    const result = db.prepare(`
      INSERT INTO risks (title, category, description, level, probability, impact, status, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, category, description, level || 'medium', probability, impact, status || 'open', assigned_to, created_by);

    res.json({
      success: true,
      message: '风险事项创建成功',
      data: {
        id: result.lastInsertRowid,
        title,
        category
      }
    });

  } catch (error) {
    console.error('创建风险事项错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新风险事项
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, level, probability, impact, status, assigned_to } = req.body;

    const existingRisk = db.prepare('SELECT id FROM risks WHERE id = ?').get(id);

    if (!existingRisk) {
      return res.status(404).json({
        success: false,
        message: '风险事项不存在'
      });
    }

    db.prepare(`
      UPDATE risks 
      SET title = ?, category = ?, description = ?, level = ?, probability = ?, 
          impact = ?, status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, category, description, level, probability, impact, status, assigned_to, id);

    res.json({
      success: true,
      message: '风险事项更新成功'
    });

  } catch (error) {
    console.error('更新风险事项错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除风险事项
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existingRisk = db.prepare('SELECT id FROM risks WHERE id = ?').get(id);

    if (!existingRisk) {
      return res.status(404).json({
        success: false,
        message: '风险事项不存在'
      });
    }

    db.prepare('DELETE FROM risks WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '风险事项删除成功'
    });

  } catch (error) {
    console.error('删除风险事项错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
