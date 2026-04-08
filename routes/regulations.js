const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 获取所有制度
router.get('/', (req, res) => {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;
    let whereClause = '';
    const params = [];

    if (category) {
      whereClause += ' WHERE r.category = ?';
      params.push(category);
    }

    if (status) {
      whereClause += whereClause ? ' AND r.status = ?' : ' WHERE r.status = ?';
      params.push(status);
    }

    const offset = (page - 1) * limit;

    const regulations = db.prepare(`
      SELECT 
        r.*,
        u.real_name as created_by_name
      FROM regulations r
      LEFT JOIN users u ON r.created_by = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM regulations r ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        regulations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          totalPages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取制度列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个制度
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const regulation = db.prepare(`
      SELECT 
        r.*,
        u.real_name as created_by_name
      FROM regulations r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `).get(id);

    if (!regulation) {
      return res.status(404).json({
        success: false,
        message: '制度不存在'
      });
    }

    res.json({
      success: true,
      data: regulation
    });

  } catch (error) {
    console.error('获取制度详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建制度
router.post('/', (req, res) => {
  try {
    const { title, category, version, effective_date, expiry_date, status, content, created_by } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: '请填写制度标题和分类'
      });
    }

    const result = db.prepare(`
      INSERT INTO regulations (title, category, version, effective_date, expiry_date, status, content, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, category, version, effective_date, expiry_date, status || 'active', content, created_by);

    res.json({
      success: true,
      message: '制度创建成功',
      data: {
        id: result.lastInsertRowid,
        title,
        category
      }
    });

  } catch (error) {
    console.error('创建制度错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新制度
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, version, effective_date, expiry_date, status, content } = req.body;

    const existingRegulation = db.prepare('SELECT id FROM regulations WHERE id = ?').get(id);

    if (!existingRegulation) {
      return res.status(404).json({
        success: false,
        message: '制度不存在'
      });
    }

    db.prepare(`
      UPDATE regulations 
      SET title = ?, category = ?, version = ?, effective_date = ?, expiry_date = ?, 
          status = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, category, version, effective_date, expiry_date, status, content, id);

    res.json({
      success: true,
      message: '制度更新成功'
    });

  } catch (error) {
    console.error('更新制度错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除制度
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existingRegulation = db.prepare('SELECT id FROM regulations WHERE id = ?').get(id);

    if (!existingRegulation) {
      return res.status(404).json({
        success: false,
        message: '制度不存在'
      });
    }

    db.prepare('DELETE FROM regulations WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '制度删除成功'
    });

  } catch (error) {
    console.error('删除制度错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
