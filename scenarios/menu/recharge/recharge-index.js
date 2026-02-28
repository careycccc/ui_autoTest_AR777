/**
 * 充值功能 - 主流程
 * Recharge Module - Main Flow
 */

/**
 * 注册充值相关用例
 * @param {testModule} runner - testModule 实例（可以是 walletModule 或 menuModule）
 */
export async function registerRechargeCases(runner) {

    // ========================================
    // 用例 1: 充值页面加载验证
    // ========================================
    runner.registerCase('Deposit 充值', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证充值页面加载...');

        // 验证关键元素
        const hasRechargeText = await page.locator('text=Recharge').isVisible({ timeout: 3000 });
        const hasAmountSection = await page.locator('.recharge-amount, [class*="amount"]').isVisible({ timeout: 3000 });

        if (!hasRechargeText || !hasAmountSection) {
            throw new Error('充值页面关键元素缺失');
        }

        console.log('      ✅ 充值页面加载验证通过');
    });

    // ========================================
    // 用例 2: 选择充值金额
    // ========================================
    runner.registerCase('Deposit 充值', '选择充值金额', async (page, auth, test) => {
        console.log('      🔍 测试选择充值金额...');

        // 获取所有金额按钮
        const amountButtons = page.locator('.amount-btn, button[class*="amount"]');
        const count = await amountButtons.count();

        if (count === 0) {
            throw new Error('未找到金额选择按钮');
        }

        // 随机选择一个
        const randomIndex = Math.floor(Math.random() * count);
        await amountButtons.nth(randomIndex).click();

        const selectedAmount = await amountButtons.nth(randomIndex).textContent();
        console.log(`      ✅ 成功选择金额: ${selectedAmount}`);
    });

    // ========================================
    // 用例 3: 选择支付方式
    // ========================================
    runner.registerCase('Deposit 充值', '选择支付方式', async (page, auth, test) => {
        console.log('      🔍 测试选择支付方式...');

        // 先选择金额
        const amountButtons = page.locator('.amount-btn, button[class*="amount"]');
        await amountButtons.first().click();
        await page.waitForTimeout(500);

        // 选择支付方式
        const paymentItems = page.locator('.payment-method, [class*="payment"]');
        const count = await paymentItems.count();

        if (count === 0) {
            throw new Error('未找到支付方式');
        }

        // 随机选择一个
        const randomIndex = Math.floor(Math.random() * count);
        await paymentItems.nth(randomIndex).click();

        const selectedMethod = await paymentItems.nth(randomIndex).textContent();
        console.log(`      ✅ 成功选择支付方式: ${selectedMethod}`);
    });

    // 更多充值相关用例...
}
