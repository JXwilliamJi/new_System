const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取仪表板统计数据
router.get('/stats', (req, res) => {
  try {
    // 待审合同数量
    const pendingContracts = db.prepare(
      "SELECT COUNT(*) as count FROM contracts WHERE status = 'pending'"
    ).get();

    // 本月新增制度数量
    const newRegulations = db.prepare(
      "SELECT COUNT(*) as count FROM regulations WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    ).get();

    // 高风险事项数量
    const highRisks = db.prepare(
      "SELECT COUNT(*) as count FROM risks WHERE level = 'high' AND status != 'closed'"
    ).get();

    // 合规培训完成率（模拟数据）
    const trainingRate = { rate: 96 };

    // 待审合规检查数量
    const pendingCompliance = db.prepare(
      "SELECT COUNT(*) as count FROM compliance_checks WHERE status = 'pending'"
    ).get();

    res.json({
      success: true,
      data: {
        pendingContracts: pendingContracts.count,
        newRegulations: newRegulations.count,
        highRisks: highRisks.count,
        trainingRate: trainingRate.rate,
        pendingCompliance: pendingCompliance.count
      }
    });

  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取合同趋势数据
router.get('/contract-trend', (req, res) => {
  try {
    // 获取最近6个月的合同签署数据
    const trendData = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM contracts
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all();

    // 获取最近6个月的风险预警数据
    const riskTrend = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM risks
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all();

    // 格式化数据
    const months = [];
    const contractCounts = [];
    const riskCounts = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      months.push(monthStr);

      const contractData = trendData.find(d => d.month === monthStr);
      contractCounts.push(contractData ? contractData.count : 0);

      const riskData = riskTrend.find(d => d.month === monthStr);
      riskCounts.push(riskData ? riskData.count : 0);
    }

    res.json({
      success: true,
      data: {
        months,
        contractCounts,
        riskCounts
      }
    });

  } catch (error) {
    console.error('获取趋势数据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取合同类型分布
router.get('/contract-distribution', (req, res) => {
  try {
    const distribution = db.prepare(`
      SELECT 
        type,
        COUNT(*) as count
      FROM contracts
      GROUP BY type
      ORDER BY count DESC
    `).all();

    const labels = distribution.map(d => d.type);
    const data = distribution.map(d => d.count);

    res.json({
      success: true,
      data: {
        labels,
        data
      }
    });

  } catch (error) {
    console.error('获取合同分布错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取最新部门工作
router.get('/latest-works', (req, res) => {
  try {
    const works = db.prepare(`
      SELECT
        dw.*,
        u.real_name as responsible_person_name
      FROM department_work dw
      LEFT JOIN users u ON dw.responsible_person = u.id
      ORDER BY dw.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: works
    });

  } catch (error) {
    console.error('获取最新部门工作错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取最新制度发布
router.get('/latest-regulations', (req, res) => {
  try {
    const regulations = db.prepare(`
      SELECT 
        r.*,
        u.real_name as created_by_name
      FROM regulations r
      LEFT JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: regulations
    });

  } catch (error) {
    console.error('获取最新制度错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取风险合规管理概览统计
router.get('/compliance-overview', (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    
    // 本年度合同总数
    const totalContracts = db.prepare(
      "SELECT COUNT(*) as count FROM contracts WHERE strftime('%Y', created_at) = ?"
    ).get(year.toString());

    // 本年度制度总数
    const totalRegulations = db.prepare(
      "SELECT COUNT(*) as count FROM regulations WHERE strftime('%Y', created_at) = ?"
    ).get(year.toString());

    // 本年度风险事项合计
    const totalRisks = db.prepare(
      "SELECT COUNT(*) as count FROM risks WHERE strftime('%Y', created_at) = ?"
    ).get(year.toString());

    // 本年度合规检查总数
    const totalComplianceChecks = db.prepare(
      "SELECT COUNT(*) as count FROM compliance_checks WHERE strftime('%Y', created_at) = ?"
    ).get(year.toString());

    // 部门重点任务完成率 (key_work)
    const keyWorkStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN progress_status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM department_work
      WHERE work_type = 'key_work' AND year = ?
    `).get(year);

    // 部门督办事项完成率 (supervision)
    const supervisionStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN progress_status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM department_work
      WHERE work_type = 'supervision' AND year = ?
    `).get(year);

    // 部门整改事项完成率 (rectification)
    const rectificationStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN progress_status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM department_work
      WHERE work_type = 'rectification' AND year = ?
    `).get(year);

    // 计算完成率
    const keyWorkRate = keyWorkStats.total > 0
      ? Math.round((keyWorkStats.completed / keyWorkStats.total) * 100)
      : 0;
    
    const supervisionRate = supervisionStats.total > 0
      ? Math.round((supervisionStats.completed / supervisionStats.total) * 100)
      : 0;
    
    const rectificationRate = rectificationStats.total > 0
      ? Math.round((rectificationStats.completed / rectificationStats.total) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        year: year,
        totalContracts: totalContracts.count,
        totalRegulations: totalRegulations.count,
        totalRisks: totalRisks.count,
        totalComplianceChecks: totalComplianceChecks.count,
        keyWorkRate: keyWorkRate,
        supervisionRate: supervisionRate,
        rectificationRate: rectificationRate
      }
    });

  } catch (error) {
    console.error('获取风险合规管理概览统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
