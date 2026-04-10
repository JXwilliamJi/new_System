const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

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

// Excel列名映射（支持多种可能的列名格式）
const columnMapping = {
  agent: ['经办人'],
  agent_department: ['经办部门', '经办人部门'],
  status: ['合同状态', '状态'],
  contract_stage: ['合同当前阶段', '当前阶段', '阶段'],
  procurement_name: ['采购名称', '采购项目名称'],
  contract_category: ['合同分类', '分类'],
  title: ['合同名称', '名称'],
  contract_no: ['合同编号', '编号'],
  start_date: ['合同起始日', '起始日', '开始日期'],
  end_date: ['合同到期日', '到期日', '结束日期'],
  amount: ['合同总金额', '总金额', '金额'],
  budget_amount: ['采购申请总体预算金额', '预算金额', '总体预算金额'],
  signed_amount: ['已签订合同金额', '已签金额'],
  acceptance_deadline: ['验收截止日期', '验收日期'],
  warranty_period: ['维保期', '质保期', '维保/质保期'],
  contract_content: ['合同标的内容', '标的', '合同内容'],
  signed_date: ['合同签署日期', '签署日期'],
  submit_leader: ['呈报领导', '领导'],
  submission_completed_date: ['合同请示完成日期', '请示完成日期']
};

// 履行情况Excel列名映射
const performanceColumnMapping = {
  doc_no: ['单据编号', '单据号', '编号'],
  contract_no: ['合同编号', '合同号']
};

// 查找列索引
function findColumnIndex(headers, fieldNames) {
  for (const fieldName of fieldNames) {
    const index = headers.findIndex(h => h && h.toString().trim().includes(fieldName));
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

// 解析表头行，返回字段名到列索引的映射
function parseHeaders(headerRow, mapping = columnMapping) {
  const headers = headerRow.map(h => h ? h.toString().trim() : '');
  const fieldIndexMap = {};
  
  for (const [fieldName, possibleNames] of Object.entries(mapping)) {
    const index = findColumnIndex(headers, possibleNames);
    if (index !== -1) {
      fieldIndexMap[fieldName] = index;
    }
  }
  
  return fieldIndexMap;
}

// 计算履行情况等级
function calculatePerformanceGrade(actualCount, expectedCount) {
  const diff = expectedCount - actualCount;
  
  if (actualCount === 0 || diff >= 20) {
    return '差';
  } else if (diff >= 10) {
    return '中';
  } else if (diff >= 3) {
    return '良';
  } else {
    return '优';
  }
}

// 获取所有合同
router.get('/', (req, res) => {
  try {
    const { status, type, stage, search, page = 1, limit = 20 } = req.query;
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

    if (stage) {
      whereClause += whereClause ? ' AND c.contract_stage = ?' : ' WHERE c.contract_stage = ?';
      params.push(stage);
    }

    if (search) {
      whereClause += whereClause ? ' AND (c.title LIKE ? OR c.contract_no LIKE ?)' : ' WHERE (c.title LIKE ? OR c.contract_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
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

    // 获取履行情况统计数据
    const performanceStats = db.prepare(`
      SELECT 
        contract_no,
        COUNT(DISTINCT doc_no) as report_count,
        MIN(report_date) as first_report_date,
        MAX(report_date) as last_report_date
      FROM contract_performance_reports
      GROUP BY contract_no
    `).all();

    // 创建履行情况映射
    const performanceMap = {};
    performanceStats.forEach(stat => {
      performanceMap[stat.contract_no] = stat;
    });

    // 计算每个合同的履行情况等级
    const today = new Date();
    contracts.forEach(contract => {
      if (contract.contract_stage === '履行中') {
        const stats = performanceMap[contract.contract_no];
        if (stats && contract.start_date) {
          const startDate = new Date(contract.start_date);
          const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                            (today.getMonth() - startDate.getMonth()) + 1;
          const expectedReports = Math.max(1, monthsDiff);
          const actualReports = stats.report_count || 0;
          contract.performance_grade = calculatePerformanceGrade(actualReports, expectedReports);
          contract.report_count = actualReports;
          contract.expected_reports = expectedReports;
        } else {
          contract.performance_grade = '差';
          contract.report_count = 0;
          const startDate = contract.start_date ? new Date(contract.start_date) : today;
          const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                            (today.getMonth() - startDate.getMonth()) + 1;
          contract.expected_reports = Math.max(1, monthsDiff);
        }
      }
    });

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
      contract_no, title, type, party_a, party_b, amount, start_date, end_date, 
      status, risk_level, created_by, agent, agent_department, contract_stage,
      contract_category, procurement_name, budget_amount, signed_amount,
      acceptance_deadline, warranty_period, contract_content, signed_date,
      submit_leader, submission_completed_date
    } = req.body;

    if (!contract_no || !title || !type) {
      return res.status(400).json({
        success: false,
        message: '请填写合同编号、标题和类型'
      });
    }

    const result = db.prepare(`
      INSERT INTO contracts (
        contract_no, title, type, party_a, party_b, amount, start_date, end_date, 
        status, risk_level, created_by, agent, agent_department, contract_stage,
        contract_category, procurement_name, budget_amount, signed_amount,
        acceptance_deadline, warranty_period, contract_content, signed_date,
        submit_leader, submission_completed_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contract_no, title, type, party_a, party_b, amount, start_date, end_date, 
      status || '正常', risk_level || 'low', created_by, agent, agent_department,
      contract_stage, contract_category, procurement_name, budget_amount, signed_amount,
      acceptance_deadline, warranty_period, contract_content, signed_date,
      submit_leader, submission_completed_date
    );

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
      contract_no, title, type, party_a, party_b, amount, start_date, end_date, 
      status, risk_level, agent, agent_department, contract_stage, contract_category,
      procurement_name, budget_amount, signed_amount, acceptance_deadline, warranty_period,
      contract_content, signed_date, submit_leader, submission_completed_date
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
          agent = ?, agent_department = ?, contract_stage = ?, contract_category = ?,
          procurement_name = ?, budget_amount = ?, signed_amount = ?,
          acceptance_deadline = ?, warranty_period = ?, contract_content = ?,
          signed_date = ?, submit_leader = ?, submission_completed_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      contract_no, title, type, party_a, party_b, amount, start_date, end_date, 
      status, risk_level, agent, agent_department, contract_stage, contract_category,
      procurement_name, budget_amount, signed_amount, acceptance_deadline, warranty_period,
      contract_content, signed_date, submit_leader, submission_completed_date, id
    );

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

// Excel导入接口 - 合同数据
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要导入的Excel文件'
      });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    
    let targetSheetName = workbook.SheetNames[0];
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.includes('合同') || sheetName.includes('Contract')) {
        targetSheetName = sheetName;
        break;
      }
    }
    
    const worksheet = workbook.Sheets[targetSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (!jsonData || jsonData.length < 2) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Excel文件中没有数据或数据不足'
      });
    }
    
    let headerRowIndex = -1;
    let fieldIndexMap = {};
    
    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
      const row = jsonData[i];
      const testMap = parseHeaders(row, columnMapping);
      if (Object.keys(testMap).length >= 5) {
        headerRowIndex = i;
        fieldIndexMap = testMap;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: '无法识别Excel表头'
      });
    }
    
    const dataRows = [];
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const contractNo = fieldIndexMap.contract_no !== undefined ? row[fieldIndexMap.contract_no] : null;
      const title = fieldIndexMap.title !== undefined ? row[fieldIndexMap.title] : null;
      if ((contractNo && String(contractNo).trim()) || (title && String(title).trim())) {
        dataRows.push({ rowIndex: i, data: row });
      }
    }
    
    if (dataRows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: '未找到有效的数据行'
      });
    }
    
    const user = req.user || { id: 1 };
    const importedData = [];
    const errors = [];
    
    function parseDate(value) {
      if (!value) return null;
      const strValue = String(value).trim();
      if (!strValue) return null;
      const date = new Date(strValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return null;
    }
    
    function parseAmount(value) {
      if (!value) return null;
      const strValue = String(value).replace(/[,\s￥¥$]/g, '').trim();
      const num = parseFloat(strValue);
      return isNaN(num) ? null : num;
    }
    
    function parseStatus(value) {
      if (!value) return '正常';
      const strValue = String(value).trim();
      if (['已变更', '变更'].includes(strValue)) return '已变更';
      return '正常';
    }
    
    for (const { rowIndex, data: row } of dataRows) {
      try {
        const getField = (fieldName) => {
          const index = fieldIndexMap[fieldName];
          if (index === undefined || index === -1) return null;
          const value = row[index];
          return value !== null && value !== undefined ? String(value).trim() : null;
        };
        
        const contract_no = getField('contract_no');
        const title = getField('title');
        
        if (!contract_no || !title) {
          errors.push(`第${rowIndex + 1}行：合同编号和合同名称不能为空`);
          continue;
        }
        
        const agent = getField('agent');
        const agent_department = getField('agent_department');
        const status = parseStatus(getField('status'));
        const contract_stage = getField('contract_stage');
        const procurement_name = getField('procurement_name');
        const contract_category = getField('contract_category');
        const start_date = parseDate(getField('start_date'));
        const end_date = parseDate(getField('end_date'));
        const amount = parseAmount(getField('amount'));
        const budget_amount = parseAmount(getField('budget_amount'));
        const signed_amount = parseAmount(getField('signed_amount'));
        const acceptance_deadline = parseDate(getField('acceptance_deadline'));
        const warranty_period = getField('warranty_period');
        const contract_content = getField('contract_content');
        const signed_date = parseDate(getField('signed_date'));
        const submit_leader = getField('submit_leader');
        const submission_completed_date = parseDate(getField('submission_completed_date'));
        
        const existing = db.prepare('SELECT id FROM contracts WHERE contract_no = ?').get(contract_no);
        
        if (existing) {
          db.prepare(`
            UPDATE contracts 
            SET title = ?, agent = ?, agent_department = ?, status = ?, contract_stage = ?,
                procurement_name = ?, contract_category = ?, start_date = ?, end_date = ?,
                amount = ?, budget_amount = ?, signed_amount = ?, acceptance_deadline = ?,
                warranty_period = ?, contract_content = ?, signed_date = ?,
                submit_leader = ?, submission_completed_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            title, agent, agent_department, status, contract_stage, procurement_name,
            contract_category, start_date, end_date, amount, budget_amount, signed_amount,
            acceptance_deadline, warranty_period, contract_content, signed_date,
            submit_leader, submission_completed_date, existing.id
          );
          
          importedData.push({ id: existing.id, contract_no, title, action: 'updated' });
        } else {
          const insertResult = db.prepare(`
            INSERT INTO contracts (
              contract_no, title, type, agent, agent_department, status, contract_stage,
              procurement_name, contract_category, start_date, end_date, amount, budget_amount,
              signed_amount, acceptance_deadline, warranty_period, contract_content,
              signed_date, submit_leader, submission_completed_date, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            contract_no, title, contract_category || '采购合同', agent, agent_department, status,
            contract_stage, procurement_name, contract_category, start_date, end_date, amount,
            budget_amount, signed_amount, acceptance_deadline, warranty_period, contract_content,
            signed_date, submit_leader, submission_completed_date, user.id
          );
          
          importedData.push({ id: insertResult.lastInsertRowid, contract_no, title, action: 'created' });
        }
        
      } catch (error) {
        errors.push(`第${rowIndex + 1}行：${error.message}`);
      }
    }
    
    fs.unlinkSync(filePath);
    
    const createdCount = importedData.filter(item => item.action === 'created').length;
    const updatedCount = importedData.filter(item => item.action === 'updated').length;
    
    res.json({
      success: true,
      message: `导入完成：新增 ${createdCount} 条，更新 ${updatedCount} 条`,
      data: {
        imported: importedData,
        errors: errors,
        total: dataRows.length,
        successCount: importedData.length,
        createdCount,
        updatedCount,
        errorCount: errors.length
      }
    });
    
  } catch (error) {
    console.error('Excel导入错误:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

// Excel导入接口 - 合同履行情况报送记录
router.post('/import-performance', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要导入的Excel文件'
      });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    
    let targetSheetName = workbook.SheetNames[0];
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.includes('履行') || sheetName.includes('报送') || sheetName.includes('单据')) {
        targetSheetName = sheetName;
        break;
      }
    }
    
    const worksheet = workbook.Sheets[targetSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (!jsonData || jsonData.length < 2) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Excel文件中没有数据或数据不足'
      });
    }
    
    // 查找表头行
    let headerRowIndex = -1;
    let fieldIndexMap = {};
    
    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
      const row = jsonData[i];
      const testMap = parseHeaders(row, performanceColumnMapping);
      if (Object.keys(testMap).length >= 2) {
        headerRowIndex = i;
        fieldIndexMap = testMap;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: '无法识别Excel表头，请确保包含"单据编号"和"合同编号"列'
      });
    }
    
    console.log('履行情况字段映射:', fieldIndexMap);
    
    // 提取数据行
    const dataRows = [];
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const docNo = fieldIndexMap.doc_no !== undefined ? row[fieldIndexMap.doc_no] : null;
      const contractNo = fieldIndexMap.contract_no !== undefined ? row[fieldIndexMap.contract_no] : null;
      if (docNo && String(docNo).trim() && contractNo && String(contractNo).trim()) {
        dataRows.push({ rowIndex: i, data: row });
      }
    }
    
    if (dataRows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: '未找到有效的数据行'
      });
    }
    
    const user = req.user || { id: 1 };
    const importedData = [];
    const errors = [];
    const docNoSet = new Set(); // 用于去重
    
    for (const { rowIndex, data: row } of dataRows) {
      try {
        const getField = (fieldName) => {
          const index = fieldIndexMap[fieldName];
          if (index === undefined || index === -1) return null;
          const value = row[index];
          return value !== null && value !== undefined ? String(value).trim() : null;
        };
        
        const doc_no = getField('doc_no');
        const contract_no = getField('contract_no');
        
        if (!doc_no || !contract_no) {
          errors.push(`第${rowIndex + 1}行：单据编号和合同编号不能为空`);
          continue;
        }
        
        // 根据单据编号去重
        if (docNoSet.has(doc_no)) {
          continue;
        }
        docNoSet.add(doc_no);
        
        // 检查合同是否存在
        const contract = db.prepare('SELECT id FROM contracts WHERE contract_no = ?').get(contract_no);
        if (!contract) {
          errors.push(`第${rowIndex + 1}行：合同编号 ${contract_no} 不存在`);
          continue;
        }
        
        // 检查是否已存在相同记录
        const existing = db.prepare('SELECT id FROM contract_performance_reports WHERE doc_no = ?').get(doc_no);
        if (!existing) {
          const today = new Date().toISOString().split('T')[0];
          const insertResult = db.prepare(`
            INSERT INTO contract_performance_reports (doc_no, contract_no, report_date, created_by)
            VALUES (?, ?, ?, ?)
          `).run(doc_no, contract_no, today, user.id);
          
          importedData.push({ id: insertResult.lastInsertRowid, doc_no, contract_no });
        }
        
      } catch (error) {
        errors.push(`第${rowIndex + 1}行：${error.message}`);
      }
    }
    
    fs.unlinkSync(filePath);
    
    // 统计各合同的履行情况
    const stats = db.prepare(`
      SELECT 
        contract_no,
        COUNT(DISTINCT doc_no) as report_count
      FROM contract_performance_reports
      GROUP BY contract_no
    `).all();
    
    const statsMap = {};
    stats.forEach(s => {
      statsMap[s.contract_no] = s.report_count;
    });
    
    res.json({
      success: true,
      message: `成功导入 ${importedData.length} 条履行报送记录`,
      data: {
        imported: importedData,
        errors: errors,
        total: dataRows.length,
        successCount: importedData.length,
        errorCount: errors.length,
        stats: statsMap
      }
    });
    
  } catch (error) {
    console.error('履行情况导入错误:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

// 获取履行情况统计
router.get('/performance-stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        cpr.contract_no,
        c.title as contract_title,
        c.contract_stage,
        c.start_date,
        COUNT(DISTINCT cpr.doc_no) as report_count
      FROM contract_performance_reports cpr
      LEFT JOIN contracts c ON cpr.contract_no = c.contract_no
      GROUP BY cpr.contract_no
    `).all();

    const today = new Date();
    const result = stats.map(stat => {
      let expectedReports = 1;
      if (stat.start_date) {
        const startDate = new Date(stat.start_date);
        const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                          (today.getMonth() - startDate.getMonth()) + 1;
        expectedReports = Math.max(1, monthsDiff);
      }
      const grade = calculatePerformanceGrade(stat.report_count, expectedReports);
      return {
        ...stat,
        expected_reports: expectedReports,
        performance_grade: grade
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取履行情况统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
