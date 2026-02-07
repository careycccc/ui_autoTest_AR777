// src/utils/auth.js
import { getSmss } from '../api/smss.test.js';
import { dataConfig } from '../../config.js';

/**
 * 登录工具类
 * 
 * 页面流程：
 * 1. 首页 → goto()
 * 2. 登录页 → switchToPage()
 * 3. 登录成功页 → switchToPage()
 */
export class AuthHelper {
    constructor(testCase) {
        this.t = testCase;
        this.page = testCase.page;
        this.isLoggedIn = false;
    }

    /**
     * 完整登录流程
     */
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
            // ========================================
            // 页面1: 首页
            // ========================================
            await this.t.goto(dataConfig.url, { pageName: '首页' });

            await this.t.step('验证首页加载', async () => {
                await this.t.assert.textContains('#home', 'Home', '首页未找到 Home');
            });

            await this.handlePopups();

            // ========================================
            // 点击登录 → 页面2: 登录页
            // ========================================
            await this.t.step('点击 Login 按钮', async () => {
                try {
                    await this.page.locator('.signin-btn.login').click({ timeout: 10000 });
                } catch (e) {
                    await this.page.locator('.signin-btn:has-text("Login")').click({ timeout: 10000 });
                }
            });

            // 切换到登录页
            await this.t.switchToPage('登录页', {
                waitForSelector: '[data-testid="login-tab-mobile"]',
                waitTime: 1000
            });

            await this.t.step('验证登录页', async () => {
                await this.t.assert.textEquals(
                    '[data-testid="login-tab-mobile"]',
                    'Phone number',
                    '登录页验证失败'
                );
            });

            // 执行登录
            const success = await this.performLogin(phone, areaCode);

            if (success) {
                this.isLoggedIn = true;
                console.log('\n      🎉 登录成功');
            }

            return success;

        } catch (error) {
            console.error('      ❌ 登录失败:', error.message);
            return false;
        }
    }

    /**
     * 处理弹窗
     */
    async handlePopups() {
        await this.t.step('检查弹窗', async () => {
            const selectors = ['text=Claim My Bonus', '.popup-close', '.modal-close'];
            for (const selector of selectors) {
                try {
                    const el = this.page.locator(selector).first();
                    if (await el.isVisible({ timeout: 1500 })) {
                        await el.click();
                        await this.page.waitForTimeout(500);
                        console.log(`        ✓ 关闭: ${selector}`);
                    }
                } catch (e) { }
            }
        });
    }

    /**
     * 执行登录
     */
    async performLogin(phone, areaCode) {
        // 切换 OTP
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

        // 检查区号
        const currentCode = await this.page.getByTestId('phone-area-code').textContent();
        if (currentCode !== '+' + areaCode) {
            console.log(`      ⚠️ 区号不匹配: ${currentCode}`);
            return false;
        }

        // 输入手机号
        await this.t.step('输入手机号', async () => {
            await this.page.locator('[data-testid="form-input-userName"]').fill(phone);
        });

        // 发送验证码（属于登录页的请求）
        await this.t.step('发送验证码', async () => {
            await this.page.locator('[data-testid="login-send-code-btn"]').click();
        });

        await this.page.waitForTimeout(1500);

        // 获取验证码
        const code = await this.getVerifyCode(areaCode + phone);
        if (!code) return false;

        // 输入验证码
        await this.t.step('输入验证码', async () => {
            await this.page.getByTestId('form-input-verifyCode').click();
            await this.page.getByTestId('form-input-verifyCode').fill(code);
        });

        // 点击登录（登录请求属于登录页）
        await this.t.step('提交登录', async () => {
            // 创建登录响应的 Promise
            const loginApiPromise = this.page.waitForResponse(
                res => res.url().includes('/api/') &&
                    (res.url().includes('login') || res.url().includes('signin')),
                { timeout: 30000 }
            ).catch(() => null);

            // 点击登录
            await this.page.getByTestId('login-submit-btn').click();

            // 等待登录请求完成
            const loginRes = await loginApiPromise;
            if (loginRes) {
                console.log(`        📡 登录响应: ${loginRes.status()}`);
            }
        });

        // 等待登录请求被记录到登录页
        await this.page.waitForTimeout(500);

        // ========================================
        // 切换到 页面3: 登录成功页
        // ========================================
        await this.t.switchToPage('登录成功页', {
            waitTime: 3000,
            collectPreviousPage: true  // 会先完成登录页的采集
        });

        // 等待会员信息等请求
        await this.page.waitForTimeout(2000);

        // 验证登录成功
        const success = await this.verifyLoginSuccess();

        if (success) {
            await this.t.step('确认登录成功', async () => {
                console.log('        ✓ 已进入主页面');
                console.log('        🔗 URL:', this.page.url());
            });
        }

        return success;
    }

    /**
     * 获取验证码
     */
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

    /**
     * 验证登录成功
     */
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