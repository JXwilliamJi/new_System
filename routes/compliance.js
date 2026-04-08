const express = require('express');
const router = express.Router();
const db = require('../database/db');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('只支持Excel文件格式(.xlsx, .xls)'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 获取所有合规检查
router.get('/', (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    let whereClause = '';
    const params = [];

    if (type) {
      whereClause += ' WHERE cc.type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += whereClause ? ' AND cc.status = ?' : ' WHERE cc.status = ?';
      params.push(status);
    }

    const offset = (page - 1) * limit;

    const checks = db.prepare(`
      SELECT
        cc.*,
        u1.real_name as assigned_to_name,
        u2.real_name as created_by_name,
        u3.real_name as submit_user_name,
        u4.real_name as reviewer_name
      FROM compliance_checks cc
      LEFT JOIN users u1 ON cc.assigned_to = u1.id
      LEFT JOIN users u2 ON cc.created_by = u2.id
      LEFT JOIN users u3 ON cc.submit_user = u3.id
      LEFT JOIN users u4 ON cc.reviewer = u4.id
      ${whereClause}
      ORDER BY cc.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM compliance_checks cc ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        checks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          totalPages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取合规检查列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取合规检查统计数据
router.get('/stats/summary', (req, res) => {
  try {
    const { year } = req.query;
    
    // 构建年份筛选条件
    let yearCondition = '';
    let yearParams = [];
    if (year) {
      yearCondition = "strftime('%Y', check_date) = ?";
      yearParams = [year];
    }

    // 获取总数
    const totalResult = db.prepare(`SELECT COUNT(*) as total FROM compliance_checks${yearCondition ? ' WHERE ' + yearCondition : ''}`).get(...yearParams);
    const total = totalResult.total;

    // 按类型统计
    const typeStats = db.prepare(`
      SELECT
        type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ?, 2) as percentage
      FROM compliance_checks
      WHERE type IS NOT NULL AND type != '' ${yearCondition ? 'AND ' + yearCondition : ''}
      GROUP BY type
      ORDER BY count DESC
    `).all(total, ...yearParams);

    // 按部门统计
    const departmentStats = db.prepare(`
      SELECT
        submit_department as department,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ?, 2) as percentage
      FROM compliance_checks
      WHERE submit_department IS NOT NULL AND submit_department != '' ${yearCondition ? 'AND ' + yearCondition : ''}
      GROUP BY submit_department
      ORDER BY count DESC
    `).all(total, ...yearParams);

    // 按状态统计
    const statusStats = db.prepare(`
      SELECT
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ?, 2) as percentage
      FROM compliance_checks
      WHERE status IS NOT NULL AND status != '' ${yearCondition ? 'AND ' + yearCondition : ''}
      GROUP BY status
      ORDER BY count DESC
    `).all(total, ...yearParams);

    res.json({
      success: true,
      data: {
        total,
        typeStats,
        departmentStats,
        statusStats
      }
    });

  } catch (error) {
    console.error('获取合规检查统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个合规检查
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const check = db.prepare(`
      SELECT
        cc.*,
        u1.real_name as assigned_to_name,
        u2.real_name as created_by_name,
        u3.real_name as submit_user_name,
        u4.real_name as reviewer_name
      FROM compliance_checks cc
      LEFT JOIN users u1 ON cc.assigned_to = u1.id
      LEFT JOIN users u2 ON cc.created_by = u2.id
      LEFT JOIN users u3 ON cc.submit_user = u3.id
      LEFT JOIN users u4 ON cc.reviewer = u4.id
      WHERE cc.id = ?
    `).get(id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: '合规检查不存在'
      });
    }

    res.json({
      success: true,
      data: check
    });

  } catch (error) {
    console.error('获取合规检查详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建合规检查
router.post('/', (req, res) => {
  try {
    const { title, type, submit_department, submit_user, description, check_date, result: checkResult, status, assigned_to, reviewer, created_by } = req.body;

    if (!title || !type || !submit_department) {
      return res.status(400).json({
        success: false,
        message: '请填写检查标题、类型和提交部门'
      });
    }

    const insertResult = db.prepare(`
      INSERT INTO compliance_checks (title, type, submit_department, submit_user, description, check_date, result, status, assigned_to, reviewer, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, type, submit_department, submit_user, description, check_date, checkResult, status || 'pending', assigned_to, reviewer, created_by);

    res.json({
      success: true,
      message: '合规检查创建成功',
      data: {
        id: insertResult.lastInsertRowid,
        title,
        type
      }
    });

  } catch (error) {
    console.error('创建合规检查错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新合规检查
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, submit_department, submit_user, description, check_date, result, status, assigned_to, reviewer } = req.body;

    const existingCheck = db.prepare('SELECT id FROM compliance_checks WHERE id = ?').get(id);

    if (!existingCheck) {
      return res.status(404).json({
        success: false,
        message: '合规检查不存在'
      });
    }

    db.prepare(`
      UPDATE compliance_checks
      SET title = ?, type = ?, submit_department = ?, submit_user = ?, description = ?, check_date = ?, result = ?,
          status = ?, assigned_to = ?, reviewer = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, type, submit_department, submit_user, description, check_date, result, status, assigned_to, reviewer, id);

    res.json({
      success: true,
      message: '合规检查更新成功'
    });

  } catch (error) {
    console.error('更新合规检查错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除合规检查
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existingCheck = db.prepare('SELECT id FROM compliance_checks WHERE id = ?').get(id);

    if (!existingCheck) {
      return res.status(404).json({
        success: false,
        message: '合规检查不存在'
      });
    }

    db.prepare('DELETE FROM compliance_checks WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '合规检查删除成功'
    });

  } catch (error) {
    console.error('删除合规检查错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// Excel导入接口
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要导入的Excel文件'
      });
    }

    const filePath = req.file.path;
    
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    
    // 查找包含"合规审核"的sheet页
    let targetSheetName = null;
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.includes('合规审核')) {
        targetSheetName = sheetName;
        break;
      }
    }
    
    if (!targetSheetName) {
      // 清理上传的文件
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Excel文件中未找到包含"合规审核"字样的sheet页'
      });
    }
    
    // 获取sheet数据
    const worksheet = workbook.Sheets[targetSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!jsonData || jsonData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Excel文件中没有数据'
      });
    }
    
    // 查找有类型数据的行（作为数据起始行）
    let dataStartRow = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      // 检查是否有类型数据（假设类型在某一列）
      if (row && row.some(cell => cell && typeof cell === 'string' && cell.trim() !== '')) {
        // 检查是否是表头行（包含"类型"、"标题"等关键字）
        const rowStr = row.join(',');
        if (rowStr.includes('类型') || rowStr.includes('标题') || rowStr.includes('检查')) {
          dataStartRow = i + 1; // 数据从下一行开始
          break;
        }
      }
    }
    
    // 如果没找到表头，从第一行开始
    if (dataStartRow === -1) {
      dataStartRow = 0;
    }
    
    // 提取数据行（跳过空行）
    const dataRows = [];
    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      // 检查行是否有有效数据
      if (row && row.some(cell => cell && typeof cell === 'string' && cell.trim() !== '')) {
        dataRows.push(row);
      }
    }
    
    if (dataRows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: '未找到有效的数据行'
      });
    }
    
    // 获取用户信息
    const user = req.user || { id: 1 };
    
    // 解析并导入数据
    const importedData = [];
    const errors = [];
    
    // 假设Excel列顺序：标题、类型、提交部门、经办人、检查日期、检查结果、状态、审核人、复核人、描述
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      try {
        const title = row[0] ? String(row[0]).trim() : '';
        const type = row[1] ? String(row[1]).trim() : '';
        const submitDepartment = row[2] ? String(row[2]).trim() : '';
        const submitUser = row[3] ? String(row[3]).trim() : '';
        const checkDate = row[4] ? String(row[4]).trim() : '';
        const result = row[5] ? String(row[5]).trim() : '';
        const status = row[6] ? String(row[6]).trim() : 'pending';
        const assignedTo = row[7] ? String(row[7]).trim() : '';
        const reviewer = row[8] ? String(row[8]).trim() : '';
        const description = row[9] ? String(row[9]).trim() : '';
        
        // 验证必填字段
        if (!title || !type) {
          errors.push(`第${i + dataStartRow + 1}行：标题和类型不能为空`);
          continue;
        }
        
        // 查找用户ID
        let submitUserId = null;
        let assignedToId = null;
        let reviewerId = null;
        
        if (submitUser) {
          const submitUserRecord = db.prepare('SELECT id FROM users WHERE real_name = ?').get(submitUser);
          if (submitUserRecord) {
            submitUserId = submitUserRecord.id;
          }
        }
        
        if (assignedTo) {
          const assignedToRecord = db.prepare('SELECT id FROM users WHERE real_name = ?').get(assignedTo);
          if (assignedToRecord) {
            assignedToId = assignedToRecord.id;
          }
        }
        
        if (reviewer) {
          const reviewerRecord = db.prepare('SELECT id FROM users WHERE real_name = ?').get(reviewer);
          if (reviewerRecord) {
            reviewerId = reviewerRecord.id;
          }
        }
        
        // 插入数据
        const insertResult = db.prepare(`
          INSERT INTO compliance_checks (title, type, submit_department, submit_user, description, check_date, result, status, assigned_to, reviewer, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(title, type, submitDepartment || null, submitUserId, description || null, checkDate || null, result || null, status || 'pending', assignedToId, reviewerId, user.id);
        
        importedData.push({
          id: insertResult.lastInsertRowid,
          title,
          type
        });
        
      } catch (error) {
        errors.push(`第${i + dataStartRow + 1}行：${error.message}`);
      }
    }
    
    // 清理上传的文件
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `成功导入 ${importedData.length} 条合规检查数据`,
      data: {
        imported: importedData,
        errors: errors,
        total: dataRows.length,
        successCount: importedData.length,
        errorCount: errors.length
      }
    });
    
  } catch (error) {
    console.error('Excel导入错误:', error);
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

module.exports = router;
