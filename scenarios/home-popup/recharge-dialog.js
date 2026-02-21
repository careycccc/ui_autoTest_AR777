/**
 * 充值支付弹窗处理
 * Recharge Dialog Handler
 * 
 * 处理 "Pay For The Order" 充值支付弹窗
 * 这个弹窗显示支付方式选择，需要点击关闭按钮关闭
 * 
 * 弹窗结构：
 * <div class="dialog-overlay recharge-dialog">
 *   <div class="dialog-container">
 *     <div class="dialog-header">
 *       <h3 class="dialogTitle">Pay For The Order</h3>
 *     </div>
 *     <div class="dialog-content">
 *       <section class="payment-dialog">
 *         <h2 class="amount-title">₹100</h2>
 *         <ul>
 *           <li>支付方式列表</li>
 *         </ul>
 *         <div class="confirmBtn">Confirm</div>
 *       </section>
 *     </div>
 *     <span class="ar_icon close-btn">关闭按钮</span>
 *   </div>
 * </div>
 */

/**
 * 检测充值支付弹窗是否存在
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<boolean>} 返回是否存在充值支付弹窗
 */
export async function detectRechargeDialog(page) {
    try {
        // 检测多个可能的选择器
        const selectors = [
            '.dialog-overlay.recharge-dialog',
            '.dialog-container:has(.dialogTitle:text("Pay For The Order"))',
            '.payment-dialog'
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
        // 等待弹窗容器出现（多个选择器尝试）
        const dialogSelectors = [
            '.dialog-overlay.recharge-dialog',
            '.dialog-container:has(.dialogTitle)',
            '.payment-dialog'
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

        // 尝试多个关闭按钮选择器
        const closeSelectors = [
            '.close-btn',
            '.ar_icon.close-btn',
            'span.close-btn',
            '.dialog-overlay .close-btn'
        ];

        let closeSuccess = false;

        for (const selector of closeSelectors) {
            try {
                const closeBtn = page.locator(selector).first();
                const btnVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);

                if (btnVisible) {
                    console.log(`        🖱️ 点击关闭按钮 (${selector})...`);
                    await closeBtn.click({ timeout: 5000 });
                    console.log(`        ✓ 已点击关闭按钮`);
                    closeSuccess = true;
                    break;
                }
            } catch (e) {
                console.log(`        ⚠️ 尝试 ${selector} 失败: ${e.message}`);
            }
        }

        if (!closeSuccess) {
            console.log(`        ⚠️ 未找到关闭按钮，尝试按 ESC 键`);
            await page.keyboard.press('Escape');
        }

        // 等待弹窗消失
        await page.waitForTimeout(1000);

        // 验证弹窗已关闭
        const stillVisible = await detectRechargeDialog(page);

        if (stillVisible) {
            console.log(`        ⚠️ 弹窗可能未完全关闭`);
            return { success: false, reason: 'Dialog still visible' };
        }

        console.log(`        ✅ 充值支付弹窗已关闭`);
        return { success: true };

    } catch (error) {
        console.log(`        ❌ 处理充值支付弹窗失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}
