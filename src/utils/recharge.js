/**
 * 充值相关公共函数
 * Recharge Utility Functions
 * 
 * 提供可复用的充值相关功能
 */

/**
 * 生成随机英文字母字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
export function generateRandomName(length) {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
}

/**
 * 生成随机数字字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机数字字符串
 */
export function generateRandomDigits(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

/**
 * 完成本地充值流程（从充值页面开始）
 * 这是一个公共函数，可以在任何地方调用
 * 
 * 流程说明：
 * 1. 等待充值页面加载（断言 "Deposit" 文本）
 * 2. 如果有账户信息表单，填写随机信息：
 *    - 姓名：5-8个英文字母
 *    - 账号：18位数字
 * 3. 提交表单
 * 4. 点击 Complete 按钮
 * 5. 点击确认弹窗的 Confirm 按钮
 * 
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - AuthHelper 实例（可选）
 * @param {TestCase} test - TestCase 实例（可选）
 * @returns {Promise<Object>} 返回处理结果 { success: boolean, error?: string }
 * 
 * @example
 * // 基本使用
 * import { completeLocalRecharge } from '../src/utils/recharge.js';
 * const result = await completeLocalRecharge(page);
 * 
 * @example
 * // 带参数使用
 * const result = await completeLocalRecharge(page, auth, test);
 * if (result.success) {
 *     console.log('充值成功');
 * }
 */
export async function completeLocalRecharge(page, auth = null, test = null) {
    console.log(`        💰 开始本地充值流程...`);

    try {
        // 1. 等待充值页面加载
        console.log(`        ⏳ 等待充值页面加载...`);
        await page.waitForSelector('text=Deposit', { timeout: 10000 });
        console.log(`        ✓ 充值页面已加载`);

        // 2. 检查是否需要填写账户信息表单
        const formVisible = await page.locator('.rechargeInfo form').isVisible({ timeout: 3000 }).catch(() => false);

        if (formVisible) {
            console.log(`        📝 检测到账户信息表单...`);

            // 🔥 检查输入框是否有 disabled 属性（布尔属性）
            const nameInput = page.locator('input[placeholder*="full name"], input[data-testid="form-input-holderName"]').first();
            const accountInput = page.locator('input[placeholder*="account"], input[data-testid="form-input-accountNo"]').first();

            // 使用 evaluate 检查 disabled 属性是否存在
            const nameDisabled = await nameInput.evaluate(el => el.hasAttribute('disabled')).catch(() => false);
            const accountDisabled = await accountInput.evaluate(el => el.hasAttribute('disabled')).catch(() => false);

            const isDisabled = nameDisabled || accountDisabled;

            if (isDisabled) {
                // 🔥 输入框被禁用，直接点击 Confirm
                console.log(`        ℹ️ 输入框已禁用（disabled），无需填写，直接点击 Confirm`);
            } else {
                // 🔥 输入框未禁用，需要填写信息
                console.log(`        📝 输入框未禁用，开始填写信息...`);

                // 生成随机姓名（5-8个字母）
                const nameLength = Math.floor(Math.random() * 4) + 5; // 5-8
                const randomName = generateRandomName(nameLength);
                console.log(`        ✓ 生成随机姓名: ${randomName}`);

                // 生成随机账号（18位数字）
                const randomAccount = generateRandomDigits(18);
                console.log(`        ✓ 生成随机账号: ${randomAccount}`);

                // 填写姓名
                await nameInput.fill(randomName);
                console.log(`        ✓ 已填写姓名`);

                // 填写账号
                await accountInput.fill(randomAccount);
                console.log(`        ✓ 已填写账号`);
            }

            // 点击表单的 Confirm 按钮
            await page.locator('button[data-testid="form-submit-btn"], .form-row.handle button').first().click();
            console.log(`        ✓ 已点击 Confirm 按钮`);

            // 等待页面跳转或加载
            await page.waitForTimeout(2000);
        } else {
            console.log(`        ℹ️ 无需填写账户信息表单`);
        }

        // 3. 点击 Complete 按钮
        console.log(`        🔘 查找 Complete 按钮...`);
        const completeBtn = page.locator('button.comfirBtn:has-text("Complete")').first();
        const completeBtnVisible = await completeBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (completeBtnVisible) {
            await completeBtn.click();
            console.log(`        ✓ 已点击 Complete 按钮`);
            await page.waitForTimeout(1500);
        } else {
            console.log(`        ⚠️ 未找到 Complete 按钮`);
        }

        // 4. 点击确认弹窗的 Confirm 按钮
        console.log(`        🔘 查找确认弹窗的 Confirm 按钮...`);
        const confirmBtn = page.locator('button.comfirBtn:has-text("Confirm")').first();
        const confirmBtnVisible = await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (confirmBtnVisible) {
            await confirmBtn.click();
            console.log(`        ✓ 已点击 Confirm 按钮`);
            await page.waitForTimeout(1500);
        } else {
            console.log(`        ⚠️ 未找到 Confirm 按钮`);
        }

        console.log(`        ✅ 本地充值流程完成`);
        return { success: true };

    } catch (error) {
        console.log(`        ❌ 本地充值流程失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 带重试机制的本地充值
 * 
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {number} options.maxRetries - 最大重试次数，默认 3
 * @param {number} options.retryDelay - 重试延迟（毫秒），默认 3000
 * @param {boolean} options.reloadOnRetry - 重试时是否刷新页面，默认 true
 * @param {Object} options.auth - AuthHelper 实例（可选）
 * @param {TestCase} options.test - TestCase 实例（可选）
 * @returns {Promise<Object>} 返回处理结果
 * 
 * @example
 * import { completeLocalRechargeWithRetry } from '../src/utils/recharge.js';
 * 
 * const result = await completeLocalRechargeWithRetry(page, {
 *     maxRetries: 3,
 *     retryDelay: 3000,
 *     reloadOnRetry: true
 * });
 */
export async function completeLocalRechargeWithRetry(page, options = {}) {
    const {
        maxRetries = 3,
        retryDelay = 3000,
        reloadOnRetry = true,
        auth = null,
        test = null
    } = options;

    console.log(`        🔄 开始带重试的充值流程（最多 ${maxRetries} 次）...`);

    let attempt = 0;
    let lastResult = null;

    while (attempt < maxRetries) {
        attempt++;
        console.log(`\n        📍 第 ${attempt} 次尝试充值...`);

        lastResult = await completeLocalRecharge(page, auth, test);

        if (lastResult.success) {
            console.log(`        ✅ 第 ${attempt} 次尝试成功`);
            return {
                success: true,
                attempts: attempt,
                maxRetries
            };
        }

        console.log(`        ❌ 第 ${attempt} 次尝试失败: ${lastResult.error}`);

        if (attempt < maxRetries) {
            console.log(`        ⏳ 等待 ${retryDelay}ms 后重试...`);
            await page.waitForTimeout(retryDelay);

            if (reloadOnRetry) {
                console.log(`        🔄 刷新页面...`);
                await page.reload();
                await page.waitForTimeout(2000);
            }
        }
    }

    console.log(`        ❌ 充值失败，已达最大重试次数 ${maxRetries}`);
    return {
        success: false,
        attempts: attempt,
        maxRetries,
        error: lastResult?.error || 'Max retries reached'
    };
}

/**
 * 批量执行本地充值
 * 
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {number} options.times - 充值次数，默认 1
 * @param {number} options.interval - 每次充值间隔（毫秒），默认 2000
 * @param {boolean} options.stopOnError - 遇到错误是否停止，默认 true
 * @param {Function} options.beforeEach - 每次充值前的回调函数
 * @param {Function} options.afterEach - 每次充值后的回调函数
 * @param {Object} options.auth - AuthHelper 实例（可选）
 * @param {TestCase} options.test - TestCase 实例（可选）
 * @returns {Promise<Object>} 返回处理结果
 * 
 * @example
 * import { batchLocalRecharge } from '../src/utils/recharge.js';
 * 
 * const result = await batchLocalRecharge(page, {
 *     times: 5,
 *     interval: 3000,
 *     stopOnError: true,
 *     beforeEach: async (index) => {
 *         console.log(`准备第 ${index + 1} 次充值`);
 *     },
 *     afterEach: async (index, result) => {
 *         console.log(`第 ${index + 1} 次充值结果:`, result);
 *     }
 * });
 */
export async function batchLocalRecharge(page, options = {}) {
    const {
        times = 1,
        interval = 2000,
        stopOnError = true,
        beforeEach = null,
        afterEach = null,
        auth = null,
        test = null
    } = options;

    console.log(`        📦 开始批量充值，共 ${times} 次...`);

    const results = [];

    for (let i = 0; i < times; i++) {
        console.log(`\n        📍 第 ${i + 1}/${times} 次充值:`);

        // 执行 beforeEach 回调
        if (beforeEach && typeof beforeEach === 'function') {
            try {
                await beforeEach(i);
            } catch (error) {
                console.log(`        ⚠️ beforeEach 回调执行失败: ${error.message}`);
            }
        }

        // 执行充值
        const result = await completeLocalRecharge(page, auth, test);
        results.push({
            index: i,
            ...result
        });

        // 执行 afterEach 回调
        if (afterEach && typeof afterEach === 'function') {
            try {
                await afterEach(i, result);
            } catch (error) {
                console.log(`        ⚠️ afterEach 回调执行失败: ${error.message}`);
            }
        }

        if (result.success) {
            console.log(`        ✅ 第 ${i + 1} 次充值成功`);
        } else {
            console.log(`        ❌ 第 ${i + 1} 次充值失败: ${result.error}`);

            if (stopOnError) {
                console.log(`        🛑 遇到错误，停止批量充值`);
                break;
            }
        }

        // 如果不是最后一次，等待间隔时间
        if (i < times - 1) {
            console.log(`        ⏳ 等待 ${interval}ms...`);
            await page.waitForTimeout(interval);
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`\n        📊 批量充值完成: ${successCount}/${results.length} 成功, ${failCount} 失败`);

    return {
        success: successCount === times,
        total: times,
        completed: results.length,
        successCount,
        failCount,
        results
    };
}

/**
 * 检查是否在充值页面
 * 
 * @param {Page} page - Playwright page 对象
 * @param {number} timeout - 超时时间（毫秒），默认 3000
 * @returns {Promise<boolean>} 返回是否在充值页面
 * 
 * @example
 * import { isOnDepositPage } from '../src/utils/recharge.js';
 * 
 * if (await isOnDepositPage(page)) {
 *     console.log('当前在充值页面');
 * }
 */
export async function isOnDepositPage(page, timeout = 3000) {
    try {
        const depositTextVisible = await page.locator('text=Deposit')
            .first()
            .isVisible({ timeout })
            .catch(() => false);

        return depositTextVisible;
    } catch (error) {
        return false;
    }
}

/**
 * 导航到充值页面
 * 
 * @param {Page} page - Playwright page 对象
 * @param {string} depositUrl - 充值页面 URL（可选，如果不提供则尝试通过导航栏进入）
 * @param {number} waitTime - 等待时间（毫秒），默认 2000
 * @returns {Promise<Object>} 返回处理结果
 * 
 * @example
 * import { navigateToDepositPage } from '../src/utils/recharge.js';
 * 
 * // 通过 URL 导航
 * await navigateToDepositPage(page, 'https://example.com/deposit');
 * 
 * // 通过导航栏导航
 * await navigateToDepositPage(page);
 */
export async function navigateToDepositPage(page, depositUrl = null, waitTime = 2000) {
    console.log(`        🧭 导航到充值页面...`);

    try {
        if (depositUrl) {
            // 通过 URL 直接导航
            console.log(`        📍 通过 URL 导航: ${depositUrl}`);
            await page.goto(depositUrl);
        } else {
            // 尝试通过导航栏进入
            console.log(`        📍 尝试通过导航栏进入充值页面...`);

            // 尝试多个可能的选择器
            const depositSelectors = [
                'text=Deposit',
                'a[href*="deposit"]',
                'button:has-text("Deposit")',
                '.nav-item:has-text("Deposit")'
            ];

            let clicked = false;
            for (const selector of depositSelectors) {
                const element = page.locator(selector).first();
                const visible = await element.isVisible({ timeout: 2000 }).catch(() => false);

                if (visible) {
                    await element.click();
                    console.log(`        ✓ 通过选择器 "${selector}" 进入充值页面`);
                    clicked = true;
                    break;
                }
            }

            if (!clicked) {
                throw new Error('未找到充值页面入口');
            }
        }

        await page.waitForTimeout(waitTime);

        // 验证是否成功进入充值页面
        const onDepositPage = await isOnDepositPage(page);

        if (onDepositPage) {
            console.log(`        ✅ 成功进入充值页面`);
            return { success: true };
        } else {
            throw new Error('未能成功进入充值页面');
        }

    } catch (error) {
        console.log(`        ❌ 导航到充值页面失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}
