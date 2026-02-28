/**
 * 提现功能 - 主流程
 * Withdraw Module - Main Flow
 */

import { getWithdrawInfo, selectWithdrawAmount, selectPaymentMethod, submitWithdraw } from './withdraw-select.js';
import { verifyWithdrawAccount, addWithdrawAccount } from './withdraw-account.js';

/**
 * 注册提现相关用例
 * @param {testModule} runner - testModule 实例（可以是 walletModule 或 menuModule）
 */
export async function registerWithdrawCases(runner) {

    // ========================================
    // 用例 1: 提现页面加载验证
    // ========================================
    runner.registerCase('Withdraw 提现', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证提现页面加载...');

        // 获取页面信息
        const info = await getWithdrawInfo(page);

        if (!info.success) {
            throw new Error('获取提现页面信息失败');
        }

        // 验证关键元素
        const hasWithdrawText = await page.locator('text=Withdraw').isVisible({ timeout: 3000 });
        const hasAmountSection = await page.locator('.withdraw-amount, [class*="amount"]').isVisible({ timeout: 3000 });

        if (!hasWithdrawText || !hasAmountSection) {
            throw new Error('提现页面关键元素缺失');
        }

        console.log('      ✅ 提现页面加载验证通过');
    });

    // ========================================
    // 用例 2: 选择提现金额
    // ========================================
    runner.registerCase('Withdraw 提现', '选择提现金额', async (page, auth, test) => {
        console.log('      🔍 测试选择提现金额...');

        // 随机选择金额
        const result = await selectWithdrawAmount(page, { random: true });

        if (!result.success) {
            throw new Error('选择提现金额失败');
        }

        console.log(`      ✅ 成功选择金额: ${result.selectedAmount}`);
    });

    // ========================================
    // 用例 3: 选择支付方式
    // ========================================
    runner.registerCase('Withdraw 提现', '选择支付方式', async (page, auth, test) => {
        console.log('      🔍 测试选择支付方式...');

        // 先选择金额
        await selectWithdrawAmount(page, { amount: '500' });

        // 选择支付方式
        const result = await selectPaymentMethod(page, { random: true });

        if (!result.success) {
            throw new Error('选择支付方式失败');
        }

        console.log(`      ✅ 成功选择支付方式: ${result.selectedMethod}`);
    });

    // ========================================
    // 用例 4: 验证提现账户
    // ========================================
    runner.registerCase('Withdraw 提现', '验证提现账户', async (page, auth, test) => {
        console.log('      🔍 验证提现账户...');

        const result = await verifyWithdrawAccount(page);

        if (result.hasAccount) {
            console.log(`      ✅ 已有提现账户: ${result.accountInfo}`);
        } else {
            console.log('      ℹ️ 未绑定提现账户');
        }
    });

    // ========================================
    // 用例 5: 完整提现流程（不提交）
    // ========================================
    runner.registerCase('Withdraw 提现', '完整提现流程验证', async (page, auth, test) => {
        console.log('      🔍 测试完整提现流程...');

        // 1. 获取页面信息
        const info = await getWithdrawInfo(page);
        console.log(`      📊 可提现金额: ${info.withdrawable}`);

        // 2. 选择金额
        const amountResult = await selectWithdrawAmount(page, { amount: '500' });
        if (!amountResult.success) {
            throw new Error('选择金额失败');
        }

        // 3. 选择支付方式
        const paymentResult = await selectPaymentMethod(page, { method: 'UPI' });
        if (!paymentResult.success) {
            throw new Error('选择支付方式失败');
        }

        // 4. 验证账户
        const accountResult = await verifyWithdrawAccount(page);

        if (!accountResult.hasAccount) {
            console.log('      ℹ️ 需要添加提现账户');
            // 这里可以添加账户添加逻辑
        }

        // 5. 不实际提交，仅验证流程
        console.log('      ✅ 提现流程验证完成（未提交）');
    });
}

/**
 * 执行完整的提现流程
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - AuthHelper 实例
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 返回执行结果
 */
export async function executeWithdrawFlow(page, auth, test, options = {}) {
    const {
        amount = '500',
        paymentMethod = 'UPI',
        submit = false
    } = options;

    console.log('    🎯 执行提现流程...');

    try {
        // 步骤1: 获取页面信息
        const info = await getWithdrawInfo(page);
        if (!info.success) {
            return { success: false, error: '获取页面信息失败' };
        }

        // 步骤2: 选择金额
        const amountResult = await selectWithdrawAmount(page, { amount });
        if (!amountResult.success) {
            return { success: false, error: '选择金额失败' };
        }

        // 步骤3: 选择支付方式
        const paymentResult = await selectPaymentMethod(page, { method: paymentMethod });
        if (!paymentResult.success) {
            return { success: false, error: '选择支付方式失败' };
        }

        // 步骤4: 验证账户
        const accountResult = await verifyWithdrawAccount(page);

        // 步骤5: 提交（如果需要）
        let submitResult = null;
        if (submit) {
            submitResult = await submitWithdraw(page);
            if (!submitResult.success) {
                return { success: false, error: '提交失败' };
            }
        }

        console.log('    ✅ 提现流程执行完成');

        return {
            success: true,
            info,
            amount: amountResult,
            payment: paymentResult,
            account: accountResult,
            submit: submitResult
        };

    } catch (error) {
        console.log(`    ❌ 提现流程执行失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
