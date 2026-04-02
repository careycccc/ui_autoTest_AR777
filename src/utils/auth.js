// src/utils/auth.js
import { getSmss } from '../api/smss.test.js';
import { dataConfig } from '../../config.js';

export class AuthHelper {
    constructor(testCase) {
        this.t = testCase;
        this.page = testCase.page;
        this.isLoggedIn = false;
        this.userId = null; // 🔥 存储用户 ID
    }

    // ========================================
    // 公共工具方法
    // ========================================

    async safeWait(ms) {
        try {
            if (!this.page || this.page.isClosed()) return;
            await this.page.waitForTimeout(ms);
        } catch (e) {
            console.log(`        等待被中断: ${e.message}`);
        }
    }

    /**
     * 🔥 等待页面最大内容绘制完成（LCP）或超时
     * 确保页面主要内容已加载完成再进行操作
     * @param {number} maxWait - 最大等待时间（毫秒），默认 3000ms
     * @returns {Promise<boolean>} 是否成功等待到 LCP
     */
    async waitForLCP(maxWait = 3000) {
        try {
            if (!this.page || this.page.isClosed()) return false;

            console.log(`        ⏳ 等待页面最大内容绘制完成（最多 ${maxWait}ms）...`);

            const startTime = Date.now();
            let lcpDetected = false;

            // 尝试等待 LCP 事件
            const lcpPromise = this.page.evaluate(() => {
                return new Promise((resolve) => {
                    // 使用 PerformanceObserver 监听 LCP
                    if ('PerformanceObserver' in window) {
                        try {
                            const observer = new PerformanceObserver((list) => {
                                const entries = list.getEntries();
                                const lastEntry = entries[entries.length - 1];
                                if (lastEntry) {
                                    resolve({
                                        lcp: lastEntry.renderTime || lastEntry.loadTime,
                                        element: lastEntry.element?.tagName || 'unknown'
                                    });
                                }
                            });
                            observer.observe({ type: 'largest-contentful-paint', buffered: true });

                            // 5秒后自动停止观察
                            setTimeout(() => {
                                observer.disconnect();
                                resolve(null);
                            }, 5000);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });

            // 等待 LCP 或超时
            const result = await Promise.race([
                lcpPromise,
                new Promise(resolve => setTimeout(() => resolve(null), maxWait))
            ]);

            const elapsed = Date.now() - startTime;

            if (result && result.lcp) {
                lcpDetected = true;
                console.log(`        ✅ LCP 完成: ${Math.round(result.lcp)}ms (元素: ${result.element})`);
            } else {
                console.log(`        ⏱️ LCP 超时，已等待 ${elapsed}ms，继续执行`);
            }

            // 额外等待一小段时间确保渲染稳定
            await this.safeWait(300);

            return lcpDetected;

        } catch (e) {
            console.log(`        ⚠️ 等待 LCP 出错: ${e.message}，继续执行`);
            // 出错时至少等待 1 秒
            await this.safeWait(1000);
            return false;
        }
    }

    /**
     * 🔥 等待页面稳定（综合等待策略）
     * 结合 LCP、网络空闲、DOM 稳定等多个指标
     * @param {object} options - 配置选项
     * @param {number} options.maxWait - 最大等待时间，默认 3000ms
     * @param {boolean} options.waitForNetwork - 是否等待网络空闲，默认 false
     * @param {boolean} options.waitForLCP - 是否等待 LCP，默认 true
     * @returns {Promise<void>}
     */
    async waitForPageStable(options = {}) {
        const {
            maxWait = 3000,
            waitForNetwork = false,
            waitForLCP = true
        } = options;

        try {
            if (!this.page || this.page.isClosed()) return;

            console.log(`        🔄 等待页面稳定...`);

            // 1. 等待 DOM 加载完成
            await this.page.waitForLoadState('domcontentloaded', { timeout: maxWait }).catch(() => {
                console.log(`        ⚠️ DOM 加载超时`);
            });

            // 2. 等待 LCP（如果启用）
            if (waitForLCP) {
                await this.waitForLCP(maxWait);
            }

            // 3. 等待网络空闲（如果启用）
            if (waitForNetwork) {
                await this.page.waitForLoadState('networkidle', { timeout: maxWait }).catch(() => {
                    console.log(`        ⚠️ 网络空闲超时`);
                });
            }

            // 4. 额外等待确保渲染完成
            await this.safeWait(500);

            console.log(`        ✅ 页面已稳定`);

        } catch (e) {
            console.log(`        ⚠️ 等待页面稳定出错: ${e.message}`);
            // 出错时至少等待 1 秒
            await this.safeWait(1000);
        }
    }

    async dismissOverlay(options = {}) {
        const {
            x = 30,
            y = 30,
            waitBefore = 1000,
            waitAfter = 1000
        } = options;

        try {
            if (!this.page || this.page.isClosed()) return;
            await this.safeWait(waitBefore);
            await this.page.mouse.click(x, y);
            await this.safeWait(waitAfter);
        } catch (e) {
            console.log(`        关闭遮罩出错: ${e.message}`);
        }
    }

    // ========================================
    // 🔥 点击返回按钮（通用）
    // ========================================

    /**
     * 点击页面左上角的返回按钮
     * @returns {Promise<boolean>} 是否成功点击
     */
    async _clickBackButton() {
        const backSelectors = [
            '.ar_icon.back.back',        // 🔥 精确匹配 Withdraw 页面的返回按钮
            'span.ar_icon.back',         // 🔥 span 标签
            '.ranking-header-left',      // 🔥 Rescue 页面的返回区域
            '.van-nav-bar__left',        // 🔥 vant 组件库（Promotions 页面可能用这个）
            '.back-btn',
            '.nav-back',
            '[data-testid="back"]',
            '.header-back',
            '.go-back',
            '.arrow-left',
            '.icon-back',
            '.navbar-back',
            'header .left',              // 通用 header 左侧
            '.van-icon-arrow-left',      // vant 左箭头图标
            '[class*="arrow-left"]',     // 包含 arrow-left 的类名
            '[class*="back"]',           // 包含 back 的类名
            '[class*="header-left"]',    // 包含 header-left 的类名
        ];

        for (const selector of backSelectors) {
            try {
                const backBtn = this.page.locator(selector).first();
                const visible = await backBtn.isVisible({ timeout: 800 }).catch(() => false);
                if (visible) {
                    await backBtn.click();
                    console.log(`        ← 点击返回按钮: ${selector}`);
                    await this.safeWait(1500);
                    return true;
                }
            } catch (e) { }
        }

        // 🔥 最后尝试：点击左上角坐标（很多 APP 返回按钮在固定位置）
        console.log('        ← 未找到返回按钮选择器，尝试点击左上角坐标');
        await this.clickCorner('top-left');
        await this.safeWait(1500);
        return true;
    }

    // ========================================
    // 🔥 检测当前所在页面
    // ========================================

    /**
     * 检测是否在某个子页面（非首页）
     * 返回子页面名称，如果在首页返回 null
     */
    async _detectCurrentPage() {
        const subPages = [
            {
                name: 'Daily每日奖励页',
                checks: [
                    () => this.page.url().includes('/daily'),
                    () => this.page.getByText('Daily deposit rewards').isVisible({ timeout: 500 }).catch(() => false),
                ]
            },
            {
                name: 'Promotions活动资讯页',
                checks: [
                    () => this.page.url().includes('/activity'),
                    () => this.page.getByText('Promotions').isVisible({ timeout: 500 }).catch(() => false),
                ]
            },
            {
                name: 'Rescue页',
                checks: [
                    () => this.page.url().includes('/rescue'),
                    () => this.page.locator('.ranking-header').isVisible({ timeout: 500 }).catch(() => false),
                ]
            },
            {
                name: 'Withdraw页',
                checks: [
                    () => this.page.url().includes('/withdraw'),
                    () => this.page.getByText('Withdraw').isVisible({ timeout: 500 }).catch(() => false),
                    () => this.page.getByText('Cash Balance').isVisible({ timeout: 500 }).catch(() => false),
                ]
            },
            {
                name: '邀请转盘页',
                checks: [
                    // 🔥 优先通过 URL 判断
                    () => this.page.url().includes('/turntable'),
                    () => this.page.getByText('Invitation Wheel').isVisible({ timeout: 500 }).catch(() => false),
                    () => this.page.getByText('CASH OUT').isVisible({ timeout: 500 }).catch(() => false),
                ]
            },
            {
                name: '幸运礼包详情页',
                checks: [
                    () => this.page.getByText('Lucky Package').isVisible({ timeout: 500 }).catch(() => false),
                ]
            },
            {
                name: '活动详情页',
                checks: [
                    () => this.page.getByText('Event Details').isVisible({ timeout: 500 }).catch(() => false),
                ]
            }
        ];

        for (const subPage of subPages) {
            for (const check of subPage.checks) {
                const matched = await check();
                if (matched) {
                    return subPage.name;
                }
            }
        }

        return null; // 没匹配到子页面 → 认为在首页
    }

    /**
     * 快速检查是否在首页
     */
    async _isOnHomePage() {
        try {
            // 🔥 先排除已知的子页面
            const subPage = await this._detectCurrentPage();
            if (subPage) {
                console.log(`        📍 当前在: ${subPage}（非首页）`);
                return false;
            }

            // 检查首页特征
            const hasTabbar = await this.page.locator('#activity, #promotion, #home')
                .first()
                .isVisible({ timeout: 500 })
                .catch(() => false);

            if (hasTabbar) return true;

            const url = this.page.url();
            const baseUrl = new URL(dataConfig.url).pathname;
            const currentPath = new URL(url).pathname;
            if (currentPath === '/' || currentPath === '/home' || currentPath === baseUrl) {
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * 确保回到首页
     */
    async _ensureOnHomePage() {
        const maxRetries = 5;

        for (let i = 0; i < maxRetries; i++) {
            const onHome = await this._isOnHomePage();
            if (onHome) {
                console.log('        📍 已确认在首页');
                // 🔥 回到首页后检查弹窗
                await this.checkAndHandleHomePopups(20);
                return true;
            }

            const subPage = await this._detectCurrentPage();
            console.log(`        📍 第${i + 1}次尝试离开: ${subPage || '未知页面'}`);

            // 策略1: 点击 Home tab
            const homeTab = this.page.locator('#home');
            const homeVisible = await homeTab.isVisible({ timeout: 800 }).catch(() => false);
            if (homeVisible) {
                await homeTab.click();
                await this.safeWait(1500);

                // 点完 home tab 后再检查
                const check = await this._isOnHomePage();
                if (check) {
                    console.log('        ✓ 通过 Home tab 返回首页');
                    // 🔥 回到首页后检查弹窗
                    await this.checkAndHandleHomePopups(20);
                    return true;
                }
            }

            // 策略2: 点击返回按钮
            await this._clickBackButton();

            const check2 = await this._isOnHomePage();
            if (check2) {
                console.log('        ✓ 通过返回按钮回到首页');
                // 🔥 回到首页后检查弹窗
                await this.checkAndHandleHomePopups(20);
                return true;
            }

            // 策略3: 浏览器后退
            console.log('        ⚠️ 尝试浏览器后退');
            await this.page.goBack().catch(() => { });
            await this.safeWait(2000);
        }

        // 策略4: 兜底 —— 直接跳转
        console.log('        ⚠️ 所有策略失败，直接导航到首页URL');
        await this.page.goto(dataConfig.url);
        await this.safeWait(3000);
        // 🔥 强制导航后检查弹窗
        await this.checkAndHandleHomePopups(20);
        return true;
    }

    // ========================================
    // 登录流程
    // ========================================

    async login(options = {}) {
        const {
            phone = dataConfig.userName,
            areaCode = dataConfig.areaCodeData,
            skipIfLoggedIn = true
        } = options;

        if (skipIfLoggedIn && this.isLoggedIn) {
            console.log('      ✅ 已登录，跳过登录流程');
            return true;
        }

        try {
            await this.t.goto(dataConfig.url, { pageName: '首页' });

            await this.t.step('验证首页加载', async () => {
                await this.t.assert.textContains('#home', 'Home', '首页未找到 Home');
            });
            // 处理首页的认证弹窗
            await this.handlePopups();

            // 处理首页的登录前弹窗（.dialog-content）
            await this.handleDialogContent();

            await this.t.step('点击 Login 按钮', async () => {
                try {
                    await this.page.locator('.signin-btn.login').click({ timeout: 10000 });
                } catch (e) {
                    await this.page.locator('.signin-btn:has-text("Login")').click({ timeout: 10000 });
                }
            });

            await this.t.switchToPage('登录页', {
                waitForSelector: '[data-testid="login-tab-mobile"]',
                waitTime: 500,
                collectPreviousPage: true
            });

            await this.t.step('验证登录页', async () => {
                await this.t.assert.textEquals(
                    '[data-testid="login-tab-mobile"]',
                    'Phone number',
                    '登录页验证失败'
                );
            });

            const success = await this.performLogin(phone, areaCode);

            if (success) {
                this.isLoggedIn = true;
                console.log('\n      🎉 登录成功');

                console.log('      ⏳ 等待首页弹窗加载...');
                await this.safeWait(3000);

                await this.handlePostLoginPopups();
                console.log('      ✅ 弹窗已全部处理，首页已就绪');
            }

            return success;

        } catch (error) {
            console.error('      ❌ 登录失败:', error.message);
            return false;
        }
    }

    // ========================================
    // 登录后弹窗处理
    // ========================================

    async handlePostLoginPopups() {
        await this.t.step('处理登录后弹窗', async () => {
            await this._handleLuckyPackagePopup();
            await this._handleGenericPopups();
            await this._finalCleanup();
            console.log('        ✅ 所有弹窗处理完毕');
        });
    }

    /**
     * 处理幸运礼包弹窗的方法
     * 该方法会检查是否存在幸运礼包弹窗，并进行相应的操作
     */
    async _handleLuckyPackagePopup() {
        try {
            // 等待2秒，确保页面加载完成
            await this.safeWait(2000);

            // 查找"View My Bonus"按钮，并检查其是否可见
            const viewBonus = this.page.getByText('View My Bonus');
            const isVisible = await viewBonus.isVisible({ timeout: 5000 }).catch(() => false);

            // 如果没有找到幸运礼包弹窗，则跳过处理
            if (!isVisible) {
                console.log('        ℹ️ 无幸运礼包弹窗，跳过');
                return;
            }

            // 如果找到幸运礼包弹窗，则记录日志并点击查看按钮
            console.log('        🎁 发现幸运礼包弹窗');
            await viewBonus.click();
            await this.safeWait(2000);

            // 查找"Claim"按钮，并检查其是否可见
            const claimButton = this.page.getByText('Claim', { exact: true });
            const claimVisible = await claimButton.isVisible({ timeout: 3000 }).catch(() => false);

            // 如果Claim按钮可见，则点击它并记录日志
            if (claimVisible) {
                await claimButton.click();
                console.log('        ✓ 已点击 Claim，领取幸运礼包');
                await this.safeWait(2000);
            } else {
                // 如果Claim按钮不可见，则记录警告信息
                console.log('        ⚠️ 未发现 Claim 按钮');
            }

            // 🔥 不管 Claim 有没有成功，都要确保回到首页
            await this._ensureOnHomePage();
            console.log('        ✓ 已从幸运礼包返回首页');

        } catch (e) {
            console.log('        处理幸运礼包弹窗出错:', e.message);
            await this._ensureOnHomePage();
        }
    }

    /**
     * 🔥 循环处理通用弹窗（修复死循环问题）
     */
    async _handleGenericPopups() {
        const maxAttempts = 10;
        let attempts = 0;

        await this.safeWait(1000);

        while (attempts < maxAttempts) {
            attempts++;

            if (!this.page || this.page.isClosed()) {
                console.log('        页面已关闭，停止检查弹窗');
                break;
            }

            console.log(`        🔍 第${attempts}次检查子页面...`);

            // 🔥 第一步：检测是否在子页面，如果是就先离开
            const subPage = await this._detectCurrentPage();
            if (subPage) {
                console.log(`        📍 检测到在 ${subPage}，点击返回...`);
                await this._clickBackButton();
                await this.safeWait(1000);

                // 返回后再验证是否真的离开了
                const stillInSub = await this._detectCurrentPage();
                if (stillInSub === subPage) {
                    // 🔥 还在同一个子页面，说明返回按钮没生效
                    console.log(`        ⚠️ 返回按钮未生效，尝试点击 Home tab`);
                    const homeTab = this.page.locator('#home');
                    const homeVisible = await homeTab.isVisible({ timeout: 800 }).catch(() => false);
                    if (homeVisible) {
                        await homeTab.click();
                        await this.safeWait(1500);
                    } else {
                        // 最终兜底
                        console.log('        ⚠️ Home tab 不可见，直接导航');
                        await this.page.goto(dataConfig.url);
                        await this.safeWait(2000);
                    }
                }
                continue;
            }

            // 🔥 第二步：已经在首页了，跳出循环
            console.log(`        ✅ 第${attempts}次检查：已在首页`);
            break;
        }

        if (attempts >= maxAttempts) {
            console.warn(`        ⚠️ 已达最大尝试次数(${maxAttempts})，停止检查`);
        }

        // 🔥 确认在首页后，统一检查弹窗
        const onHome = await this._isOnHomePage();
        if (onHome) {
            console.log('        📍 确认在首页，开始检查弹窗...');
            await this.checkAndHandleHomePopups(20);
        }
    }

    /**
     * 🔥 获取首页弹窗配置数据
     * 从 /api/Home/GetCommonPopup 接口获取弹窗信息
     * @returns {Promise<Array>} 返回弹窗配置数组
     */
    async _getHomePopupConfig() {
        try {
            // 从网络监控中查找弹窗接口
            const apiRequests = this.t.networkMonitor.getApiRequests();
            const popupRequest = apiRequests.find(req =>
                req.url.includes('/api/Home/GetCommonPopup')
            );

            if (!popupRequest || !popupRequest.responseBody) {
                console.log('        ⚠️ 未找到首页弹窗接口数据');
                return [];
            }

            const response = popupRequest.responseBody;
            if (response.code === 0 && Array.isArray(response.data)) {
                console.log(`        📊 获取到 ${response.data.length} 个弹窗配置`);
                return response.data;
            }

            return [];
        } catch (error) {
            console.log(`        ⚠️ 解析弹窗配置失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 🔥 根据 jumpPageText 获取断言文本
     * @param {string} jumpPageText - 跳转页面文本（如"充值"、"洗码"等）
     * @returns {string|null} 返回断言文本，如果没有映射则返回 null
     */
    _getAssertTextByJumpPage(jumpPageText) {
        const jumpPageMap = {
            // 原有映射
            "充值": "Deposit",
            "洗码": "Rebate",
            "邀请转盘": "Invitation Wheel",
            "亏损救援金": "Loss Rebate",
            "每日签到": "Daily deposit rewards",

            // 新增映射
            "周卡月卡": "Promotions",
            "每日每周任务": "Tasks",
            "首页": "Home",
            "我的": "UID",  // 特殊处理：只需匹配 UID
            "充值转盘": "Deposit Wheel",
            "新版返佣": "My Rewards",
            "站内信": "Notifications",
            "锦标赛": "Championship",
            "VIP": "VIP",
            "超级大奖": "Super Jackpot",
            "优惠券": "Coupons",
            "礼品码": "Home",
            "提现": "Withdraw"
        };

        return jumpPageMap[jumpPageText] || null;
    }

    /**
     * 🔥 智能处理首页弹窗（基于接口数据）
     * 根据 jumpPageText 判断是否需要页面跳转
     * @param {Object} popupConfig - 弹窗配置对象
     * @returns {Promise<boolean>} 返回是否成功处理
     */
    async _handleSmartPopup(popupConfig) {
        try {
            const { popupInfo, title } = popupConfig;

            if (!popupInfo) {
                console.log('        ⚠️ 弹窗配置缺少 popupInfo');
                return false;
            }

            const jumpPageText = popupInfo.jumpPageText;
            console.log(`        📋 弹窗标题: ${title || '未知'}`);
            console.log(`        📋 跳转页面: ${jumpPageText || '无'}`);

            // 🔥 记录点击前的 URL
            const beforeUrl = this.page.url();
            console.log(`        📍 点击前 URL: ${beforeUrl}`);

            // 1. 查找并点击弹窗图片
            const imgSelectors = [
                '.popup_img',
                '.img_popup_img',
                '.popup-content img',
                '.popup-mask img'
            ];

            let imgClicked = false;
            for (const selector of imgSelectors) {
                const popupImg = this.page.locator(selector).first();
                const imgVisible = await popupImg.isVisible({ timeout: 1000 }).catch(() => false);

                if (imgVisible) {
                    console.log(`        🖼️ 点击弹窗图片 (${selector})...`);
                    await popupImg.click();
                    imgClicked = true;
                    await this.safeWait(2000);
                    break;
                }
            }

            if (!imgClicked) {
                console.log('        ⚠️ 未找到弹窗图片');
                return false;
            }

            // 🔥 记录点击后的 URL
            const afterUrl = this.page.url();
            console.log(`        📍 点击后 URL: ${afterUrl}`);

            // 🔥 检测是否出现充值支付弹窗（在判断路由变化之前）
            try {
                const { detectRechargeDialog, handleRechargeDialogPopup } = await import('../../scenarios/home-popup/recharge-dialog.js');
                const hasRechargeDialog = await detectRechargeDialog(this.page);

                if (hasRechargeDialog) {
                    console.log(`        💳 检测到充值支付弹窗，处理中...`);
                    const result = await handleRechargeDialogPopup(this.page, this, this.t);

                    if (result.success) {
                        console.log(`        ✅ 充值支付弹窗处理完成`);
                    } else {
                        console.log(`        ⚠️ 充值支付弹窗处理失败: ${result.error || result.reason}`);
                    }
                }
            } catch (rechargeError) {
                console.log(`        ⚠️ 充值支付弹窗检测失败: ${rechargeError.message}`);
            }

            // 2. 判断是否发生了路由跳转
            const urlChanged = afterUrl !== beforeUrl;
            console.log(`        📊 路由是否变化: ${urlChanged ? '是' : '否'}`);

            // 3. 根据 jumpPageText 和路由变化情况处理
            if (jumpPageText && urlChanged) {
                // 🔥 情况1: 有 jumpPageText 且路由变化 → 处理活动页面
                console.log(`        🎯 检测到页面跳转，处理活动页面...`);

                const assertText = this._getAssertTextByJumpPage(jumpPageText);

                if (assertText) {
                    console.log(`        ✓ 映射断言文本: ${assertText}`);

                    // 处理多个断言文本（用 / 分隔）
                    const assertTexts = assertText.includes('/')
                        ? assertText.split('/').map(t => t.trim())
                        : [assertText];

                    // 🔥 等待页面加载完成（等待最大元素或 3 秒）
                    console.log(`        ⏳ 等待页面加载完成...`);

                    // 尝试等待页面的主要内容加载
                    const loadWaitPromises = [
                        // 等待 3 秒兜底
                        this.page.waitForTimeout(3000),
                        // 尝试等待 domcontentloaded
                        this.page.waitForLoadState('domcontentloaded').catch(() => { }),
                        // 尝试等待网络空闲
                        this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { })
                    ];

                    await Promise.race(loadWaitPromises);
                    console.log(`        ✅ 页面加载完成`);

                    // 尝试每个断言文本
                    let assertSuccess = false;
                    let matchedAssertText = null;

                    for (const text of assertTexts) {
                        let selector;
                        let exists = false;

                        // 🔥 特殊处理：UID 只需要部分匹配
                        if (text === 'UID') {
                            // 使用正则表达式匹配包含 UID 的文本
                            selector = 'text=/UID/i';
                            exists = await this.page.locator(selector)
                                .first()
                                .isVisible({ timeout: 2000 })
                                .catch(() => false);

                            if (exists) {
                                console.log(`        ✅ 断言成功: ${text} (部分匹配)`);
                                assertSuccess = true;
                                matchedAssertText = text;
                                break;
                            }
                        } else {
                            // 普通文本匹配
                            selector = `text=${text}`;
                            exists = await this.page.locator(selector)
                                .isVisible({ timeout: 2000 })
                                .catch(() => false);

                            if (exists) {
                                console.log(`        ✅ 断言成功: ${text}`);
                                assertSuccess = true;
                                matchedAssertText = text;
                                break;
                            }
                        }
                    }

                    if (!assertSuccess) {
                        console.log(`        ⚠️ 断言失败，尝试的文本: ${assertTexts.join(', ')}`);
                    }

                    // 🔥 调用对应的活动处理函数
                    if (assertSuccess && matchedAssertText) {
                        try {
                            // 动态导入处理函数（使用正确的相对路径）
                            const { executePopupHandler } = await import('../../scenarios/home-popup/index.js');

                            const handlerResult = await executePopupHandler(
                                matchedAssertText,
                                this.page,
                                this,
                                this.t
                            );

                            if (handlerResult.success) {
                                console.log(`        ✅ 活动页面处理完成`);
                            } else if (handlerResult.skipped) {
                                console.log(`        ℹ️ 活动页面无需处理`);
                            } else {
                                console.log(`        ⚠️ 活动页面处理失败: ${handlerResult.error}`);
                            }
                        } catch (importError) {
                            console.log(`        ⚠️ 导入处理函数失败: ${importError.message}`);
                        }
                    }
                } else {
                    console.log(`        ⚠️ 未找到 "${jumpPageText}" 的断言映射`);
                    // 即使没有映射，也等待 3 秒
                    console.log(`        ⏳ 等待 3 秒...`);
                    await this.page.waitForTimeout(3000);
                }

                // 返回首页
                console.log(`        🔙 返回首页...`);
                await this.page.goBack();
                await this.safeWait(1500);

                // 确认返回成功
                const returnedUrl = this.page.url();
                if (returnedUrl === beforeUrl) {
                    console.log('        ✅ 成功返回首页');
                } else {
                    console.log('        ⚠️ 路由返回失败，尝试点击返回按钮...');
                    await this._clickBackButton();
                    await this.safeWait(1000);
                }

            } else if (urlChanged) {
                // 🔥 情况2: 没有 jumpPageText 但路由变化 → 等待后直接返回
                console.log(`        🔙 路由已变化但无 jumpPageText，等待后返回首页...`);

                // 等待 3 秒
                console.log(`        ⏳ 等待 3 秒...`);
                await this.page.waitForTimeout(3000);

                await this.page.goBack();
                await this.safeWait(1500);

            } else {
                // 🔥 情况3: 路由未变化 → 弹窗已自动关闭
                console.log('        ✅ 弹窗已关闭（路由未变化）');
            }

            return true;

        } catch (error) {
            console.log(`        ❌ 智能处理弹窗失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 🔥 智能识别当前显示的弹窗
     * @param {Array} popupConfigs - 弹窗配置数组
     * @param {Set} processedPopups - 已处理的弹窗集合
     * @returns {Promise<Object>} 返回识别结果 { matched: boolean, config: Object, title: string, identifier: string, isSecondTime: boolean }
     */
    async _identifyCurrentPopup(popupConfigs, processedPopups) {
        try {
            // 🔥 优先通过金额按钮识别弹窗（最准确的标识）
            let popupIdentifier = null;
            const otherBtn = this.page.locator('.popup-content .otherBtn').first();
            const otherBtnVisible = await otherBtn.isVisible({ timeout: 500 }).catch(() => false);

            if (otherBtnVisible) {
                const amount = await otherBtn.textContent().catch(() => null);
                if (amount) {
                    popupIdentifier = `amount:${amount.trim()}`;
                    console.log(`        💰 弹窗金额: ${amount.trim()}`);

                    // 🔥 检查是否已经处理过这个金额的弹窗
                    if (processedPopups.has(popupIdentifier)) {
                        console.log(`        🔄 检测到重复弹窗（相同金额），将直接关闭`);
                        return {
                            matched: true,
                            config: null,
                            title: '重复弹窗',
                            identifier: popupIdentifier,
                            isLuckyPackage: false,
                            isSecondTime: true  // 🔥 标记为第二次遇到
                        };
                    }
                }
            }

            // 🔥 如果没有金额按钮，尝试通过图片 src 识别
            if (!popupIdentifier) {
                const popupImg = this.page.locator('.popup-content img.popup_img').first();
                const imgVisible = await popupImg.isVisible({ timeout: 500 }).catch(() => false);

                if (imgVisible) {
                    const imageSrc = await popupImg.getAttribute('src').catch(() => null);
                    if (imageSrc) {
                        popupIdentifier = `image:${imageSrc}`;
                        console.log(`        🖼️ 弹窗图片: ${imageSrc}`);

                        // 检查是否已经处理过这个图片的弹窗
                        if (processedPopups.has(popupIdentifier)) {
                            console.log(`        🔄 检测到重复弹窗（相同图片），将直接关闭`);
                            return {
                                matched: true,
                                config: null,
                                title: '重复弹窗',
                                identifier: popupIdentifier,
                                isLuckyPackage: false,
                                isSecondTime: true
                            };
                        }
                    }
                }
            }

            // 1. 优先检查"幸运礼包"弹窗（通过特征文本识别）
            const luckyPackageTexts = [
                'View My Bonus',
                'Lucky Jackpot',
                'Welcome to',
                "You're One of Today's Lucky Winners",
                'Lucky Package'
            ];

            for (const text of luckyPackageTexts) {
                const hasText = await this.page.getByText(text, { exact: false })
                    .isVisible({ timeout: 500 })
                    .catch(() => false);

                if (hasText) {
                    console.log(`        🎁 通过文本 "${text}" 识别为幸运礼包弹窗`);

                    // 查找幸运礼包的配置
                    const luckyConfig = popupConfigs.find(config =>
                        config.title && (
                            config.title.includes('幸运礼包') ||
                            config.title.includes('Lucky') ||
                            config.title.includes('Welcome')
                        )
                    );

                    if (luckyConfig) {
                        return {
                            matched: true,
                            config: luckyConfig,
                            title: luckyConfig.title,
                            identifier: popupIdentifier || 'lucky-package',
                            isLuckyPackage: true,
                            isSecondTime: false
                        };
                    } else {
                        // 即使没有配置，也返回一个默认的幸运礼包处理配置
                        return {
                            matched: true,
                            config: {
                                title: '幸运礼包',
                                popupInfo: {
                                    jumpPageText: null // 幸运礼包不跳转
                                }
                            },
                            title: '幸运礼包',
                            identifier: popupIdentifier || 'lucky-package',
                            isLuckyPackage: true,
                            isSecondTime: false
                        };
                    }
                }
            }

            // 2. 尝试通过弹窗内的文本内容匹配配置
            for (const config of popupConfigs) {
                // 尝试匹配标题
                if (config.title) {
                    const hasTitle = await this.page.getByText(config.title, { exact: false })
                        .isVisible({ timeout: 500 })
                        .catch(() => false);

                    if (hasTitle) {
                        console.log(`        ✅ 通过标题 "${config.title}" 匹配到弹窗配置`);
                        return {
                            matched: true,
                            config: config,
                            title: config.title,
                            identifier: popupIdentifier || config.title,
                            isLuckyPackage: false,
                            isSecondTime: false
                        };
                    }
                }

                // 尝试匹配跳转页面文本
                if (config.popupInfo?.jumpPageText) {
                    const jumpText = config.popupInfo.jumpPageText;
                    const hasJumpText = await this.page.getByText(jumpText, { exact: false })
                        .isVisible({ timeout: 500 })
                        .catch(() => false);

                    if (hasJumpText) {
                        console.log(`        ✅ 通过跳转文本 "${jumpText}" 匹配到弹窗配置`);
                        return {
                            matched: true,
                            config: config,
                            title: config.title,
                            identifier: popupIdentifier || jumpText,
                            isLuckyPackage: false,
                            isSecondTime: false
                        };
                    }
                }
            }

            // 3. 无法识别，但如果有标识符，也返回匹配成功
            if (popupIdentifier) {
                console.log(`        📋 无法识别弹窗类型，但检测到弹窗标识`);
                return {
                    matched: true,
                    config: null,
                    title: '未知弹窗',
                    identifier: popupIdentifier,
                    isLuckyPackage: false,
                    isSecondTime: false
                };
            }

            // 4. 完全无法识别
            return {
                matched: false,
                config: null,
                title: null,
                identifier: null,
                isLuckyPackage: false,
                isSecondTime: false
            };

        } catch (error) {
            console.log(`        ⚠️ 识别弹窗失败: ${error.message}`);
            return {
                matched: false,
                config: null,
                title: null,
                identifier: null,
                isLuckyPackage: false,
                isSecondTime: false
            };
        }
    }

    /**
     * 🔥 循环检查并处理首页弹窗（通用函数）
     * 每次进入 Home 页面时都应该调用此函数
     * @param {number} maxChecks - 最大检查次数，默认 20
     * @returns {Promise<number>} 返回处理的弹窗数量
     */
    async checkAndHandleHomePopups(maxChecks = 20) {
        console.log(`        🔍 开始检查首页弹窗（最多 ${maxChecks} 次）...`);

        // 🔥 获取弹窗配置数据
        const popupConfigs = await this._getHomePopupConfig();
        const processedPopups = new Set(); // 记录已处理的弹窗（通过 identifier）

        let popupCount = 0;
        let checkCount = 0;

        while (checkCount < maxChecks) {
            checkCount++;

            // 🔥 检查是否有弹窗（使用多个选择器逐个尝试）
            let hasPopup = false;

            // 尝试多个选择器
            const selectors = [
                '.popup-content',
                '.popup-mask',
                '.modal-overlay',
                'div.popup-content',
                '[class*="popup"]'
            ];

            for (const selector of selectors) {
                const visible = await this.page.locator(selector)
                    .first()
                    .isVisible({ timeout: 500 })
                    .catch(() => false);

                if (visible) {
                    hasPopup = true;
                    console.log(`        ✓ 通过选择器 "${selector}" 检测到弹窗`);
                    break;
                }
            }

            if (hasPopup) {
                popupCount++;
                console.log(`        🎁 第${checkCount}次检查：发现第${popupCount}个弹窗，处理中...`);

                // 🔥 优先检查是否是红包雨活动
                const { detectRedPackRain, waitForRedPackRainEnd } = await import('../../scenarios/home-popup/red-pack-rain.js');
                const redPackDetection = await detectRedPackRain(this.page);

                if (redPackDetection.isActive) {
                    console.log(`        🌧️ 检测到红包雨活动正在进行`);
                    const waitResult = await waitForRedPackRainEnd(this.page, {
                        maxWaitTime: 10000,
                        checkInterval: 1000
                    });

                    if (waitResult.success) {
                        console.log(`        ✅ 红包雨活动已结束，继续检查其他弹窗`);
                    } else {
                        console.log(`        ⚠️ 红包雨等待超时，继续执行`);
                    }

                    // 红包雨结束后继续检查是否还有其他弹窗
                    await this.safeWait(1000);
                    continue;
                }

                // 🔥 智能识别当前弹窗类型
                const currentPopupInfo = await this._identifyCurrentPopup(popupConfigs, processedPopups);

                if (currentPopupInfo.matched) {
                    console.log(`        ✅ 识别到弹窗: ${currentPopupInfo.title || '未知'}`);

                    // 🔥 如果是第二次遇到，直接点击关闭按钮
                    if (currentPopupInfo.isSecondTime) {
                        console.log(`        🔄 第二次遇到此弹窗，直接关闭`);
                        const closeBtn = this.page.locator('.popup-content .popup-close').first();
                        const closeBtnVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);

                        if (closeBtnVisible) {
                            await closeBtn.click();
                            console.log(`        ✅ 已点击关闭按钮`);
                            await this.safeWait(500);
                        } else {
                            console.log(`        ⚠️ 未找到关闭按钮，使用传统方式`);
                            await this.dismissOverlay();
                        }
                    }
                    // 🔥 特殊处理幸运礼包
                    else if (currentPopupInfo.isLuckyPackage) {
                        console.log(`        🎁 使用幸运礼包专用处理逻辑`);
                        const luckySuccess = await this._handleLuckyPackagePopup();

                        if (!luckySuccess) {
                            console.log(`        ⚠️ 幸运礼包处理失败，使用传统方式`);
                            const closeSuccess = await this._tryClosePopup();
                            if (!closeSuccess) {
                                console.log(`        ⚠️ _tryClosePopup 失败，尝试 dismissOverlay`);
                                await this.dismissOverlay();
                            }
                        }
                    } else {
                        // 普通弹窗使用智能处理
                        console.log(`        📋 使用配置数据处理弹窗`);
                        const smartSuccess = await this._handleSmartPopup(currentPopupInfo.config);

                        if (!smartSuccess) {
                            console.log(`        ⚠️ 智能处理失败，使用传统方式`);
                            const closeSuccess = await this._tryClosePopup();
                            if (!closeSuccess) {
                                console.log(`        ⚠️ _tryClosePopup 失败，尝试 dismissOverlay`);
                                await this.dismissOverlay();
                            }
                        }
                    }

                    // 标记已处理
                    if (currentPopupInfo.identifier) {
                        processedPopups.add(currentPopupInfo.identifier);
                    }
                } else {
                    // 🔥 无法识别，使用传统方式
                    console.log(`        � 无法识别弹窗类型，使用传统方式处理`);
                    const closeSuccess = await this._tryClosePopup();
                    if (!closeSuccess) {
                        console.log(`        ⚠️ _tryClosePopup 失败，尝试 dismissOverlay`);
                        await this.dismissOverlay();
                    }
                }

                await this.safeWait(1000);
            } else {
                console.log(`        ✅ 第${checkCount}次检查：无弹窗`);
                break;
            }
        }

        if (checkCount >= maxChecks) {
            console.log(`        ⚠️ 已达最大检查次数(${maxChecks})，停止检查`);
        }

        console.log(`        📊 弹窗检查完成：共处理 ${popupCount} 个弹窗`);
        return popupCount;
    }

    /**
     * 🔥 尝试关闭 popup-content 弹窗
     * 逻辑：记录当前 URL → 点击弹窗图片 → 等待跳转 → 路由返回 → 如果路由未变则点击返回按钮 → 失败则截图报错
     */
    async _tryClosePopup() {
        try {
            // 🔥 记录点击前的 URL
            const beforeUrl = this.page.url();
            console.log(`        📍 点击前 URL: ${beforeUrl}`);

            // 1. 查找并点击弹窗图片（多种选择器）
            const imgSelectors = [
                '.popup_img',
                '.img_popup_img',
                '.popup-content img',
                '.popup-mask img'
            ];

            let imgClicked = false;
            for (const selector of imgSelectors) {
                const popupImg = this.page.locator(selector).first();
                const imgVisible = await popupImg.isVisible({ timeout: 1000 }).catch(() => false);

                if (imgVisible) {
                    console.log(`        🖼️ 点击弹窗图片 (${selector})...`);
                    await popupImg.click();
                    imgClicked = true;
                    await this.safeWait(2000);
                    break;
                }
            }

            if (!imgClicked) {
                console.log('        ⚠️ 未找到弹窗图片，尝试其他关闭方式');
                const closeSelectors = ['.popup-close', '.modal-close', '.close-btn', '[data-testid="close"]'];

                for (const selector of closeSelectors) {
                    try {
                        const el = this.page.locator(selector).first();
                        const visible = await el.isVisible({ timeout: 500 }).catch(() => false);
                        if (visible) {
                            await el.click();
                            console.log(`        ✓ 通过 ${selector} 关闭弹窗`);
                            await this.safeWait(1000);
                            return true;
                        }
                    } catch (e) { }
                }
                return false;
            }

            // 🔥 记录点击后的 URL
            const afterUrl = this.page.url();
            console.log(`        📍 点击后 URL: ${afterUrl}`);

            // 🔥 检测是否出现充值支付弹窗（在判断路由变化之前）
            try {
                const { detectRechargeDialog, handleRechargeDialogPopup } = await import('../../scenarios/home-popup/recharge-dialog.js');
                const hasRechargeDialog = await detectRechargeDialog(this.page);

                if (hasRechargeDialog) {
                    console.log(`        💳 检测到充值支付弹窗，处理中...`);
                    const result = await handleRechargeDialogPopup(this.page, this, this.t);

                    if (result.success) {
                        console.log(`        ✅ 充值支付弹窗处理完成`);
                        return true;
                    } else {
                        console.log(`        ⚠️ 充值支付弹窗处理失败: ${result.error || result.reason}`);
                    }
                }
            } catch (rechargeError) {
                console.log(`        ⚠️ 充值支付弹窗检测失败: ${rechargeError.message}`);
            }

            // 2. 检查是否跳转到了子页面
            const subPage = await this._detectCurrentPage();

            if (subPage) {
                console.log(`        📍 检测到跳转到了 ${subPage}`);

                // 🔥 优先策略：路由返回
                if (afterUrl !== beforeUrl) {
                    console.log(`        🔙 URL 已变化，使用路由返回 (goBack)...`);
                    await this.page.goBack();
                    await this.safeWait(1500);

                    const returnedUrl = this.page.url();
                    console.log(`        📍 返回后 URL: ${returnedUrl}`);

                    const stillInSub = await this._detectCurrentPage();
                    if (stillInSub) {
                        console.log(`        ⚠️ 路由返回后仍在 ${stillInSub}，尝试点击返回按钮...`);
                        await this._clickBackButton();
                        await this.safeWait(1000);

                        const finalCheck = await this._detectCurrentPage();
                        if (finalCheck) {
                            const errorMsg = `返回失败：路由返回和点击返回按钮都无效，仍在 ${finalCheck}`;
                            console.log(`        ❌ ${errorMsg}`);

                            if (this.t && this.t.captureErrorScreenshot) {
                                await this.t.captureErrorScreenshot('popup-return-failed');
                            }

                            console.log(`        ⚠️ 强制导航到首页`);
                            await this.page.goto(dataConfig.url);
                            await this.safeWait(2000);
                        } else {
                            console.log('        ✅ 通过点击返回按钮成功返回 Home');
                        }
                    } else {
                        console.log('        ✅ 路由返回成功');
                    }
                } else {
                    // 🔥 URL 未变化，使用点击返回按钮
                    console.log(`        🔙 URL 未变化，使用点击返回按钮...`);
                    await this._clickBackButton();
                    await this.safeWait(1000);

                    const stillInSub = await this._detectCurrentPage();
                    if (stillInSub) {
                        const errorMsg = `返回失败：点击返回按钮无效，仍在 ${stillInSub}`;
                        console.log(`        ❌ ${errorMsg}`);

                        if (this.t && this.t.captureErrorScreenshot) {
                            await this.t.captureErrorScreenshot('popup-click-back-failed');
                        }

                        console.log(`        ⚠️ 强制导航到首页`);
                        await this.page.goto(dataConfig.url);
                        await this.safeWait(2000);
                    } else {
                        console.log('        ✅ 点击返回按钮成功');
                    }
                }
            } else {
                console.log('        ✅ 弹窗已关闭（未跳转到子页面）');
            }

            return true;

        } catch (e) {
            console.log(`        ❌ 关闭弹窗失败: ${e.message}`);
            return false;
        }
    }

    async _checkOtherPopups() {
        const otherSelectors = [
            { selector: '.modal-overlay', name: '模态遮罩' },
            { selector: '.dialog-wrapper', name: '对话框' },
            { selector: '.popup-mask', name: '弹窗蒙版' }
        ];

        for (const { selector, name } of otherSelectors) {
            try {
                const visible = await this.page.locator(selector)
                    .isVisible({ timeout: 500 })
                    .catch(() => false);

                if (visible) {
                    console.log(`        🔄 发现${name}，正在关闭...`);
                    await this._tryClosePopup();
                    await this.dismissOverlay();
                    return true;
                }
            } catch (e) { }
        }

        return false;
    }

    async _finalCleanup() {
        await this.safeWait(1000);

        // 确保在首页
        const subPage = await this._detectCurrentPage();
        if (subPage) {
            console.log(`        🧹 最终清理：还在 ${subPage}，返回首页`);
            await this._ensureOnHomePage();
        }

        // 最后一次弹窗检查
        const anyPopup = await this.page.locator('.popup-content, .modal-overlay, .popup-mask')
            .isVisible({ timeout: 1000 })
            .catch(() => false);

        if (anyPopup) {
            console.log('        🧹 最终清理：发现残留弹窗');
            await this._tryClosePopup();
            await this.dismissOverlay();
        }

        // 最终确认
        const onHome = await this._isOnHomePage();
        if (onHome) {
            console.log('        ✅ 最终确认：在首页，页面干净');
            // 🔥 在首页，检查弹窗
            await this.checkAndHandleHomePopups(20);
        } else {
            console.log('        ⚠️ 最终确认：不在首页，强制导航');
            await this.page.goto(dataConfig.url);
            await this.safeWait(2000);

            // 🔥 强制导航后检查弹窗
            await this.checkAndHandleHomePopups(20);
        }
    }

    // ========================================
    // 登录前弹窗处理
    // ========================================

    async handlePopups() {
        await this.t.step('检查登录前弹窗', async () => {
            const selectors = ['text=Claim My Bonus', '.popup-close', '.modal-close', '.dialog-close'];

            for (const selector of selectors) {
                try {
                    const el = this.page.locator(selector).first();
                    const isVisible = await el.isVisible({ timeout: 1500 }).catch(() => false);

                    if (isVisible) {
                        await el.click({ timeout: 3000 });
                        await this.page.waitForTimeout(500);
                        console.log(`        ✓ 关闭: ${selector}`);
                    }
                } catch (e) {
                    // 静默处理，继续尝试下一个选择器
                }
            }
        });
    }

    /**
     * 处理 .dialog-content 弹窗
     * 检测到 .dialog-content 后，点击其下的 .close.close2 按钮
     */
    async handleDialogContent() {
        try {
            // 检测 .dialog-content 是否存在
            const dialogContent = this.page.locator('.dialog-content');
            const isVisible = await dialogContent.isVisible({ timeout: 2000 }).catch(() => false);

            if (!isVisible) {
                return; // 没有弹窗，直接返回
            }

            console.log('        ℹ️ 检测到 .dialog-content 弹窗');

            // 尝试点击 .close.close2 按钮（优先）
            const closeBtn = this.page.locator('.close.close2');
            const closeBtnVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);

            if (closeBtnVisible) {
                await closeBtn.click({ timeout: 3000 });
                console.log('        ✓ 关闭弹窗: .close.close2');
                await this.page.waitForTimeout(500);
                return;
            }

            // 备用方案：尝试其他关闭按钮
            const fallbackSelectors = [
                '.dialog-content .close',
                '.dialog-content .ar_icon.close',
                '.dialog-content [aria-label="Close"]',
                '.dialog-footer button'
            ];

            for (const selector of fallbackSelectors) {
                try {
                    const btn = this.page.locator(selector).first();
                    const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);

                    if (visible) {
                        await btn.click({ timeout: 3000 });
                        console.log(`        ✓ 关闭弹窗: ${selector}`);
                        await this.page.waitForTimeout(500);
                        return;
                    }
                } catch (e) {
                    // 继续尝试下一个
                }
            }

            console.log('        ⚠️ 未找到可用的关闭按钮');

        } catch (error) {
            console.log(`        ⚠️ 处理 .dialog-content 弹窗失败: ${error.message}`);
            // 不抛出错误，继续执行
        }
    }

    /**
     * 选择手机区号
     * @param {string} targetAreaCode - 目标区号（例如 "91"）
     * @returns {Promise<Object>} 返回选择结果
     */
    async selectPhoneAreaCode(targetAreaCode) {
        try {
            console.log(`      🌍 检查手机区号...`);

            // 获取当前显示的区号
            const currentCodeElement = this.page.getByTestId('phone-area-code');
            const currentCode = await currentCodeElement.textContent({ timeout: 3000 });

            console.log(`      📍 当前区号: ${currentCode}`);
            console.log(`      🎯 目标区号: +${targetAreaCode}`);

            // 如果当前区号已经是目标区号，直接返回成功
            if (currentCode === '+' + targetAreaCode) {
                console.log(`      ✅ 区号已经是 +${targetAreaCode}，无需切换`);
                return {
                    success: true,
                    alreadySelected: true,
                    currentCode
                };
            }

            // 需要切换区号
            console.log(`      🔄 需要切换区号: ${currentCode} → +${targetAreaCode}`);

            // 点击区号选择器打开下拉列表
            const areaSelector = this.page.locator('[data-testid="login-phone-area"]');
            await areaSelector.click();
            console.log(`      ✅ 已点击区号选择器`);

            // 等待下拉列表出现
            await this.page.waitForTimeout(500);

            // 检查下拉列表是否可见
            const optionsList = this.page.locator('[data-testid="phone-area-list"]');
            const isListVisible = await optionsList.isVisible({ timeout: 2000 }).catch(() => false);

            if (!isListVisible) {
                return {
                    success: false,
                    error: '下拉列表未出现'
                };
            }

            console.log(`      ✅ 下拉列表已展开`);

            // 获取所有可用的区号选项
            const options = this.page.locator('[data-testid^="phone-area-option-"]');
            const optionCount = await options.count();
            console.log(`      📋 找到 ${optionCount} 个区号选项`);

            // 查找目标区号选项
            const targetOption = this.page.locator(`[data-testid="phone-area-option-${targetAreaCode}"]`);
            const targetExists = await targetOption.count() > 0;

            if (!targetExists) {
                // 获取所有可用区号用于错误信息
                const availableCodes = [];
                for (let i = 0; i < optionCount; i++) {
                    const optionText = await options.nth(i).textContent();
                    const codeMatch = optionText.match(/\+(\d+)/);
                    if (codeMatch) {
                        availableCodes.push(codeMatch[1]);
                    }
                }

                const errorMsg = `下拉列表中没有找到区号 +${targetAreaCode}。可用区号: ${availableCodes.join(', ')}`;
                console.log(`      ❌ ${errorMsg}`);

                return {
                    success: false,
                    error: errorMsg,
                    availableCodes
                };
            }

            // 点击目标区号选项
            await targetOption.click();
            console.log(`      ✅ 已点击区号 +${targetAreaCode}`);

            // 等待选择生效
            await this.page.waitForTimeout(500);

            // 验证区号是否切换成功
            const newCode = await currentCodeElement.textContent({ timeout: 2000 });

            if (newCode === '+' + targetAreaCode) {
                console.log(`      ✅ 区号切换成功: ${newCode}`);
                return {
                    success: true,
                    switched: true,
                    oldCode: currentCode,
                    newCode
                };
            } else {
                return {
                    success: false,
                    error: `区号切换失败，当前仍为 ${newCode}`
                };
            }

        } catch (error) {
            console.log(`      ❌ 区号选择过程出错: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========================================
    // 登录执行逻辑
    // ========================================

    async performLogin(phone, areaCode) {
        const hasOtp = await this.page.locator('[data-testid="login-switch-otp"]').isVisible();
        if (!hasOtp) {
            console.log('      ⚠️ 未找到 OTP 登录');
            return false;
        }

        await this.t.step('切换 OTP 登录', async () => {
            await this.page.getByTestId('login-switch-otp').click();
            await this.page.waitForTimeout(1500);
        });

        await this.t.step('验证 OTP 页面', async () => {
            await this.t.assert.textEquals('[data-testid="login-send-code-btn"]', 'Send', '未找到 Send');
        });

        // 🔥 检查并切换区号
        const areaCodeResult = await this.selectPhoneAreaCode(areaCode);
        if (!areaCodeResult.success) {
            console.log(`      ❌ 区号选择失败: ${areaCodeResult.error}`);
            throw new Error(`区号选择失败: ${areaCodeResult.error}`);
        }

        await this.t.step('输入手机号', async () => {
            await this.page.locator('[data-testid="form-input-userName"]').fill(phone);
        });

        await this.t.step('发送验证码', async () => {
            await this.page.locator('[data-testid="login-send-code-btn"]').click();
        });

        // 等待验证码发送到后台系统（增加等待时间）
        await this.page.waitForTimeout(3000);

        const code = await this.getVerifyCode(areaCode + phone);
        if (!code) return false;

        await this.t.step('输入验证码', async () => {
            await this.page.getByTestId('form-input-verifyCode').click();
            await this.page.getByTestId('form-input-verifyCode').fill(code);
        });

        await this.t.step('提交登录', async () => {
            const loginApiPromise = this.page.waitForResponse(
                res => res.url().includes('/api/') &&
                    (res.url().includes('login') || res.url().includes('signin')),
                { timeout: 3000 }
            ).catch(() => null);

            await this.page.getByTestId('login-submit-btn').click();

            const loginRes = await loginApiPromise;
            if (loginRes) {
                console.log(`        📡 登录响应: ${loginRes.status()}`);
            }
        });

        await this.page.waitForTimeout(500);

        await this.t.switchToPage('登录成功页', {
            waitTime: 2000,
            collectPreviousPage: true
        });

        await this.page.waitForTimeout(2000);

        const success = await this.verifyLoginSuccess();

        if (success) {
            await this.t.step('确认登录成功', async () => {
                console.log('        ✓ 已进入主页面');
                console.log('        🔗 URL:', this.page.url());
            });

            // 🔥 获取用户信息（userId）
            await this.getUserInfo();
        }

        return success;
    }

    async getVerifyCode(phoneWithCode, maxRetries = 3) {
        let result = '';

        await this.t.step('获取验证码', async () => {
            console.log(`        📱 ${phoneWithCode}`);
            result = await getSmss(phoneWithCode);

            if (!result) {
                for (let i = 0; i < maxRetries; i++) {
                    console.log(`        ⏳ 重试 ${i + 1}/${maxRetries}...`);
                    await this.page.waitForTimeout(2000);
                    result = await getSmss(phoneWithCode);
                    if (result) break;
                }
            }

            if (result) {
                console.log(`        ✅ 验证码: ${result}`);
            } else {
                console.log(`        ❌ 获取失败`);
            }
        });

        return result;
    }

    async verifyLoginSuccess() {
        try {
            const loginBtn = await this.page.locator('.signin-btn.login').isVisible({ timeout: 3000 });
            if (!loginBtn) return true;

            const userInfo = await this.page.locator('[data-testid="user-info"], .user-avatar').first().isVisible({ timeout: 3000 });
            if (userInfo) return true;

            const url = this.page.url();
            if (!url.includes('login') && !url.includes('signin')) return true;

            return false;
        } catch (e) {
            return true;
        }
    }
    /**
 * 点击页面指定角落
 * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'|'center'} position
 * @param {number} margin - 距边缘的距离，默认 30px
 */
    async clickCorner(position = 'bottom-right', margin = 30) {
        try {
            if (!this.page || this.page.isClosed()) return;

            const { width, height } = this.page.viewportSize();

            const positions = {
                'top-left': { x: margin, y: margin },
                'top-right': { x: width - margin, y: margin },
                'bottom-left': { x: margin, y: height - margin },
                'bottom-right': { x: width - margin, y: height - margin },
                'center': { x: width / 2, y: height / 2 },
            };

            const { x, y } = positions[position] || positions['bottom-right'];
            await this.page.mouse.click(x, y);
            console.log(`        🖱️ 点击 ${position} (${x}, ${y})`);
        } catch (e) {
            console.log(`        点击${position}出错: ${e.message}`);
        }
    }

    /**
     * 🔥 获取用户信息（从 /api/User/GetUserInfo 接口）
     * 提取 userId 并存储到 auth 对象中
     */
    async getUserInfo() {
        try {
            console.log('        🔍 获取用户信息...');

            // 等待接口响应
            await this.page.waitForTimeout(1000);

            // 从网络监控中查找用户信息接口
            const apiRequests = this.t.networkMonitor.getApiRequests();
            const userInfoRequest = apiRequests.find(req =>
                req.url.includes('/api/User/GetUserInfo')
            );

            if (!userInfoRequest || !userInfoRequest.responseBody) {
                console.log('        ⚠️ 未找到用户信息接口数据');
                return false;
            }

            const response = userInfoRequest.responseBody;

            // 提取 userId
            if (response.code === 0 && response.data && response.data.userId) {
                this.userId = response.data.userId;
                console.log(`        ✅ 获取到 userId: ${this.userId}`);
                return true;
            } else {
                console.log('        ⚠️ 用户信息接口响应格式异常');
                console.log('        📊 响应数据:', JSON.stringify(response).substring(0, 200));
                return false;
            }

        } catch (error) {
            console.log(`        ❌ 获取用户信息失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 🔥 获取存储的 userId
     * @returns {number|null} 返回 userId，如果未获取则返回 null
     */
    getUserId() {
        return this.userId;
    }

    async logout() {
        if (!this.isLoggedIn) return;
        this.isLoggedIn = false;
        this.userId = null; // 🔥 清除 userId
    }
}

export async function ensureLoggedIn(t, options = {}) {
    const auth = new AuthHelper(t);
    const success = await auth.login(options);
    if (!success) throw new Error('登录失败');
    return auth;
}