/**
 * 提现页面处理
 * Withdraw Page Handler
 * 
 * 处理提现页面的各种操作：
 * - 查看余额和可提现金额
 * - 选择提现金额
 * - 选择支付方式
 * - 添加提现账户
 * - 提交提现申请
 */

/**
 * 获取提现页面信息
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回提现页面信息
 */
export async function getWithdrawInfo(page) {
    console.log('        📊 获取提现页面信息...');

    try {
        const info = {
            cashBalance: null,
            withdrawable: null,
            remainingLimit: null,
            dailyLimit: null,
            wagerRequired: null,
            paymentMethods: []
        };

        // 获取 Cash Balance
        const cashBalanceText = await page.locator('.cash-balance, [class*="balance"]')
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => '');

        const cashBalanceMatch = cashBalanceText.match(/[₹$€£¥]?([\d,.]+)/);
        info.cashBalance = cashBalanceMatch ? cashBalanceMatch[1] : null;

        // 获取 Withdrawable
        const withdrawableText = await page.locator('.withdrawable, [class*="withdrawable"]')
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => '');

        const withdrawableMatch = withdrawableText.match(/[₹$€£¥]?([\d,.]+)/);
        info.withdrawable = withdrawableMatch ? withdrawableMatch[1] : null;

        // 获取 Remaining Withdrawal Limit
        const remainingLimitText = await page.locator('text=Remaining Withdrawal Limit')
            .locator('..')
            .textContent({ timeout: 3000 })
            .catch(() => '');

        const remainingMatch = remainingLimitText.match(/[₹$€£¥]([\d,.]+)/);
        info.remainingLimit = remainingMatch ? remainingMatch[1] : null;

        // 获取 Withdrawal Daily Limit
        const dailyLimitText = await page.locator('text=Withdrawal Daily Limit')
            .locator('..')
            .textContent({ timeout: 3000 })
            .catch(() => '');

        const dailyMatch = dailyLimitText.match(/[₹$€£¥]?([\d,.]+)/);
        info.dailyLimit = dailyMatch ? dailyMatch[1] : null;

        // 获取 Wager Required to Withdraw
        const wagerText = await page.locator('text=Wager Required to Withdraw')
            .locator('..')
            .textContent({ timeout: 3000 })
            .catch(() => '');

        const wagerMatch = wagerText.match(/[₹$€£¥]([\d,.]+)/);
        info.wagerRequired = wagerMatch ? wagerMatch[1] : null;

        // 获取支付方式列表
        const paymentItems = page.locator('.payment-methods [class*="method"], .payment-methods .item');
        const methodCount = await paymentItems.count();

        for (let i = 0; i < methodCount; i++) {
            const methodText = await paymentItems.nth(i).textContent().catch(() => '');
            if (methodText.trim()) {
                info.paymentMethods.push(methodText.trim());
            }
        }

        console.log('        ✅ 提现页面信息:');
        console.log(`           Cash Balance: ${info.cashBalance || 'N/A'}`);
        console.log(`           Withdrawable: ${info.withdrawable || 'N/A'}`);
        console.log(`           Remaining Limit: ${info.remainingLimit || 'N/A'}`);
        console.log(`           Daily Limit: ${info.dailyLimit || 'N/A'}`);
        console.log(`           Wager Required: ${info.wagerRequired || 'N/A'}`);
        console.log(`           Payment Methods: ${info.paymentMethods.length} 种`);

        return {
            success: true,
            ...info
        };

    } catch (error) {
        console.log(`        ❌ 获取提现页面信息失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 选择提现金额
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {string} options.amount - 提现金额（'100', '200', '500', '1000', '2000', '5000'）
 * @param {boolean} options.random - 是否随机选择金额（默认 false）
 * @param {string} options.customAmount - 自定义金额（输入框）
 * @returns {Promise<Object>} 返回选择结果
 */
export async function selectWithdrawAmount(page, options = {}) {
    const { amount, random = false, customAmount } = options;

    console.log('        💰 选择提现金额...');

    try {
        if (customAmount) {
            // 输入自定义金额
            console.log(`        📝 输入自定义金额: ${customAmount}`);
            const input = page.locator('input[placeholder*="enter"], input[type="number"]').first();
            await input.fill(customAmount);
            await page.waitForTimeout(500);

            return {
                success: true,
                selectedAmount: customAmount,
                type: 'custom'
            };
        }

        // 获取所有金额按钮
        const amountButtons = page.locator('.withdraw-amount button, [class*="amount"] button');
        const buttonCount = await amountButtons.count();

        if (buttonCount === 0) {
            console.log('        ⚠️ 未找到金额选择按钮');
            return {
                success: false,
                error: '未找到金额选择按钮'
            };
        }

        let selectedButton;
        let selectedAmount;

        if (random) {
            // 随机选择
            const randomIndex = Math.floor(Math.random() * buttonCount);
            selectedButton = amountButtons.nth(randomIndex);
            selectedAmount = await selectedButton.textContent();
            console.log(`        🎲 随机选择第 ${randomIndex + 1} 个金额: ${selectedAmount}`);
        } else if (amount) {
            // 根据金额选择
            selectedButton = amountButtons.filter({ hasText: amount }).first();
            const isVisible = await selectedButton.isVisible({ timeout: 2000 }).catch(() => false);

            if (!isVisible) {
                console.log(`        ⚠️ 未找到金额 ${amount} 的按钮`);
                return {
                    success: false,
                    error: `未找到金额 ${amount} 的按钮`
                };
            }

            selectedAmount = amount;
            console.log(`        💵 选择金额: ${selectedAmount}`);
        } else {
            // 默认选择第一个
            selectedButton = amountButtons.first();
            selectedAmount = await selectedButton.textContent();
            console.log(`        💵 选择默认金额: ${selectedAmount}`);
        }

        // 点击按钮
        await selectedButton.click();
        await page.waitForTimeout(500);

        console.log(`        ✅ 已选择金额: ${selectedAmount}`);

        return {
            success: true,
            selectedAmount: selectedAmount.trim(),
            type: 'preset'
        };

    } catch (error) {
        console.log(`        ❌ 选择提现金额失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 选择支付方式
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {string} options.method - 支付方式（'UPI', 'USDT', 'EWallet', 'bankcard'）
 * @param {boolean} options.random - 是否随机选择（默认 false）
 * @returns {Promise<Object>} 返回选择结果
 */
export async function selectPaymentMethod(page, options = {}) {
    const { method, random = false } = options;

    console.log('        💳 选择支付方式...');

    try {
        // 获取所有支付方式
        const paymentItems = page.locator('.payment-methods [class*="method"], .payment-methods .item');
        const itemCount = await paymentItems.count();

        if (itemCount === 0) {
            console.log('        ⚠️ 未找到支付方式');
            return {
                success: false,
                error: '未找到支付方式'
            };
        }

        let selectedItem;
        let selectedMethod;

        if (random) {
            // 随机选择
            const randomIndex = Math.floor(Math.random() * itemCount);
            selectedItem = paymentItems.nth(randomIndex);
            selectedMethod = await selectedItem.textContent();
            console.log(`        🎲 随机选择第 ${randomIndex + 1} 个支付方式: ${selectedMethod}`);
        } else if (method) {
            // 根据名称选择
            selectedItem = paymentItems.filter({ hasText: new RegExp(method, 'i') }).first();
            const isVisible = await selectedItem.isVisible({ timeout: 2000 }).catch(() => false);

            if (!isVisible) {
                console.log(`        ⚠️ 未找到支付方式 ${method}`);
                return {
                    success: false,
                    error: `未找到支付方式 ${method}`
                };
            }

            selectedMethod = method;
            console.log(`        💳 选择支付方式: ${selectedMethod}`);
        } else {
            // 默认选择第一个
            selectedItem = paymentItems.first();
            selectedMethod = await selectedItem.textContent();
            console.log(`        💳 选择默认支付方式: ${selectedMethod}`);
        }

        // 点击选择
        await selectedItem.click();
        await page.waitForTimeout(500);

        console.log(`        ✅ 已选择支付方式: ${selectedMethod.trim()}`);

        return {
            success: true,
            selectedMethod: selectedMethod.trim()
        };

    } catch (error) {
        console.log(`        ❌ 选择支付方式失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 点击添加提现账户
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回操作结果
 */
export async function clickAddWithdrawAccount(page) {
    console.log('        ➕ 点击添加提现账户...');

    try {
        const addButton = page.locator('text=Add Withdraw Account').first();
        const isVisible = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVisible) {
            console.log('        ⚠️ 未找到 Add Withdraw Account 按钮');
            return {
                success: false,
                error: '未找到 Add Withdraw Account 按钮'
            };
        }

        await addButton.click();
        console.log('        ✅ 已点击 Add Withdraw Account 按钮');
        await page.waitForTimeout(1500);

        return {
            success: true
        };

    } catch (error) {
        console.log(`        ❌ 点击添加提现账户失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 提交提现申请
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回提交结果
 */
export async function submitWithdraw(page) {
    console.log('        📤 提交提现申请...');

    try {
        const withdrawButton = page.locator('button:has-text("Withdraw")').first();
        const isVisible = await withdrawButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVisible) {
            console.log('        ⚠️ 未找到 Withdraw 按钮');
            return {
                success: false,
                error: '未找到 Withdraw 按钮'
            };
        }

        // 检查按钮是否可点击（可能被禁用）
        const isDisabled = await withdrawButton.isDisabled().catch(() => false);
        if (isDisabled) {
            console.log('        ⚠️ Withdraw 按钮被禁用');
            return {
                success: false,
                error: 'Withdraw 按钮被禁用'
            };
        }

        await withdrawButton.click();
        console.log('        ✅ 已点击 Withdraw 按钮');
        await page.waitForTimeout(2000);

        return {
            success: true
        };

    } catch (error) {
        console.log(`        ❌ 提交提现申请失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 完整的提现流程
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {string} options.amount - 提现金额
 * @param {string} options.customAmount - 自定义金额
 * @param {boolean} options.randomAmount - 随机选择金额
 * @param {string} options.paymentMethod - 支付方式
 * @param {boolean} options.randomPayment - 随机选择支付方式
 * @param {boolean} options.addAccount - 是否需要添加账户
 * @param {boolean} options.submit - 是否提交申请（默认 false，仅验证）
 * @returns {Promise<Object>} 返回流程结果
 */
export async function processWithdraw(page, options = {}) {
    const {
        amount,
        customAmount,
        randomAmount = false,
        paymentMethod,
        randomPayment = false,
        addAccount = false,
        submit = false
    } = options;

    console.log('        🎯 开始提现流程...');

    try {
        // 步骤1: 获取页面信息
        const info = await getWithdrawInfo(page);
        if (!info.success) {
            return {
                success: false,
                error: '获取提现页面信息失败'
            };
        }

        // 步骤2: 选择提现金额
        const amountResult = await selectWithdrawAmount(page, {
            amount,
            customAmount,
            random: randomAmount
        });

        if (!amountResult.success) {
            return {
                success: false,
                error: '选择提现金额失败',
                details: amountResult
            };
        }

        // 步骤3: 选择支付方式
        const paymentResult = await selectPaymentMethod(page, {
            method: paymentMethod,
            random: randomPayment
        });

        if (!paymentResult.success) {
            return {
                success: false,
                error: '选择支付方式失败',
                details: paymentResult
            };
        }

        // 步骤4: 添加提现账户（如果需要）
        let addAccountResult = null;
        if (addAccount) {
            addAccountResult = await clickAddWithdrawAccount(page);
            if (!addAccountResult.success) {
                console.log('        ⚠️ 添加提现账户失败，继续流程');
            }
        }

        // 步骤5: 提交申请（如果需要）
        let submitResult = null;
        if (submit) {
            submitResult = await submitWithdraw(page);
            if (!submitResult.success) {
                return {
                    success: false,
                    error: '提交提现申请失败',
                    details: submitResult
                };
            }
        }

        console.log('        ✅ 提现流程完成');

        return {
            success: true,
            info,
            amount: amountResult,
            payment: paymentResult,
            addAccount: addAccountResult,
            submit: submitResult
        };

    } catch (error) {
        console.log(`        ❌ 提现流程失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
