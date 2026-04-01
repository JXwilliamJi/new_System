const db = require('./database/db');

console.log('测试合规检查统计查询...');

try {
  // 测试不带年份参数的查询
  console.log('\n1. 测试不带年份参数的统计查询:');
  const totalResult = db.prepare('SELECT COUNT(*) as total FROM compliance_checks').get();
  console.log('总记录数:', totalResult.total);

  // 测试带年份参数的查询
  console.log('\n2. 测试带年份参数的统计查询 (2024):');
  const yearCondition = "strftime('%Y', check_date) = ?";
  const yearParams = ['2024'];
  
  const totalResultWithYear = db.prepare(`SELECT COUNT(*) as total FROM compliance_checks WHERE ${yearCondition}`).get(...yearParams);
  console.log('2024年记录数:', totalResultWithYear.total);

  // 测试按类型统计
  console.log('\n3. 测试按类型统计:');
  const typeStats = db.prepare(`
    SELECT
      type,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / ?, 2) as percentage
    FROM compliance_checks
    WHERE type IS NOT NULL AND type != ''
    GROUP BY type
    ORDER BY count DESC
  `).all(totalResult.total);
  console.log('类型统计结果:', typeStats);

  console.log('\n✅ 所有测试通过！');

} catch (error) {
  console.error('❌ 测试失败:', error);
  process.exit(1);
}
