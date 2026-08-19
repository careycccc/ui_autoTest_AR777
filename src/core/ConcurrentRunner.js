// ============================================================
// 并发测试执行器
//
// 与 TestRunner 的区别：
//   TestRunner       —— 单账号，按「设备 × 测试文件」串行执行
//   ConcurrentRunner —— 多账号并行，每个账号独立 BrowserContext + 随机设备
//
// 继承 TestRunner 以复用 runTest()（用例执行、错误截图、页面记录收尾）
// 与 reporter，保证并发结果与串行结果的数据结构完全一致。
//
// 隔离要点：
//   1. 每个账号一个 BrowserContext（cookie / localStorage 互不干扰）
//   2. 账号通过 TestCase.account 显式注入，不走模块级单例 dataConfig，
//      否则并发时多个账号会互相覆盖
// ============================================================

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';
import { TestCase } from './TestCase.js';
import { TestRunner } from './TestRunner.js';
import { pickRandomDevice } from '../utils/account-loader.js';

// ============================================================
// 并发日志标识
//
// 多个账号的输出会交错在同一个终端，不加标识根本无法还原
// 单个账号的执行链路。AsyncLocalStorage 能在异步调用栈中
// 隔离地携带上下文，因此可以在不改动任何业务代码 console.log
// 的前提下，给每条日志自动加上账号前缀。
// ============================================================
const logContext = new AsyncLocalStorage();
let logPatched = false;

function patchConsoleOnce() {
    if (logPatched) return;
    logPatched = true;

    for (const level of ['log', 'warn', 'error']) {
        const original = console[level].bind(console);
        console[level] = (...args) => {
            const ctx = logContext.getStore();
            if (ctx) original(`[W${ctx.worker}|${ctx.tag}]`, ...args);
            else original(...args);
        };
    }
}

export class ConcurrentRunner extends TestRunner {
    /**
     * @param {object} config    全局配置（config.js）
     * @param {string} rootDir   项目根目录
     * @param {object} options
     * @param {number} options.concurrency  最大并发数，默认 3
     * @param {boolean} options.headless    是否无头，默认 true
     */
    constructor(config, rootDir = process.cwd(), options = {}) {
        super(config, rootDir);
        this.concurrency = options.concurrency ?? 3;
        this.headless = options.headless ?? true;
    }

    /**
     * 并发执行（入口）
     *
     * 方法名与父类 run() 区分开，避免签名冲突。
     *
     * @param {string} testFile  测试文件路径
     * @param {Array<{phone,password,areaCode,device?}>} accounts  账号列表
     * @returns {Promise<object>} 汇总结果
     */
    async runConcurrent(testFile, accounts) {
        this.results.startTime = new Date();

        const absolutePath = path.isAbsolute(testFile)
            ? testFile
            : path.resolve(this.rootDir, testFile);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`测试文件不存在: ${absolutePath}`);
        }
        if (!accounts || accounts.length === 0) {
            throw new Error('账号列表为空，请检查 data/1.txt');
        }

        // 未指定设备的账号随机分配一个
        const tasks = accounts.map(acc => ({
            ...acc,
            device: acc.device || pickRandomDevice()
        }));

        console.log(`\n🚀 启动浏览器（${this.headless ? '无头' : '有头'}模式）...`);
        console.log(`⚡ 并发数: ${this.concurrency} / 账号数: ${tasks.length}`);
        tasks.forEach((t, i) => {
            console.log(`   [${i + 1}] ${t.phone} → ${t.device}`);
        });

        // 给并发日志加账号前缀，便于还原单个账号的执行链路
        patchConsoleOnce();

        this.browser = await chromium.launch({
            headless: this.headless,
            slowMo: this.headless ? 0 : this.config.browser.slowMo,
            args: ['--disable-gpu-sandbox', '--disable-dev-shm-usage', '--no-sandbox']
        });

        try {
            await this._runWithConcurrencyLimit(absolutePath, tasks);
        } finally {
            if (this.browser) await this.browser.close().catch(() => { });
        }

        this.results.endTime = new Date();
        this.results.duration = this.results.endTime - this.results.startTime;

        const reportResult = await this.reporter.generate(this.results);
        this.results.reportPath = reportResult.htmlPath;

        return this.results;
    }

    /**
     * 以固定并发数消费任务队列
     */
    async _runWithConcurrencyLimit(absolutePath, tasks) {
        const queue = [...tasks];

        const worker = async (workerId) => {
            while (queue.length > 0) {
                const task = queue.shift();
                if (!task) break;

                // 在账号专属的日志上下文中执行，输出自动带 [W1|1102] 前缀
                const tag = task.phone.slice(-4);
                await logContext.run({ worker: workerId, tag }, async () => {
                    try {
                        await this._runOneAccount(absolutePath, task, workerId);
                    } catch (e) {
                        console.error(`   ❌ ${task.phone} 执行异常: ${e.message}`);
                        this.results.total++;
                        this.results.failed++;
                    }
                });
            }
        };

        const workerCount = Math.min(this.concurrency, tasks.length);
        await Promise.all(
            Array.from({ length: workerCount }, (_, i) => worker(i + 1))
        );
    }

    /**
     * 单个账号的完整执行流程（独立 context）
     */
    async _runOneAccount(absolutePath, account, workerId) {
        const device = this.config.devices[account.device];
        if (!device) {
            throw new Error(`未找到设备配置: ${account.device}`);
        }

        console.log(`\n▶️  [W${workerId}] ${account.phone} @ ${device.name}`);

        const contextOptions = {
            viewport: device.viewport,
            deviceScaleFactor: device.deviceScaleFactor || 1,
            isMobile: device.isMobile || false,
            hasTouch: device.hasTouch || false,
            permissions: ['clipboard-read', 'clipboard-write']
        };
        if (device.userAgent) contextOptions.userAgent = device.userAgent;

        const context = await this.browser.newContext(contextOptions);
        const page = await context.newPage();

        const testCase = new TestCase(page, this.config, this.rootDir);
        testCase.currentDevice = device;
        // 关键：账号显式挂到 TestCase，hooks.standardSetup() 会读取它
        testCase.account = account;

        const suite = {
            name: `${path.basename(absolutePath)} [${account.phone}]`,
            file: absolutePath,
            device: device.name,
            account: account.phone,
            tests: [],
            startTime: new Date()
        };

        try {
            const testModule = await import('file://' + absolutePath);
            if (typeof testModule.default !== 'function') {
                throw new Error('测试文件必须导出默认函数');
            }

            await testModule.default(testCase);

            for (const test of testCase.tests) {
                // 复用父类 runTest：保证与串行执行的结果结构一致
                const result = await this.runTest(testCase, test);
                suite.tests.push(result);
                this.results.total++;
                if (result.status === 'passed') this.results.passed++;
                else if (result.status === 'failed') this.results.failed++;
                else this.results.skipped++;
            }
        } finally {
            suite.endTime = new Date();
            suite.duration = suite.endTime - suite.startTime;
            suite.performance = testCase.performanceData;
            suite.networkRequests = testCase.networkRequests;
            suite.thresholdViolations = testCase.getThresholdViolations();
            suite.apiErrors = testCase.getApiErrors();
            suite.pageRecords = testCase.getPageRecords();

            this.results.thresholdViolations.push(...suite.thresholdViolations);
            this.results.apiErrors.push(...suite.apiErrors);
            this.results.allNetworkRequests.push(...suite.networkRequests);
            this.results.suites.push(suite);

            await context.close().catch(() => { });
            console.log(`◀️  [W${workerId}] ${account.phone} 完成`);
        }
    }
}
