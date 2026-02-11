// src/utils/auth.js
import { getSmss } from '../api/smss.test.js';
import { dataConfig } from '../../config.js';

export class AuthHelper {
    constructor(testCase) {
        this.t = testCase;
        this.page = testCase.page;
        this.isLoggedIn = false;
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
            '.back-btn',
            '.nav-back',
            '[data-testid="back"]',
            '.header-back',
            '.go-back',
            '.arrow-left',
            '.icon-back',
            '.van-nav-bar__left',       // vant 组件库
            '.navbar-back',
            'header .left',              // 通用 header 左侧
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
                name: '邀请转盘页',
                checks: [
                    () => this.page.getByText('Cash everyday').isVisible({ timeout: 800 }).catch(() => false),
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
                    return true;
                }
            }

            // 策略2: 点击返回按钮
            await this._clickBackButton();

            const check2 = await this._isOnHomePage();
            if (check2) {
                console.log('        ✓ 通过返回按钮回到首页');
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

            // 处理首页的登录前弹窗（.dialog-body）
            try {
                const dialogBody = this.page.locator('.dialog-body');
                const isDialog = await dialogBody.isVisible({ timeout: 2000 }).catch(() => false);

                if (isDialog) {
                    console.log('        ℹ️ 检测到 .dialog-body 弹窗');

                    // 尝试多种关闭方式
                    const closeSelectors = ['.close', '.dialog-close', 'button:has-text("Close")', '[aria-label="Close"]'];

                    for (const selector of closeSelectors) {
                        try {
                            const closeBtn = this.page.locator(selector).first();
                            const isVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);

                            if (isVisible) {
                                await closeBtn.click({ timeout: 3000 });
                                console.log(`        ✓ 关闭弹窗: ${selector}`);
                                await this.page.waitForTimeout(500);
                                break;
                            }
                        } catch (e) {
                            // 继续尝试下一个选择器
                        }
                    }
                }
            } catch (error) {
                console.log(`      ⚠️ 登录前弹窗处理失败: ${error.message}`);
                // 不抛出错误，继续执行
            }

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

            console.log(`        🔍 第${attempts}次检查弹窗...`);

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

            // 🔥 第二步：在首页了，检查弹窗
            const popupContentVisible = await this.page.locator('.popup-content')
                .isVisible({ timeout: 1000 })
                .catch(() => false);

            if (popupContentVisible) {
                console.log(`        🔄 发现 popup-content 弹窗，正在关闭...`);

                const closeSuccess = await this._tryClosePopup();
                if (!closeSuccess) {
                    await this.dismissOverlay();
                }

                await this.safeWait(1000);
                continue;
            }

            // 第三步：检查其他类型弹窗
            const otherPopup = await this._checkOtherPopups();
            if (otherPopup) {
                continue;
            }

            // 没有弹窗也不在子页面
            console.log(`        ✅ 第${attempts}次检查：无弹窗，页面干净`);
            break;
        }

        if (attempts >= maxAttempts) {
            console.warn(`        ⚠️ 已达最大尝试次数(${maxAttempts})，停止检查`);
        }
    }

    async _tryClosePopup() {
        const closeSelectors = [
            '.popup_img',
            '.popup-close',
            '.modal-close',
            '.close-btn',
            '[data-testid="close"]'
        ];

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
        } else {
            console.log('        ⚠️ 最终确认：不在首页，强制导航');
            await this.page.goto(dataConfig.url);
            await this.safeWait(2000);
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

        const currentCode = await this.page.getByTestId('phone-area-code').textContent();
        if (currentCode !== '+' + areaCode) {
            console.log(`      ⚠️ 区号不匹配: ${currentCode}`);
            return false;
        }

        await this.t.step('输入手机号', async () => {
            await this.page.locator('[data-testid="form-input-userName"]').fill(phone);
        });

        await this.t.step('发送验证码', async () => {
            await this.page.locator('[data-testid="login-send-code-btn"]').click();
        });

        await this.page.waitForTimeout(1000);

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

    async logout() {
        if (!this.isLoggedIn) return;
        this.isLoggedIn = false;
    }
}

export async function ensureLoggedIn(t, options = {}) {
    const auth = new AuthHelper(t);
    const success = await auth.login(options);
    if (!success) throw new Error('登录失败');
    return auth;
}