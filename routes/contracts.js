const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 获取所有合同
router.get('/', (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    let whereClause = '';
    const params = [];

    if (status) {
      whereClause += ' WHERE c.status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += whereClause ? ' AND c.type = ?' : ' WHERE c.type = ?';
      params.push(type);
    }

    const offset = (page - 1) * limit;

    const contracts = db.prepare(`
      SELECT 
        c.*,
        u.real_name as created_by_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM contracts c ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        contracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          totalPages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取合同列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个合同
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const contract = db.prepare(`
      SELECT 
        c.*,
        u.real_name as created_by_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      });
    }

    res.json({
      success: true,
      data: contract
    });

  } catch (error) {
    console.error('获取合同详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建合同
router.post('/', (req, res) => {
  try {
    const { 
      contract_no, 
      title, 
      type, 
      party_a, 
      party_b, 
      amount, 
      start_date, 
      end_date, 
      status, 
      risk_level,
      created_by 
    } = req.body;

    if (!contract_no || !title || !type) {
      return res.status(400).json({
        success: false,
        message: '请填写合同编号、标题和类型'
      });
    }

    const result = db.prepare(`
      INSERT INTO contracts (contract_no, title, type, party_a, party_b, amount, start_date, end_date, status, risk_level, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(contract_no, title, type, party_a, party_b, amount, start_date, end_date, status || 'pending', risk_level || 'low', created_by);

    res.json({
      success: true,
      message: '合同创建成功',
      data: {
        id: result.lastInsertRowid,
        contract_no,
        title,
        type
      }
    });

  } catch (error) {
    console.error('创建合同错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新合同
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      contract_no, 
      title, 
      type, 
      party_a, 
      party_b, 
      amount, 
      start_date, 
      end_date, 
      status, 
      risk_level 
    } = req.body;

    const existingContract = db.prepare('SELECT id FROM contracts WHERE id = ?').get(id);

    if (!existingContract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      });
    }

    db.prepare(`
      UPDATE contracts 
      SET contract_no = ?, title = ?, type = ?, party_a = ?, party_b = ?, 
          amount = ?, start_date = ?, end_date = ?, status = ?, risk_level = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(contract_no, title, type, party_a, party_b, amount, start_date, end_date, status, risk_level, id);

    res.json({
      success: true,
      message: '合同更新成功'
    });

  } catch (error) {
    console.error('更新合同错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除合同
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existingContract = db.prepare('SELECT id FROM contracts WHERE id = ?').get(id);

    if (!existingContract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      });
    }

    db.prepare('DELETE FROM contracts WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '合同删除成功'
    });

  } catch (error) {
    console.error('删除合同错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
