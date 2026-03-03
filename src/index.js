import { TestRunner } from './core/TestRunner.js';
import config, { dataConfig } from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================
// 🔥 多版面支持：读取 BRAND_NAME 环境变量
// ============================================================
const BRAND_NAME = process.env.BRAND_NAME || 'brand-3004';
console.log(`\n🏢 当前版面: ${BRAND_NAME}`);

// 动态加载版面配置
let brandConfig = null;
try {
  const { ConfigLoader } = await import('../core/config-loader.js');
  const configLoader = new ConfigLoader(BRAND_NAME);
  await configLoader.load();
  brandConfig = configLoader;

  // 更新 dataConfig 中的 URL 和区号
  dataConfig.url = brandConfig.getBaseURL();
  const loginConfig = brandConfig.getLoginConfig();
  dataConfig.areaCodeData = loginConfig.area_code;

  // 如果有测试账号，更新
  if (loginConfig.test_accounts && loginConfig.test_accounts.length > 0) {
    dataConfig.userName = loginConfig.test_accounts[0].phone;
  }

  console.log(`📍 版面地址: ${dataConfig.url}`);
  console.log(`📞 区号: ${dataConfig.areaCodeData}`);
  console.log(`👤 测试账号: ${dataConfig.userName}`);
} catch (error) {
  console.warn(`⚠️  无法加载版面配置: ${error.message}`);
  console.warn(`   将使用 config.js 中的默认配置`);
}

// ============================================================
// 检测命令行参数
// ============================================================
const isUIMode = process.argv.includes('--ui');

if (isUIMode) {
  console.log('🔧 调试模式已启用');
  config.debug = true;
  config.debugPauseTime = 0;
  config.report.screenshots = false;
  config.screenshot.onStep = false;
  config.screenshot.onError = false;
  config.screenshot.onThresholdExceeded = false;
} else {
  console.log('📊 正常模式：生成报告和截图');
  config.debug = false;
  config.report.screenshots = true;
  config.screenshot.onError = true;
}

// ============================================================
// 配置要运行的测试文件
// ============================================================
const testFiles = [
  // 'tests/runRandomMaster.test.js',
  // 'tests/example.test.js',
  'tests/runAll.test.js',
];

// ============================================================
// 配置要测试的设备（从 config.js 中选择）
// ============================================================
const testDevices = [
  // 'desktop',        // 桌面
  'iphone14',       // iPhone 14
  // 'iphone14pro',    // iPhone 14 Pro
  // 'pixel7',         // Google Pixel 7
  // 'samsungS23',     // Samsung S23
  // 'ipadPro12',      // iPad Pro 12.9
];

// ============================================================
// 运行测试
// ============================================================
const absoluteTestFiles = testFiles.map(f => path.join(rootDir, f));
const runner = new TestRunner(config, rootDir);

console.log('\n🧪 UI 自动化测试平台');
console.log('══════════════════════════════════════════');
console.log('🏢 测试版面: ' + BRAND_NAME);
console.log('🎯 运行模式: ' + (isUIMode ? '调试模式 (--ui)' : '正常模式'));
console.log('📝 测试文件: ' + testFiles.length + ' 个');
console.log('📱 测试设备: ' + testDevices.join(', '));
if (isUIMode) {
  console.log('⚠️  调试模式：不生成报告和截图');
} else {
  console.log('📸 截图: 启用 | 📄 报告: 启用');
}
console.log('══════════════════════════════════════════\n');

runner.run(absoluteTestFiles, { devices: testDevices }).then(results => {
  console.log('\n══════════════════════════════════════════');
  console.log('📊 测试结果');
  console.log('──────────────────────────────────────────');
  console.log('✅ 通过: ' + results.passed);
  console.log('❌ 失败: ' + results.failed);
  console.log('⏭️  跳过: ' + results.skipped);
  console.log('⏱️  耗时: ' + (results.duration / 1000).toFixed(2) + 's');

  if (results.thresholdViolations.length > 0) {
    console.log('\n⚠️ 性能告警: ' + results.thresholdViolations.length + ' 个');
    const critical = results.thresholdViolations.filter(v => v.level === 'critical').length;
    const warning = results.thresholdViolations.filter(v => v.level === 'warning').length;
    console.log('   🔴 严重: ' + critical);
    console.log('   🟡 警告: ' + warning);
  }

  console.log('══════════════════════════════════════════');

  // 🔥 打印报告路径
  if (results.reportPath) {
    console.log('\n📄 测试报告已生成:');
    console.log('   ' + results.reportPath);
    console.log('   在浏览器中打开查看详细报告\n');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('❌ 测试运行失败:', err);
  process.exit(1);
});

