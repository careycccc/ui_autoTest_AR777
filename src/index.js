import { TestRunner } from './core/TestRunner.js';
import config from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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
console.log('📋 测试文件: ' + testFiles.length + ' 个');
console.log('📱 测试设备: ' + testDevices.join(', '));
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

  console.log('══════════════════════════════════════════\n');

  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('❌ 测试运行失败:', err);
  process.exit(1);
});

