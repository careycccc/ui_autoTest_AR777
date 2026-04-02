/**
 * 充值 - 子用例模块
 */
import { handleDepositPage } from './deposit-handler.js';

/**
 * 注册充值的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerDepositCases(runner) {
    // 验证充值页面
    runner.registerCase('充值', '验证充值页面', verifyDepositPage);
}

/**
 * 验证充值页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} auth - 认证信息
 * @param {Object} test - TestCase 实例
 */
export async function verifyDepositPage(page, auth, test) {
    console.log('      🔍 开始验证充值页面...');

    try {
        // 调用充值页面处理器
        const result = await handleDepositPage(page, test);

        if (result.success) {
            console.log('      ✅ 充值页面验证成功');
        } else {
            console.log(`      ❌ 充值页面验证失败: ${result.error || result.reason}`);
            throw new Error(result.error || result.reason);
        }

    } catch (error) {
        console.log(`      ❌ 验证充值页面异常: ${error.message}`);
        await test.captureScreenshot('deposit-page-verify-error');
        throw error;
    }
}
