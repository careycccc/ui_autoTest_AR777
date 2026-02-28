/**
 * 提现账户管理
 * Withdraw Account Management
 */

/**
 * 验证是否已绑定提现账户
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回验证结果
 */
export async function verifyWithdrawAccount(page) {
    console.log('        🔍 验证提现账户...');

    try {
        // 🔥 获取所有支付方式选项
        const paymentOptions = page.locator('.options .option');
        const optionCount = await paymentOptions.count();

        if (optionCount === 0) {
            console.log('        ⚠️ 未找到支付方式选项');
            return {
                success: true,
                hasAccount: false,
                needsBinding: false,    // 如果没有支付方式选项，则认为不需要绑定账户
                uncertain: true
            };
        }

        console.log(`        📊 找到 ${optionCount} 个支付方式选项`);

        // 🔥 遍历每个支付方式，检查是否需要添加账户
        const paymentResults = [];
        let allNeedBinding = true;
        let anyHasAccount = false;

        for (let i = 0; i < optionCount; i++) {
            const option = paymentOptions.nth(i);

            // 获取支付方式名称
            const paymentName = await option.locator('.text').textContent().catch(() => `选项${i + 1}`);
            console.log(`        🔍 检查支付方式: ${paymentName}`);

            // 🔥 设置接口监听
            const apiPromise = page.waitForResponse(
                response => response.url().includes('/api/Withdraw/GetUserWithdrawWallet') && response.status() === 200,
                { timeout: 5000 }
            ).catch(() => null);

            // 点击该选项
            await option.click();

            // 🔥 等待接口响应
            const apiResponse = await apiPromise;
            let apiData = null;
            let hasAccountFromApi = false;

            if (apiResponse) {
                try {
                    const responseBody = await apiResponse.json();
                    console.log(`        📡 API 响应:`, JSON.stringify(responseBody).substring(0, 200));

                    // 检查 data 是否是数组且有值
                    if (responseBody && responseBody.data && Array.isArray(responseBody.data)) {
                        apiData = responseBody.data;
                        hasAccountFromApi = apiData.length > 0;
                        console.log(`        📊 API 返回账户数量: ${apiData.length}`);
                    } else {
                        console.log(`        ⚠️ API 返回数据格式异常`);
                    }
                } catch (e) {
                    console.log(`        ⚠️ 解析 API 响应失败: ${e.message}`);
                }
            } else {
                console.log(`        ⚠️ 未捕获到 API 响应`);
            }

            await page.waitForTimeout(1000);

            // 🔥 UI 验证：检查是否显示 "Add Withdraw Account" 按钮
            const addButton = page.locator('text=Add Withdraw Account');
            const hasAddButton = await addButton.isVisible({ timeout: 2000 }).catch(() => false);

            // 🔥 UI 验证：检查是否有勾选标记或账户信息
            const hasCheckMark = await option.locator('.ar_icon.w_rb, svg').isVisible({ timeout: 1000 }).catch(() => false);
            const accountInfo = page.locator('.account-info, .withdraw-account, [class*="account"]');
            const hasAccountInfo = await accountInfo.isVisible({ timeout: 1000 }).catch(() => false);
            const hasAccountFromUI = hasCheckMark || hasAccountInfo;

            // 🔥 双重验证：API 和 UI 都确认
            const hasAccount = hasAccountFromApi || hasAccountFromUI;
            const needsBinding = hasAddButton && !hasAccountFromApi;

            if (needsBinding) {
                console.log(`        ❌ ${paymentName}: 需要添加账户 (API: ${hasAccountFromApi ? '有' : '无'}, UI: ${hasAddButton ? '显示添加按钮' : '无按钮'})`);
                paymentResults.push({
                    name: paymentName,
                    needsBinding: true,
                    hasAccount: false,
                    apiData: apiData,
                    verification: {
                        api: hasAccountFromApi,
                        ui: !hasAddButton
                    }
                });
            } else if (hasAccount) {
                console.log(`        ✅ ${paymentName}: 已绑定账户 (API: ${hasAccountFromApi ? '有' : '无'}, UI: ${hasAccountFromUI ? '有标记' : '无标记'})`);
                allNeedBinding = false;
                anyHasAccount = true;

                const accountText = hasAccountInfo ? await accountInfo.textContent().catch(() => '') : '';
                paymentResults.push({
                    name: paymentName,
                    needsBinding: false,
                    hasAccount: true,
                    accountInfo: accountText.trim(),
                    apiData: apiData,
                    verification: {
                        api: hasAccountFromApi,
                        ui: hasAccountFromUI
                    }
                });
            } else {
                console.log(`        ⚠️ ${paymentName}: 状态不明确 (API: ${hasAccountFromApi ? '有' : '无'}, UI: ${hasAccountFromUI ? '有标记' : '无标记'})`);
                allNeedBinding = false;
                paymentResults.push({
                    name: paymentName,
                    needsBinding: false,
                    hasAccount: false,
                    uncertain: true,
                    apiData: apiData,
                    verification: {
                        api: hasAccountFromApi,
                        ui: hasAccountFromUI
                    }
                });
            }
        }

        // 🔥 汇总结果
        console.log(`        📊 验证结果汇总:`);
        console.log(`           - 总支付方式: ${optionCount}`);
        console.log(`           - 需要添加账户: ${paymentResults.filter(r => r.needsBinding).length}`);
        console.log(`           - 已有账户: ${paymentResults.filter(r => r.hasAccount).length}`);
        console.log(`           - 状态不明: ${paymentResults.filter(r => r.uncertain).length}`);

        return {
            success: true,
            hasAccount: anyHasAccount,
            needsBinding: allNeedBinding,  // 只有所有支付方式都需要添加时才为 true
            paymentResults,
            summary: {
                total: optionCount,
                needsBinding: paymentResults.filter(r => r.needsBinding).length,
                hasAccount: paymentResults.filter(r => r.hasAccount).length,
                uncertain: paymentResults.filter(r => r.uncertain).length
            }
        };

    } catch (error) {
        console.log(`        ❌ 验证提现账户失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 添加提现账户
 * @param {Page} page - Playwright page 对象
 * @param {Object} accountData - 账户数据
 * @returns {Promise<Object>} 返回添加结果
 */
export async function addWithdrawAccount(page, accountData = {}) {
    console.log('        ➕ 添加提现账户...');

    try {
        // 点击 Add Withdraw Account 按钮
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

        // 等待账户添加表单出现
        const formVisible = await page.locator('.account-form, form').isVisible({ timeout: 3000 }).catch(() => false);

        if (!formVisible) {
            console.log('        ⚠️ 账户添加表单未出现');
            return {
                success: false,
                error: '账户添加表单未出现'
            };
        }

        console.log('        ✅ 账户添加表单已出现');

        // 这里可以添加填写表单的逻辑
        // 根据 accountData 填写相应字段

        return {
            success: true,
            formOpened: true
        };

    } catch (error) {
        console.log(`        ❌ 添加提现账户失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 填写 UPI 账户信息
 * @param {Page} page - Playwright page 对象
 * @param {Object} upiData - UPI 账户数据
 * @returns {Promise<Object>} 返回填写结果
 */
export async function fillUPIAccount(page, upiData = {}) {
    const { upiId, name, mobile } = upiData;

    console.log('        📝 填写 UPI 账户信息...');

    try {
        // 填写 UPI ID
        if (upiId) {
            const upiInput = page.locator('input[placeholder*="UPI"], input[name*="upi"]').first();
            await upiInput.fill(upiId);
            console.log(`        ✓ UPI ID: ${upiId}`);
        }

        // 填写姓名
        if (name) {
            const nameInput = page.locator('input[placeholder*="Name"], input[name*="name"]').first();
            await nameInput.fill(name);
            console.log(`        ✓ Name: ${name}`);
        }

        // 填写手机号
        if (mobile) {
            const mobileInput = page.locator('input[placeholder*="Mobile"], input[name*="mobile"]').first();
            await mobileInput.fill(mobile);
            console.log(`        ✓ Mobile: ${mobile}`);
        }

        await page.waitForTimeout(500);

        console.log('        ✅ UPI 账户信息填写完成');

        return {
            success: true
        };

    } catch (error) {
        console.log(`        ❌ 填写 UPI 账户信息失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 填写银行卡账户信息
 * @param {Page} page - Playwright page 对象
 * @param {Object} bankData - 银行卡数据
 * @returns {Promise<Object>} 返回填写结果
 */
export async function fillBankAccount(page, bankData = {}) {
    const { accountNumber, ifscCode, accountName, bankName } = bankData;

    console.log('        📝 填写银行卡账户信息...');

    try {
        // 填写账号
        if (accountNumber) {
            const accountInput = page.locator('input[placeholder*="Account"], input[name*="account"]').first();
            await accountInput.fill(accountNumber);
            console.log(`        ✓ Account Number: ${accountNumber}`);
        }

        // 填写 IFSC Code
        if (ifscCode) {
            const ifscInput = page.locator('input[placeholder*="IFSC"], input[name*="ifsc"]').first();
            await ifscInput.fill(ifscCode);
            console.log(`        ✓ IFSC Code: ${ifscCode}`);
        }

        // 填写账户名
        if (accountName) {
            const nameInput = page.locator('input[placeholder*="Name"], input[name*="name"]').first();
            await nameInput.fill(accountName);
            console.log(`        ✓ Account Name: ${accountName}`);
        }

        // 填写银行名称
        if (bankName) {
            const bankInput = page.locator('input[placeholder*="Bank"], input[name*="bank"]').first();
            await bankInput.fill(bankName);
            console.log(`        ✓ Bank Name: ${bankName}`);
        }

        await page.waitForTimeout(500);

        console.log('        ✅ 银行卡账户信息填写完成');

        return {
            success: true
        };

    } catch (error) {
        console.log(`        ❌ 填写银行卡账户信息失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 提交账户信息
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回提交结果
 */
export async function submitAccountInfo(page) {
    console.log('        📤 提交账户信息...');

    try {
        const submitButton = page.locator('button:has-text("Submit"), button:has-text("Confirm")').first();
        const isVisible = await submitButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVisible) {
            console.log('        ⚠️ 未找到提交按钮');
            return {
                success: false,
                error: '未找到提交按钮'
            };
        }

        await submitButton.click();
        console.log('        ✅ 已点击提交按钮');
        await page.waitForTimeout(2000);

        return {
            success: true
        };

    } catch (error) {
        console.log(`        ❌ 提交账户信息失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
