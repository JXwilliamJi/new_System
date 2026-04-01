const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取所有部门工作
router.get('/', (req, res) => {
  try {
    const { work_type, year, progress_status, page = 1, limit = 10 } = req.query;
    let whereClause = '';
    const params = [];

    if (work_type) {
      whereClause += ' WHERE dw.work_type = ?';
      params.push(work_type);
    }

    if (year) {
      whereClause += whereClause ? ' AND dw.year = ?' : ' WHERE dw.year = ?';
      params.push(year);
    }

    if (progress_status) {
      whereClause += whereClause ? ' AND dw.progress_status = ?' : ' WHERE dw.progress_status = ?';
      params.push(progress_status);
    }

    const offset = (page - 1) * limit;

    const works = db.prepare(`
      SELECT 
        dw.*,
        u1.real_name as responsible_person_name,
        u2.real_name as created_by_name
      FROM department_work dw
      LEFT JOIN users u1 ON dw.responsible_person = u1.id
      LEFT JOIN users u2 ON dw.created_by = u2.id
      ${whereClause}
      ORDER BY dw.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM department_work dw ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        works,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          totalPages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取部门工作列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个部门工作
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const work = db.prepare(`
      SELECT 
        dw.*,
        u1.real_name as responsible_person_name,
        u2.real_name as created_by_name
      FROM department_work dw
      LEFT JOIN users u1 ON dw.responsible_person = u1.id
      LEFT JOIN users u2 ON dw.created_by = u2.id
      WHERE dw.id = ?
    `).get(id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: '部门工作不存在'
      });
    }

    res.json({
      success: true,
      data: work
    });

  } catch (error) {
    console.error('获取部门工作详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建部门工作
router.post('/', (req, res) => {
  try {
    const { 
      serial_number, task_name, work_content, task_source, assign_time, 
      required_complete_time, responsibility_line, responsible_person, 
      coordinator, progress_status, complete_time, work_type, year 
    } = req.body;

    if (!task_name || !work_type || !year) {
      return res.status(400).json({
        success: false,
        message: '请填写任务名称、工作类型和年份'
      });
    }

    const result = db.prepare(`
      INSERT INTO department_work (serial_number, task_name, work_content, task_source, assign_time, 
        required_complete_time, responsibility_line, responsible_person, coordinator, 
        progress_status, complete_time, work_type, year, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(serial_number, task_name, work_content, task_source, assign_time, 
      required_complete_time, responsibility_line, responsible_person, coordinator, 
      progress_status || 'pending', complete_time, work_type, year, responsible_person);

    res.json({
      success: true,
      message: '部门工作创建成功',
      data: {
        id: result.lastInsertRowid,
        task_name,
        work_type,
        year
      }
    });

  } catch (error) {
    console.error('创建部门工作错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新部门工作
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      serial_number, task_name, work_content, task_source, assign_time, 
      required_complete_time, responsibility_line, responsible_person, 
      coordinator, progress_status, complete_time, work_type, year 
    } = req.body;

    const existingWork = db.prepare('SELECT id FROM department_work WHERE id = ?').get(id);

    if (!existingWork) {
      return res.status(404).json({
        success: false,
        message: '部门工作不存在'
      });
    }

    db.prepare(`
      UPDATE department_work 
      SET serial_number = ?, task_name = ?, work_content = ?, task_source = ?, assign_time = ?,
          required_complete_time = ?, responsibility_line = ?, responsible_person = ?, coordinator = ?,
          progress_status = ?, complete_time = ?, work_type = ?, year = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(serial_number, task_name, work_content, task_source, assign_time, 
      required_complete_time, responsibility_line, responsible_person, coordinator, 
      progress_status, complete_time, work_type, year, id);

    res.json({
      success: true,
      message: '部门工作更新成功'
    });

  } catch (error) {
    console.error('更新部门工作错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除部门工作
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existingWork = db.prepare('SELECT id FROM department_work WHERE id = ?').get(id);

    if (!existingWork) {
      return res.status(404).json({
        success: false,
        message: '部门工作不存在'
      });
    }

    db.prepare('DELETE FROM department_work WHERE id = ?').run(id);

    res.json({
      success: true,
      message: '部门工作删除成功'
    });

  } catch (error) {
    console.error('删除部门工作错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取部门工作统计（按年度和类型）
router.get('/stats/yearly', (req, res) => {
  try {
    const { year } = req.query;
    
    if (!year) {
      return res.status(400).json({
        success: false,
        message: '请提供年份参数'
      });
    }

    // 获取各类型工作的统计
    const stats = db.prepare(`
      SELECT 
        work_type,
        COUNT(*) as total,
        SUM(CASE WHEN progress_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN progress_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN progress_status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM department_work 
      WHERE year = ?
      GROUP BY work_type
    `).all(year);

    // 格式化统计数据
    const formattedStats = {
      key_work: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      supervision: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      routine: { total: 0, completed: 0, in_progress: 0, pending: 0 },
      rectification: { total: 0, completed: 0, in_progress: 0, pending: 0 }
    };

    stats.forEach(stat => {
      if (formattedStats[stat.work_type]) {
        formattedStats[stat.work_type] = {
          total: stat.total,
          completed: stat.completed,
          in_progress: stat.in_progress,
          pending: stat.pending
        };
      }
    });

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('获取部门工作统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
