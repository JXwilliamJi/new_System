const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 创建测试Excel数据
const testData = [
  ['标题', '类型', '提交部门', '经办人', '检查日期', '检查结果', '状态', '审核人', '复核人', '描述'],
  ['数据安全合规检查', '数据安全', '法务部', '张三', '2026-03-15', '合规', 'completed', '张经理', '李四', '检查公司数据安全合规情况'],
  ['反洗钱合规检查', '反洗钱', '合规部', '李四', '2026-03-10', '合规', 'completed', '张经理', '王五', '检查反洗钱相关合规情况'],
  ['反腐败合规检查', '反腐败', '法务部', '王五', '2026-03-20', '待检查', 'pending', '张经理', '', '检查反腐败相关合规情况'],
  ['知识产权合规检查', '知识产权', '科技部', '赵六', '2026-03-25', '', 'pending', '', '', '检查知识产权相关合规情况'],
  ['劳动合规检查', '劳动合规', '人力资源部', '钱七', '2026-03-30', '', 'pending', '', '', '检查劳动合规相关情况']
];

// 创建工作簿
const wb = XLSX.utils.book_new();

// 创建工作表
const ws = XLSX.utils.aoa_to_sheet(testData);

// 将工作表添加到工作簿，sheet名称包含"合规审核"
XLSX.utils.book_append_sheet(wb, ws, '合规审核数据');

// 生成Excel文件
const outputPath = path.join(__dirname, 'test_compliance.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ 测试Excel文件已创建:', outputPath);
console.log('📊 包含5条测试数据');
console.log('📝 Sheet页名称: 合规审核数据');
console.log('');
console.log('📋 测试数据预览:');
console.log('----------------------------------------');
testData.forEach((row, index) => {
  if (index === 0) {
    console.log('表头:', row.join(' | '));
  } else {
    console.log(`数据${index}:`, row.join(' | '));
  }
});
console.log('----------------------------------------');
console.log('');
console.log('🚀 使用方法:');
console.log('1. 启动服务器: npm start');
console.log('2. 登录系统 (admin / admin123)');
console.log('3. 进入合规管理模块');
console.log('4. 点击"导入Excel"按钮');
console.log('5. 选择 test_compliance.xlsx 文件');
console.log('6. 点击"开始导入"');
console.log('7. 查看导入结果');
