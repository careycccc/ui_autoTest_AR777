// ============================================================
// 并发测试入口
//
// 用法：
//   node src/concurrent.js                        # 默认并发 3、无头
//   node src/concurrent.js --concurrency=5        # 指定并发数
//   node src/concurrent.js --headed               # 有头模式（调试用）
//   node src/concurrent.js --limit=2              # 只取账号池前 N 个
//   BRAND_NAME=brand-3003 node src/concurrent.js  # 指定版面
//
// 账号来自 data/1.txt（一行一个），设备从 iphone14 / iphone14pro /
// pixel7 / samsungS23 中随机分配。
// ============================================================

import config, { dataConfig } from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConcurrentRunner } from './core/ConcurrentRunner.js';
import { loadAccounts, assignRandomDevices } from './utils/account-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================
// 解析命令行参数
// ============================================================
const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit ? hit.split('=')[1] : fallback;
};

const concurrency = parseInt(getArg('concurrency', '3'), 10);
const headless = !argv.includes('--headed');
const limit = parseInt(getArg('limit', '0'), 10);

// ============================================================
// 版面配置
// ============================================================
const BRAND_NAME = process.env.BRAND_NAME || 'brand-3004';
console.log(`\n🏢 当前版面: ${BRAND_NAME}`);

try {
    const { ConfigLoader } = await import('../core/config-loader.js');
    const configLoader = new ConfigLoader(BRAND_NAME);
    await configLoader.load();

    dataConfig.url = configLoader.getBaseURL();
    const loginConfig = configLoader.getLoginConfig();
    dataConfig.areaCodeData = loginConfig.area_code;

    console.log(`📍 版面地址: ${dataConfig.url}`);
    console.log(`📞 区号: ${dataConfig.areaCodeData}`);
} catch (error) {
    console.warn(`⚠️  无法加载版面配置: ${error.message}`);
    console.warn(`   将使用 config.js 中的默认配置`);
}

// ============================================================
// 账号池
// ============================================================
let accounts;
try {
    accounts = loadAccounts(undefined, { areaCode: dataConfig.areaCodeData });
} catch (e) {
    console.error(`\n❌ ${e.message}`);
    process.exit(1);
}

if (limit > 0) accounts = accounts.slice(0, limit);

// 每个账号随机分配设备
accounts = assignRandomDevices(accounts);

// ============================================================
// 执行
// ============================================================
const testFile = path.join(rootDir, 'tests', 'game-entry.test.js');

// 并发场景关闭逐步截图，只保留错误截图，避免磁盘与内存压力
config.debug = false;
config.report.screenshots = true;
config.screenshot.onStep = false;
config.screenshot.onError = true;

console.log('\n🧪 UI 自动化测试平台 - 并发模式');
console.log('══════════════════════════════════════════');
console.log(`🏢 测试版面: ${BRAND_NAME}`);
console.log(`📝 测试文件: ${path.basename(testFile)}`);
console.log(`👥 账号数量: ${accounts.length}`);
console.log(`⚡ 并发数量: ${concurrency}`);
console.log(`🖥️  运行模式: ${headless ? '无头' : '有头'}`);
console.log('══════════════════════════════════════════');

try {
    const runner = new ConcurrentRunner(config, rootDir, { concurrency, headless });
    const results = await runner.runConcurrent(testFile, accounts);

    console.log('\n══════════════════════════════════════════');
    console.log('📊 并发测试结果');
    console.log('──────────────────────────────────────────');
    console.log(`✅ 通过: ${results.passed}`);
    console.log(`❌ 失败: ${results.failed}`);
    console.log(`⏭️  跳过: ${results.skipped}`);
    console.log(`⏱️  耗时: ${(results.duration / 1000).toFixed(2)}s`);
    console.log('══════════════════════════════════════════');
    console.log(`\n📄 测试报告:\n   ${results.reportPath}\n`);

    process.exit(results.failed > 0 ? 1 : 0);
} catch (error) {
    console.error('\n❌ 并发测试运行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
}
