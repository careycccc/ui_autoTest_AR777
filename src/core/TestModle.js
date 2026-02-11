// src/utils/testRunner.js

/**
 * 测试运行器 - 支持三种运行模式
 * 
 * Mode 1: 随机模式 (Random)     - 随机点击主目录 N 次
 * Mode 2: 重复模式 (Repeat)     - 指定用例组合重复执行 N 次
 * Mode 3: 顺序模式 (Sequential) - 按目录顺序执行所有用例，失败重试3次后跳过
 * 
 * 🔥 导航方式：
 * - switchPage: true  (默认) → 点击后使用 test.switchToPage() 进行页面切换
 * - switchPage: false         → 仅点击，不切换页面（弹窗、编辑、覆盖层等场景）
 */
export class testModule {
    constructor(test, auth) {
        this.test = test;
        this.page = test.page;
        this.auth = auth;

        // 测试结果统计
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [],    // { name, error, attempt }
            timeline: []   // { name, status, duration, attempt }
        };

        // 主目录注册表
        this.mainTabs = {};

        // 子用例注册表（按主目录分组）
        this.testCases = {};
    }

    // ========================================
    // 注册主目录
    // ========================================

    /**
     * 注册一个主目录 Tab
     * @param {string} name - 目录名称
     * @param {object} config - 配置
     * @param {string}   config.selector           - 点击选择器
     * @param {boolean}  config.switchPage          - 是否切换页面（默认 true）
     * @param {string}   config.pageName            - switchToPage 使用的页面名称（默认同 name）
     * @param {string}   config.waitForSelector     - 等待出现的选择器
     * @param {number}   config.waitTime            - switchToPage 等待时间（默认 1000ms）
     * @param {boolean}  config.collectPreviousPage - 是否收集前一个页面信息（默认 true）
     * @param {Function} config.onEnter             - 导航完成后的额外操作 async (page, auth, test) => {}
     * @param {Function} config.onLeave             - 离开前的操作 async (page, auth, test) => {}
     */
    registerTab(name, config) {
        this.mainTabs[name] = {
            name,
            selector: config.selector,
            // 🔥 核心：是否使用 switchToPage，默认 true
            switchPage: config.switchPage !== false,
            pageName: config.pageName || name,
            waitForSelector: config.waitForSelector || null,
            waitTime: config.waitTime ?? 1000,
            collectPreviousPage: config.collectPreviousPage !== false,
            onEnter: config.onEnter || null,
            onLeave: config.onLeave || null,
            ...config
        };

        // 初始化该目录的子用例列表
        if (!this.testCases[name]) {
            this.testCases[name] = [];
        }
    }

    /**
     * 在某个主目录下注册子用例
     * @param {string}   tabName  - 所属主目录
     * @param {string}   caseName - 用例名称
     * @param {Function} fn       - 用例函数 async (page, auth, test) => {}
     * @param {object}   options  - 配置项
     * @param {boolean}  options.switchPage          - 用例本身是否需要切换页面（默认 false）
     * @param {string}   options.clickSelector       - 用例需要先点击的选择器
     * @param {string}   options.pageName            - 切换到的页面名称
     * @param {string}   options.waitForSelector     - 切换后等待的选择器
     * @param {number}   options.waitTime            - 等待时间
     * @param {boolean}  options.collectPreviousPage - 是否收集前页面
     * @param {number}   options.timeout             - 用例超时时间（默认 30000）
     * @param {number}   options.retries             - 重试次数（默认 3）
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
            // 🔥 子用例的页面切换配置
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
    // 🔧 核心导航方法（统一入口）
    // ========================================

    /**
     * 🔥 导航到指定 Tab —— 自动判断使用 switchToPage 还是纯点击
     * @param {object} tab - 已注册的 tab 配置
     */
    async _navigateToTab(tab) {
        // Step 1: 点击选择器
        await this.page.locator(tab.selector).click({ timeout: 10000 });

        // Step 2: 根据 switchPage 决定导航方式
        if (tab.switchPage) {
            // ✅ 切换页面模式：使用 test.switchToPage()
            await this.test.switchToPage(tab.pageName, {
                waitForSelector: tab.waitForSelector,
                waitTime: tab.waitTime,
                collectPreviousPage: tab.collectPreviousPage
            });
        } else {
            // ✅ 仅点击模式：手动等待元素
            if (tab.waitForSelector) {
                await this.page.waitForSelector(tab.waitForSelector, { timeout: 10000 })
                    .catch(() => console.log(`      ⚠️ 等待 ${tab.waitForSelector} 超时`));
            }
            await this.auth.safeWait(tab.waitTime || 500);
        }

        // Step 3: 执行进入后的回调
        if (tab.onEnter) {
            await tab.onEnter(this.page, this.auth, this.test);
        }
    }

    /**
     * 🔥 新增：返回父用例界面
     * @param {object} tab - 父用例的 tab 配置
     * @param {number} maxAttempts - 最大尝试次数
     */
    async _returnToParentTab(tab, maxAttempts = 5) {
        if (!tab) return false;

        console.log(`      🔙 返回父用例: ${tab.name}`);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // 检查是否已经在父用例界面
                if (tab.waitForSelector) {
                    const isOnParent = await this.page.locator(tab.waitForSelector)
                        .isVisible({ timeout: 1000 })
                        .catch(() => false);

                    if (isOnParent) {
                        console.log(`      ✓ 已在父用例界面`);
                        return true;
                    }
                }

                console.log(`      🔙 第${attempt}次尝试返回...`);

                // 方法1: 点击返回按钮
                const backSuccess = await this.auth._clickBackButton();

                if (backSuccess) {
                    await this.auth.safeWait(1000);

                    // 验证是否回到父用例界面
                    if (tab.waitForSelector) {
                        const isBack = await this.page.locator(tab.waitForSelector)
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);

                        if (isBack) {
                            console.log(`      ✓ 成功返回父用例界面`);
                            return true;
                        }
                    }
                }

            } catch (e) {
                console.log(`      ⚠️ 返回尝试${attempt}失败: ${e.message}`);
            }
        }

        // 所有返回尝试都失败，使用强制导航
        console.log(`      ⚠️ 返回按钮方式失败，使用强制导航`);
        try {
            await this._navigateToTab(tab);
            console.log(`      ✓ 强制导航成功`);
            return true;
        } catch (e) {
            console.log(`      ❌ 强制导航也失败: ${e.message}`);
            return false;
        }
    }

    /**
     * 离开指定 Tab
     */
    async _leaveTab(tab) {
        if (tab?.onLeave) {
            await tab.onLeave(this.page, this.auth, this.test);
        }
    }

    /**
     * 🔥 子用例导航（如果用例需要点击某个按钮 + 可选切换页面）
     * @param {object} testCase - 已注册的用例配置
     */
    async _navigateToCase(testCase) {
        // 先点击指定元素（如果有）
        if (testCase.clickSelector) {
            await this.page.locator(testCase.clickSelector).click({ timeout: 10000 });
        }

        // 根据配置决定是否切换页面
        if (testCase.switchPage && testCase.pageName) {
            await this.test.switchToPage(testCase.pageName, {
                waitForSelector: testCase.waitForSelector,
                waitTime: testCase.waitTime,
                collectPreviousPage: testCase.collectPreviousPage
            });
        } else if (!testCase.switchPage && testCase.waitForSelector) {
            // 不切换页面但需要等待元素
            await this.page.waitForSelector(testCase.waitForSelector, { timeout: 10000 })
                .catch(() => { });
        }
    }

    // ========================================
    // 🎲 模式1: 随机模式
    // ========================================

    /**
     * 随机点击主目录 N 次
     * @param {number} times - 执行次数
     * @param {object} options - 配置
     * @param {number}   options.minInterval - 每次操作最小间隔(ms)
     * @param {number}   options.maxInterval - 每次操作最大间隔(ms)
     * @param {string[]} options.tabs        - 指定参与随机的目录，默认全部
     * @param {boolean}  options.verify      - 是否每次都验证页面
     * @param {Function} options.onEachDone  - 每次完成后的回调
     */
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
        console.log(`   间隔: ${minInterval}-${maxInterval}ms\n`);

        let lastTab = null;

        for (let i = 1; i <= times; i++) {
            // 随机选择一个目录
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

                // 如果上一个 tab 有 onLeave，先执行
                if (lastTab && this.mainTabs[lastTab]) {
                    await this._leaveTab(this.mainTabs[lastTab]);
                }

                // 🔥 使用统一导航（自动判断 switchToPage / 纯点击）
                await this._navigateToTab(tab);

                // 验证页面
                if (verify) {
                    await this._verifyPageLoaded(tab);
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

                // 随机模式不停，继续
                await this.auth._ensureOnHomePage().catch(() => { });
            }

            // 随机间隔
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

    /**
     * 重复执行指定的用例组合 N 次
     * @param {Array<Function|object>} tasks - 要执行的任务列表
     *   - Function: async (page, auth, round, test) => {}
     *   - Object: { name, fn, switchPage?, pageName?, waitForSelector?, clickSelector? }
     * @param {number} times - 重复次数
     * @param {object} options - 配置
     */
    async runRepeat(tasks, times = 10, options = {}) {
        const {
            resetBetweenRounds = true,
            intervalBetweenRounds = 1000,
            stopOnFail = false,
            onRoundDone = null
        } = options;

        // 标准化任务列表
        const normalizedTasks = tasks.map((task, idx) => {
            if (typeof task === 'function') {
                return { name: `任务${idx + 1}`, fn: task, switchPage: false };
            }
            return {
                switchPage: false,
                ...task
            };
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

                    // 🔥 如果任务配置了导航信息，先自动导航
                    if (task.clickSelector || task.switchPage) {
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
                    }

                    // 🔥 执行任务函数，传入 test 作为第4个参数
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

                    // 失败后尝试恢复
                    await this.auth._ensureOnHomePage().catch(() => { });
                    break; // 跳过本轮剩余任务
                }
            }

            if (onRoundDone) {
                await onRoundDone(round, roundFailed);
            }

            // 每轮之间回到首页
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
    // 📋 模式3: 顺序模式（带重试）
    // ========================================

    /**
     * 按目录顺序执行所有子用例
     * @param {object} options - 配置
     * @param {string[]} options.tabOrder           - 主目录执行顺序
     * @param {number}   options.defaultRetries     - 默认重试次数
     * @param {number}   options.retryDelay         - 重试间隔(ms)
     * @param {boolean}  options.resetBeforeEachCase - 每个用例前是否回到当前目录页
     * @param {Function} options.onCaseDone         - 每个用例完成后的回调
     */
    async runSequential(options = {}) {
        const {
            tabOrder = null,
            defaultRetries = 3,
            retryDelay = 2000,
            resetBeforeEachCase = true,
            onCaseDone = null
        } = options;

        const order = tabOrder || Object.keys(this.testCases);

        // 统计总用例数
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

            // 🔥 使用统一导航进入主目录
            const tab = this.mainTabs[tabName];
            if (tab) {
                try {
                    await this._navigateToTab(tab);
                    await this.auth.safeWait(1000);
                } catch (e) {
                    console.log(`   ⚠️ 进入 ${tabName} 失败: ${e.message}`);
                }
            }

            // 执行该目录下的所有用例
            for (const testCase of cases) {
                caseIndex++;
                const maxRetries = testCase.retries || defaultRetries;
                let passed = false;

                const caseMode = testCase.switchPage ? '📄' : '🔘';
                console.log(`\n   [${caseIndex}/${totalCases}] ${caseMode} ${testCase.name}`);

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    const startTime = Date.now();

                    try {
                        // 重试前重置状态
                        if (attempt > 1) {
                            console.log(`      🔄 第 ${attempt}/${maxRetries} 次重试...`);

                            // 🔥 不回首页，直接回到当前主目录
                            if (tab) {
                                try {
                                    // 先尝试直接重新进入当前目录
                                    await this._dismissAllOverlays();
                                    await this._clickAndWaitTab(tab);
                                    console.log(`      🔄 已回到 ${tabName}`);
                                } catch (navErr) {
                                    // 直接进入失败，才回首页再进
                                    console.log(`      ⚠️ 直接回到 ${tabName} 失败，尝试从首页进入...`);
                                    await this.auth._ensureOnHomePage().catch(() => { });
                                    await this.auth.safeWait(retryDelay);
                                    try {
                                        await this._clickAndWaitTab(tab);
                                    } catch (e2) {
                                        console.log(`      ⚠️ 从首页进入 ${tabName} 也失败: ${e2.message}`);
                                    }
                                }
                                await this.auth.safeWait(1000);
                            }
                        }

                        // 如果用例配置了导航，先导航
                        if (testCase.clickSelector || testCase.switchPage) {
                            await this._navigateToCase(testCase);
                        }

                        // 🔥 设置当前用例上下文
                        this.test.currentTabName = tabName;
                        this.test.currentCaseName = testCase.name;

                        // 执行用例
                        await Promise.race([
                            testCase.fn(this.page, this.auth, this.test),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('用例执行超时')), testCase.timeout)
                            )
                        ]);

                        // 🔥 清除用例上下文
                        this.test.currentTabName = null;
                        this.test.currentCaseName = null;

                        const duration = Date.now() - startTime;
                        console.log(`      ✅ 通过 (${duration}ms${attempt > 1 ? `, 第${attempt}次` : ''})`);
                        this._recordResult(testCase.name, 'passed', duration, null, attempt);
                        passed = true;

                        // 🔥 新增：子用例执行完成后返回父用例界面
                        if (tab) {
                            await this._returnToParentTab(tab);
                        }

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

                        // 🔥 失败恢复：先尝试返回父用例界面
                        if (tab && attempt < maxRetries) {
                            console.log(`      🔄 尝试返回父用例界面以便重试...`);
                            await this._returnToParentTab(tab).catch(() => {
                                console.log(`      ⚠️ 返回父用例失败，尝试其他恢复方式`);
                            });
                        }

                        // 如果返回失败，尝试关闭遮罩
                        await this._dismissAllOverlays().catch(() => { });
                    }
                }

                if (onCaseDone) {
                    await onCaseDone(caseIndex, testCase.name, passed ? 'passed' : 'skipped');
                }
            }

            // 离开当前目录
            await this._leaveTab(tab);

            // 回到首页准备进入下一个目录
            await this.auth._ensureOnHomePage().catch(() => { });
            await this.auth.safeWait(1000);
        }

        this._printSummary('📋 顺序模式');
        return this.results;
    }

    // ========================================
    // 内部工具方法
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

    async _verifyPageLoaded(tab) {
        if (tab.waitForSelector) {
            const visible = await this.page.locator(tab.waitForSelector)
                .isVisible({ timeout: 3000 })
                .catch(() => false);
            if (!visible) {
                throw new Error(`页面验证失败: ${tab.waitForSelector} 不可见`);
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

    /**
     * 重置统计结果
     */
    resetResults() {
        this.results = {
            total: 0, passed: 0, failed: 0, skipped: 0,
            errors: [], timeline: []
        };
    }
}