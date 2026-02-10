#!/bin/bash

# ============================================
# 一键修复脚本 - 增加 UID 验证
# uid:0 时报错，uid:非0 时通过
# ============================================

set -e

echo "🔧 开始修复 testRunner.js + 测试文件 ..."

RUNNER_FILE="src/utils/testRunner.js"
TEST_FILE="tests/withBeforeEach.test.js"

# ============================================
# Step 1: 备份
# ============================================

[ -f "$RUNNER_FILE" ] && cp "$RUNNER_FILE" "${RUNNER_FILE}.bak" && echo "📦 备份 $RUNNER_FILE"
[ -f "$TEST_FILE" ] && cp "$TEST_FILE" "${TEST_FILE}.bak" && echo "📦 备份 $TEST_FILE"

# ============================================
# Step 2: 生成 testRunner.js
# ============================================

mkdir -p "$(dirname "$RUNNER_FILE")"

cat > "$RUNNER_FILE" << 'RUNNER_EOF'
// src/utils/testRunner.js

/**
 * 测试运行器 - 支持三种运行模式 + 自定义验证函数
 *
 * 导航方式:
 *   switchPage: true  (默认) → test.switchToPage()
 *   switchPage: false         → 仅点击
 *
 * 验证时机 verifyTiming:
 *   'beforeEnter' (默认) → onEnter 之前验证
 *   'afterEnter'          → onEnter 之后验证
 *   'none'                → 跳过验证
 *
 * 自定义验证 verifyFn:
 *   async (page, auth, test) => { ... throw if fail }
 */
export class testModule {
    constructor(test, auth) {
        this.test = test;
        this.page = test.page;
        this.auth = auth;

        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            timeline: []
        };

        this.mainTabs = {};
        this.testCases = {};
    }

    // ========================================
    // 注册
    // ========================================

    /**
     * 注册主目录 Tab
     * @param {string} name
     * @param {object} config
     * @param {string}   config.selector
     * @param {boolean}  config.switchPage           - 默认 true
     * @param {string}   config.pageName
     * @param {string}   config.waitForSelector
     * @param {number}   config.waitTime             - 默认 1000
     * @param {boolean}  config.collectPreviousPage  - 默认 true
     * @param {string}   config.verifyTiming         - 'beforeEnter' | 'afterEnter' | 'none'
     * @param {string}   config.verifySelector       - 验证用选择器（默认同 waitForSelector）
     * @param {Function} config.verifyFn             - 🔥 自定义验证函数 async (page, auth, test) => {}
     * @param {Function} config.onEnter
     * @param {Function} config.onLeave
     */
    registerTab(name, config) {
        this.mainTabs[name] = {
            name,
            selector: config.selector,
            switchPage: config.switchPage !== false,
            pageName: config.pageName || name,
            waitForSelector: config.waitForSelector || null,
            waitTime: config.waitTime ?? 1000,
            collectPreviousPage: config.collectPreviousPage !== false,
            verifyTiming: config.verifyTiming || 'beforeEnter',
            verifySelector: config.verifySelector || config.waitForSelector,
            verifyFn: config.verifyFn || null,
            onEnter: config.onEnter || null,
            onLeave: config.onLeave || null,
            ...config
        };

        if (!this.testCases[name]) {
            this.testCases[name] = [];
        }
    }

    /**
     * 注册子用例
     */
    registerCase(tabName, caseName, fn, options = {}) {
        if (!this.testCases[tabName]) {
            this.testCases[tabName] = [];
        }

        this.testCases[tabName].push({
            name: caseName,
            fn,
            priority: options.priority || 0,
            timeout: options.timeout || 30000,
            retries: options.retries || 3,
            switchPage: options.switchPage || false,
            clickSelector: options.clickSelector || null,
            pageName: options.pageName || caseName,
            waitForSelector: options.waitForSelector || null,
            waitTime: options.waitTime ?? 1000,
            collectPreviousPage: options.collectPreviousPage !== false,
            ...options
        });
    }

    // ========================================
    // 核心导航
    // ========================================

    /**
     * 点击 + 等待（不含 onEnter、不含验证）
     */
    async _clickAndWaitTab(tab) {
        await this.page.locator(tab.selector).click({ timeout: 10000 });

        if (tab.switchPage) {
            await this.test.switchToPage(tab.pageName, {
                waitForSelector: tab.waitForSelector,
                waitTime: tab.waitTime,
                collectPreviousPage: tab.collectPreviousPage
            });
        } else {
            if (tab.waitForSelector) {
                await this.page.waitForSelector(tab.waitForSelector, { timeout: 10000 })
                    .catch(() => console.log(`      ⚠️ 等待 ${tab.waitForSelector} 超时`));
            }
            await this.auth.safeWait(tab.waitTime || 500);
        }
    }

    /**
     * 完整导航（不含验证）
     */
    async _navigateToTab(tab) {
        await this._clickAndWaitTab(tab);
        if (tab.onEnter) {
            await tab.onEnter(this.page, this.auth, this.test);
        }
    }

    /**
     * 完整导航 + 按 verifyTiming 验证
     */
    async _navigateToTabWithVerify(tab) {
        await this._clickAndWaitTab(tab);

        // beforeEnter: onEnter 之前验证（菜单还开着）
        if (tab.verifyTiming === 'beforeEnter') {
            await this._verifyPageLoaded(tab);
        }

        if (tab.onEnter) {
            await tab.onEnter(this.page, this.auth, this.test);
        }

        // afterEnter: onEnter 之后验证
        if (tab.verifyTiming === 'afterEnter') {
            await this._verifyPageLoaded(tab);
        }
        // 'none' → 不验证
    }

    async _leaveTab(tab) {
        if (tab?.onLeave) {
            await tab.onLeave(this.page, this.auth, this.test);
        }
    }

    async _navigateToCase(testCase) {
        if (testCase.clickSelector) {
            await this.page.locator(testCase.clickSelector).click({ timeout: 10000 });
        }
        if (testCase.switchPage && testCase.pageName) {
            await this.test.switchToPage(testCase.pageName, {
                waitForSelector: testCase.waitForSelector,
                waitTime: testCase.waitTime,
                collectPreviousPage: testCase.collectPreviousPage
            });
        } else if (!testCase.switchPage && testCase.waitForSelector && testCase.clickSelector) {
            await this.page.waitForSelector(testCase.waitForSelector, { timeout: 10000 })
                .catch(() => { });
        }
    }

    // ========================================
    // 🔥 验证方法（支持自定义 verifyFn）
    // ========================================

    async _verifyPageLoaded(tab) {
        // 1️⃣ 先执行自定义验证函数（如果有）
        if (tab.verifyFn) {
            await tab.verifyFn(this.page, this.auth, this.test);
        }

        // 2️⃣ 再执行选择器可见性验证
        const selector = tab.verifySelector || tab.waitForSelector;
        if (selector) {
            const visible = await this.page.locator(selector)
                .isVisible({ timeout: 3000 })
                .catch(() => false);
            if (!visible) {
                throw new Error(`页面验证失败: ${selector} 不可见`);
            }
        }
    }

    // ========================================
    // 🎲 模式1: 随机模式
    // ========================================

    async runRandom(times = 100, options = {}) {
        const {
            minInterval = 500,
            maxInterval = 2000,
            tabs = null,
            verify = false,
            onEachDone = null
        } = options;

        const tabNames = tabs || Object.keys(this.mainTabs);
        if (tabNames.length === 0) {
            console.log('❌ 没有注册任何主目录');
            return this.results;
        }

        console.log(`\n🎲 ===== 随机模式开始 =====`);
        console.log(`   总次数: ${times}`);
        console.log(`   参与目录: ${tabNames.join(', ')}`);
        console.log(`   间隔: ${minInterval}-${maxInterval}ms`);
        console.log(`   验证: ${verify}\n`);

        let lastTab = null;

        for (let i = 1; i <= times; i++) {
            const tabName = tabNames[Math.floor(Math.random() * tabNames.length)];
            const tab = this.mainTabs[tabName];

            if (!tab) {
                console.log(`   ⚠️ 目录 "${tabName}" 未注册，跳过`);
                continue;
            }

            const startTime = Date.now();
            const modeLabel = tab.switchPage ? '切换页面' : '仅点击';

            try {
                console.log(`   [${i}/${times}] 🔀 ${tabName} (${modeLabel})`);

                if (lastTab && this.mainTabs[lastTab]) {
                    await this._leaveTab(this.mainTabs[lastTab]);
                }

                if (verify) {
                    await this._navigateToTabWithVerify(tab);
                } else {
                    await this._navigateToTab(tab);
                }

                const duration = Date.now() - startTime;
                this._recordResult(tabName, 'passed', duration);

                if (onEachDone) {
                    await onEachDone(i, tabName, 'passed');
                }

                lastTab = tabName;

            } catch (e) {
                const duration = Date.now() - startTime;
                console.log(`      ❌ 失败: ${e.message}`);
                this._recordResult(tabName, 'failed', duration, e);

                if (onEachDone) {
                    await onEachDone(i, tabName, 'failed');
                }

                await this.auth._ensureOnHomePage().catch(() => { });
            }

            const interval = Math.floor(
                Math.random() * (maxInterval - minInterval) + minInterval
            );
            await this.auth.safeWait(interval);
        }

        this._printSummary('🎲 随机模式');
        return this.results;
    }

    // ========================================
    // 🔄 模式2: 重复模式
    // ========================================

    async runRepeat(tasks, times = 10, options = {}) {
        const {
            resetBetweenRounds = true,
            intervalBetweenRounds = 1000,
            stopOnFail = false,
            onRoundDone = null
        } = options;

        const normalizedTasks = tasks.map((task, idx) => {
            if (typeof task === 'function') {
                return { name: `任务${idx + 1}`, fn: task, switchPage: false };
            }
            return { switchPage: false, ...task };
        });

        const taskNames = normalizedTasks.map(t => {
            const label = t.switchPage ? '📄' : '🔘';
            return `${label}${t.name}`;
        }).join(' → ');

        console.log(`\n🔄 ===== 重复模式开始 =====`);
        console.log(`   执行链: ${taskNames}`);
        console.log(`   重复次数: ${times}`);
        console.log(`   每轮重置: ${resetBetweenRounds}`);
        console.log(`   📄=切换页面  🔘=仅点击\n`);

        for (let round = 1; round <= times; round++) {
            console.log(`\n   ━━━ 第 ${round}/${times} 轮 ━━━`);
            let roundFailed = false;

            for (const task of normalizedTasks) {
                const startTime = Date.now();

                try {
                    const modeLabel = task.switchPage ? '(切换页面)' : '(仅操作)';
                    console.log(`   ▶ ${task.name} ${modeLabel}`);

                    if (task.clickSelector) {
                        await this.page.locator(task.clickSelector).click({ timeout: 10000 });
                    }
                    if (task.switchPage && task.pageName) {
                        await this.test.switchToPage(task.pageName, {
                            waitForSelector: task.waitForSelector,
                            waitTime: task.waitTime ?? 1000,
                            collectPreviousPage: task.collectPreviousPage !== false
                        });
                    }

                    await task.fn(this.page, this.auth, round, this.test);

                    const duration = Date.now() - startTime;
                    this._recordResult(`[R${round}] ${task.name}`, 'passed', duration);
                    console.log(`     ✅ 完成 (${duration}ms)`);

                } catch (e) {
                    const duration = Date.now() - startTime;
                    console.log(`     ❌ 失败: ${e.message}`);
                    this._recordResult(`[R${round}] ${task.name}`, 'failed', duration, e);
                    roundFailed = true;

                    if (stopOnFail) {
                        console.log(`   ⛔ stopOnFail=true，停止所有轮次`);
                        this._printSummary('🔄 重复模式');
                        return this.results;
                    }

                    await this.auth._ensureOnHomePage().catch(() => { });
                    break;
                }
            }

            if (onRoundDone) {
                await onRoundDone(round, roundFailed);
            }

            if (resetBetweenRounds && round < times) {
                console.log(`   🏠 回到首页准备下一轮...`);
                await this.auth._ensureOnHomePage().catch(() => { });
                await this.auth.safeWait(intervalBetweenRounds);
            }
        }

        this._printSummary('🔄 重复模式');
        return this.results;
    }

    // ========================================
    // 📋 模式3: 顺序模式
    // ========================================

    async runSequential(options = {}) {
        const {
            tabOrder = null,
            defaultRetries = 3,
            retryDelay = 2000,
            resetBeforeEachCase = true,
            onCaseDone = null
        } = options;

        const order = tabOrder || Object.keys(this.testCases);

        let totalCases = 0;
        for (const tabName of order) {
            totalCases += (this.testCases[tabName] || []).length;
        }

        console.log(`\n📋 ===== 顺序模式开始 =====`);
        console.log(`   目录顺序: ${order.join(' → ')}`);
        console.log(`   总用例数: ${totalCases}`);
        console.log(`   默认重试: ${defaultRetries} 次\n`);

        let caseIndex = 0;

        for (const tabName of order) {
            const cases = this.testCases[tabName] || [];
            if (cases.length === 0) {
                console.log(`\n   📂 ${tabName}: (无用例，跳过)`);
                continue;
            }

            console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`   📂 ${tabName} (${cases.length} 个用例)`);
            console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            const tab = this.mainTabs[tabName];
            if (tab) {
                try {
                    await this._navigateToTab(tab);
                    await this.auth.safeWait(1000);
                } catch (e) {
                    console.log(`   ⚠️ 进入 ${tabName} 失败: ${e.message}`);
                }
            }

            for (const testCase of cases) {
                caseIndex++;
                const maxRetries = testCase.retries || defaultRetries;
                let passed = false;

                const caseMode = testCase.switchPage ? '📄' : '🔘';
                console.log(`\n   [${caseIndex}/${totalCases}] ${caseMode} ${testCase.name}`);

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    const startTime = Date.now();

                    try {
                        if (resetBeforeEachCase && attempt > 1) {
                            console.log(`      🔄 重试前回到首页...`);
                            await this.auth._ensureOnHomePage().catch(() => { });
                            await this.auth.safeWait(retryDelay);

                            if (tab) {
                                try {
                                    await this._navigateToTab(tab);
                                } catch (navErr) {
                                    console.log(`      ⚠️ 重新进入 ${tabName} 失败: ${navErr.message}`);
                                }
                                await this.auth.safeWait(1000);
                            }
                        }

                        if (attempt > 1) {
                            console.log(`      🔄 第 ${attempt}/${maxRetries} 次重试...`);
                        }

                        if (testCase.clickSelector || testCase.switchPage) {
                            await this._navigateToCase(testCase);
                        }

                        await Promise.race([
                            testCase.fn(this.page, this.auth, this.test),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('用例执行超时')), testCase.timeout)
                            )
                        ]);

                        const duration = Date.now() - startTime;
                        console.log(`      ✅ 通过 (${duration}ms${attempt > 1 ? `, 第${attempt}次` : ''})`);
                        this._recordResult(testCase.name, 'passed', duration, null, attempt);
                        passed = true;
                        break;

                    } catch (e) {
                        const duration = Date.now() - startTime;
                        console.log(`      ❌ 第${attempt}次失败 (${duration}ms): ${e.message}`);

                        if (attempt === maxRetries) {
                            console.log(`      ⏭️ ${maxRetries}次重试用完，跳过此用例`);
                            this._recordResult(testCase.name, 'skipped', duration, e, attempt);
                        } else {
                            this._recordResult(`${testCase.name} (第${attempt}次)`, 'failed', duration, e, attempt);
                        }

                        await this.auth._ensureOnHomePage().catch(() => { });
                    }
                }

                if (onCaseDone) {
                    await onCaseDone(caseIndex, testCase.name, passed ? 'passed' : 'skipped');
                }
            }

            await this._leaveTab(tab);
            await this.auth._ensureOnHomePage().catch(() => { });
            await this.auth.safeWait(1000);
        }

        this._printSummary('📋 顺序模式');
        return this.results;
    }

    // ========================================
    // 内部工具
    // ========================================

    _recordResult(name, status, duration, error = null, attempt = 1) {
        this.results.total++;
        if (status === 'passed') this.results.passed++;
        else if (status === 'failed') this.results.failed++;
        else if (status === 'skipped') this.results.skipped++;

        this.results.timeline.push({
            name, status, duration, attempt,
            timestamp: new Date().toISOString()
        });

        if (error) {
            this.results.errors.push({
                name, error: error.message, attempt,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🔥 页面验证 - 支持 verifyFn 自定义 + 选择器可见性
     */
    async _verifyPageLoaded(tab) {
        // 1️⃣ 自定义验证函数（优先级最高）
        if (tab.verifyFn) {
            await tab.verifyFn(this.page, this.auth, this.test);
        }

        // 2️⃣ 选择器可见性验证
        const selector = tab.verifySelector || tab.waitForSelector;
        if (selector) {
            const visible = await this.page.locator(selector)
                .isVisible({ timeout: 3000 })
                .catch(() => false);
            if (!visible) {
                throw new Error(`页面验证失败: ${selector} 不可见`);
            }
        }
    }

    _printSummary(modeName) {
        const r = this.results;
        const passRate = r.total > 0 ? ((r.passed / r.total) * 100).toFixed(1) : 0;

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`${modeName} - 执行报告`);
        console.log(`${'═'.repeat(50)}`);
        console.log(`   总计: ${r.total}`);
        console.log(`   ✅ 通过: ${r.passed}`);
        console.log(`   ❌ 失败: ${r.failed}`);
        console.log(`   ⏭️ 跳过: ${r.skipped}`);
        console.log(`   📊 通过率: ${passRate}%`);

        if (r.errors.length > 0) {
            console.log(`\n   ─── 错误详情 ───`);
            r.errors.forEach((err, i) => {
                console.log(`   ${i + 1}. [${err.name}] ${err.error}`);
            });
        }

        console.log(`${'═'.repeat(50)}\n`);
    }

    resetResults() {
        this.results = {
            total: 0, passed: 0, failed: 0, skipped: 0,
            errors: [], timeline: []
        };
    }
}
RUNNER_EOF

echo "✅ 已生成 $RUNNER_FILE"

# ============================================
# Step 3: 生成测试文件
# ============================================

mkdir -p "$(dirname "$TEST_FILE")"

cat > "$TEST_FILE" << 'TEST_EOF'
// tests/withBeforeEach.test.js
import { TestHooks } from '../src/utils/hooks.js';
import { testModule } from '../src/utils/testRunner.js';

export default async function (test) {
    let hooks;
    let auth;
    let runner;

    test.beforeEach(async () => {
        hooks = new TestHooks(test);
        auth = await hooks.standardSetup();
        runner = new testModule(test, auth);

        // ========================================
        // 注册4个主目录
        // ========================================

        runner.registerTab('活动资讯', {
            selector: '#activity',
            pageName: '活动资讯页',
            waitForSelector: 'text=Promotions',
            waitTime: 1000,
            collectPreviousPage: true
        });

        runner.registerTab('新版返佣', {
            selector: '#promotion',
            pageName: '新版返佣',
            waitForSelector: 'text=My Rewards',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // ========================================
        // 🔥 菜单：switchPage:false + UID 验证
        // ========================================
        runner.registerTab('菜单', {
            selector: '#app #menu',
            switchPage: false,
            waitForSelector: '.uid',
            pageName: '菜单页',
            waitTime: 1000,

            // 在 onEnter 关闭菜单之前验证（此时 .uid 还可见）
            verifyTiming: 'beforeEnter',

            // 🔥 自定义验证：检查 uid 的值，uid:0 报错
            verifyFn: async (page, auth, test) => {
                // 拿到 .uid 元素的文本内容
                const uidEl = page.locator('.uid');
                const uidText = await uidEl.textContent({ timeout: 5000 });

                console.log(`      🔍 检测到 UID 文本: "${uidText}"`);

                // 解析数字部分: "uid:135177" → 135177
                const match = uidText.match(/uid[:\s]*(\d+)/i);

                if (!match) {
                    throw new Error(`UID 格式异常，无法解析: "${uidText}"`);
                }

                const uidValue = parseInt(match[1], 10);

                if (uidValue === 0) {
                    throw new Error(`❌ UID 为 0，用户未正确登录！(原始文本: "${uidText}")`);
                }

                console.log(`      ✅ UID 验证通过: ${uidValue}`);
            },

            onEnter: async (page, auth, test) => {
                await auth.safeWait(1000);
                const { width, height } = page.viewportSize();
                await page.mouse.click(width - width / 10, height - 80);
                await auth.safeWait(500);
            },

            onLeave: async (page, auth, test) => {
                await page.locator('#app #menu').click();
                await page.waitForTimeout(500);
            }
        });

        runner.registerTab('邀请转盘', {
            selector: '#turntable',
            pageName: '邀请转盘',
            waitForSelector: 'text=Cash everyday',
            waitTime: 1000,
            collectPreviousPage: true,
            onLeave: async (page, auth, test) => {
                await auth._clickBackButton();
                await auth.safeWait(1000);
            }
        });
    });

    // ========================================
    // 🎲 模式1: 随机压力测试
    // ========================================
    test.test('模式1: 随机点击主目录 (压力测试)', async () => {
        const results = await runner.runRandom(15, {
            minInterval: 2000,
            maxInterval: 3500,
            verify: true,
            onEachDone: async (i, tabName, status) => {
                if (i % 10 === 0) {
                    console.log(`\n      ── 进度: ${i} 次完成 ──\n`);
                }
            }
        });

        console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    });
}
TEST_EOF

echo "✅ 已生成 $TEST_FILE"

# ============================================
# Step 4: 完成
# ============================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 修复完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 修改的文件:"
echo "   ✅ $RUNNER_FILE"
echo "   ✅ $TEST_FILE"
echo ""
echo "🔑 本次改动:"
echo ""
echo "   1. registerTab 新增 verifyFn 自定义验证函数"
echo "   2. _verifyPageLoaded 先执行 verifyFn 再检查选择器可见性"
echo "   3. 菜单注册新增 UID 验证逻辑:"
echo ""
echo "      <span class=\"uid\">uid:135177</span>"
echo "        → 解析数字 135177"
echo "        → uid:0  ❌ 报错: 用户未正确登录"
echo "        → uid:非0 ✅ 通过"
echo ""
echo "   4. verifyTiming: 'beforeEnter'"
echo "      → 在 onEnter(关闭菜单) 之前验证"
echo "      → 此时 .uid 元素还可见"
echo ""
echo "🔥 验证执行流程:"
echo ""
echo "   click(#menu)"
echo "     ↓"
echo "   waitForSelector(.uid) ✅"
echo "     ↓"
echo "   verifyFn → 读取 uid:135177 → 非0 ✅"
echo "     ↓"
echo "   _verifyPageLoaded → .uid 可见 ✅"
echo "     ↓"
echo "   onEnter → 关闭菜单"
echo ""
echo "   如果 uid:0 → verifyFn 直接抛错 ❌ 不再继续"
echo ""
echo "💡 回滚:"
echo "   cp ${RUNNER_FILE}.bak $RUNNER_FILE"
echo "   cp ${TEST_FILE}.bak $TEST_FILE"
echo ""