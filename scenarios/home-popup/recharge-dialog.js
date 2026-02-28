/**
 * 充值支付弹窗处理
 * Recharge Dialog Handler
 * 
 * 处理 "Pay For The Order" 充值支付弹窗
 * 支持随机选择支付方式并完成本地充值流程
 */

import { completeLocalRecharge } from '../../src/utils/recharge.js';
import { handlePay } from '../../src/api/handlerPay.test.js';

/**
 * 检测充值支付弹窗是否存在
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<boolean>} 返回是否存在充值支付弹窗
 */
export async function detectRechargeDialog(page) {
    try {
        const selectors = [
            '.payment-dialog',
            '.dialog-overlay.recharge-dialog',
            '.dialog-container:has(.dialogTitle:text("Pay For The Order"))'
        ];

        for (const selector of selectors) {
            const isVisible = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false);
            if (isVisible) {
                return true;
            }
        }

        return false;
    } catch (error) {
        return false;
    }
}

/**
 * 处理充值支付弹窗
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - AuthHelper 实例
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回处理结果
 */
export async function handleRechargeDialogPopup(page, auth, test) {
    console.log(`        🎯 处理充值支付弹窗...`);

    try {
        // 等待弹窗容器出现
        const dialogSelectors = [
            '.payment-dialog',
            '.dialog-overlay.recharge-dialog',
            '.dialog-container:has(.dialogTitle)'
        ];

        let dialogVisible = false;
        let usedSelector = null;

        for (const selector of dialogSelectors) {
            const isVisible = await page.locator(selector).first().isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
                dialogVisible = true;
                usedSelector = selector;
                console.log(`        ✓ 通过选择器 "${selector}" 检测到充值支付弹窗`);
                break;
            }
        }

        if (!dialogVisible) {
            console.log(`        ℹ️ 充值支付弹窗未出现`);
            return { success: true, skipped: true };
        }

        // 获取所有支付方式列表项
        const paymentItems = page.locator('.payment-dialog ul li');
        const itemCount = await paymentItems.count();
        console.log(`        📋 检测到 ${itemCount} 个支付方式`);

        if (itemCount === 0) {
            console.log(`        ⚠️ 未找到支付方式列表`);
            return { success: false, reason: 'No payment methods found' };
        }

        // 随机选择一个支付方式
        const randomIndex = Math.floor(Math.random() * itemCount);
        const selectedItem = paymentItems.nth(randomIndex);
        console.log(`        🎲 随机选择第 ${randomIndex + 1} 个支付方式`);

        // 获取支付方式名称
        const paymentName = await selectedItem.locator('.name').textContent().catch(() => 'unknown');
        console.log(`        💳 选择的支付方式: ${paymentName}`);

        // 点击 selectList 进行选择
        const selectList = selectedItem.locator('.selectList').first();
        await selectList.click();
        console.log(`        ✓ 已点击选择支付方式`);

        await page.waitForTimeout(1000);

        // 点击 Confirm 按钮
        const confirmBtn = page.locator('.payment-dialog .confirmBtn').first();
        await confirmBtn.click();
        console.log(`        ✓ 已点击 Confirm 按钮`);

        await page.waitForTimeout(2000);

        // 检查是否选择了 local 开头的支付方式（不区分大小写）
        const isLocalPayment = paymentName.toLowerCase().startsWith('local');
        console.log(`        📊 支付方式名称: ${paymentName}`);
        console.log(`        📊 是否为本地支付: ${isLocalPayment ? '是' : '否'}`);

        if (isLocalPayment) {
            console.log(`        💰 检测到本地支付方式，开始本地充值流程...`);

            // 调用本地充值流程
            const rechargeResult = await completeLocalRecharge(page, auth, test);

            if (rechargeResult.success) {
                console.log(`        ✅ 本地充值流程完成`);

                // 进行后台的支付处理
                console.log(`        🔄 开始后台支付处理...`);

                // 获取 userId
                const userId = auth.userId || auth.user?.userId;
                if (!userId) {
                    console.log(`        ⚠️ 未找到 userId，跳过后台处理`);
                    return rechargeResult;
                }

                console.log(`        📋 userId: ${userId}`);

                // 调用后台处理
                const handlePayResult = await handlePay(userId, page);

                if (handlePayResult.summary.success && handlePayResult.summary.totalProcessed > 0) {
                    console.log(`        ✅ 后台处理成功，已处理 ${handlePayResult.summary.totalProcessed} 条订单`);

                    // 刷新前台页面
                    console.log(`        🔄 刷新前台页面...`);
                    await page.reload();
                    await page.waitForTimeout(2000);
                    console.log(`        ✅ 前台页面刷新完成`);
                } else {
                    console.log(`        ℹ️ 后台处理完成，但无订单需要处理`);
                }

                return {
                    ...rechargeResult,
                    backendProcessing: handlePayResult
                };
            } else {
                console.log(`        ⚠️ 本地充值流程失败: ${rechargeResult.error}`);
            }

            return rechargeResult;
        } else {
            console.log(`        ℹ️ 非本地支付方式，跳过后续流程`);
            return { success: true, paymentMethod: paymentName };
        }

    } catch (error) {
        console.log(`        ❌ 处理充值支付弹窗失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}
