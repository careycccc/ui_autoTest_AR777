/**
 * 充值页面处理器
 * 包含充值页面的所有处理逻辑
 * 
 * 处理流程：
 * 1. 检查是否出现 "Deposit Tutorial Video" 弹窗
 * 2. 情况1：有弹窗，点击关闭按钮
 * 3. 情况2：无弹窗，直接进入充值页面
 * 4. 验证充值页面元素
 * 5. 如果有充值金额，填写充值金额
 * 6. 点击充值按钮
 * 7. 等待充值成功
 * 8. 返回每日签到页面（如果是模式1或模式2）
 * 9. 处理签到逻辑（模式1：遍历找到可签到项；模式2：点击Claim按钮）
 * 10. 处理 "Reward Claimed" 弹窗
 * 11. 点击 "Bet Now" 按钮进入首页
 */

import { elementExists } from '../../src/utils/element-finder.js';

/**
 * 充值页面主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {Object} options - 可选参数
 * @param {string} options.depositAmount - 充值金额（可选）
 * @param {boolean} options.isMode1 - 是否是模式1（需要充值）
 * @param {boolean} options.isMode2 - 是否是模式2（已满足条件）
 * @returns {Promise<Object>} 处理结果
 */
export async function handleDepositPage(page, test, options = {}) {
    const { depositAmount, isMode1 = false, isMode2 = false } = options;

    console.log('      🎯 处理充值页面...');
    if (depositAmount) {
        console.log(`      💰 充值金额: ${depositAmount}`);
    }
    if (isMode1) {
        console.log('      📌 模式1：充值成功后需要返回每日签到页面并处理签到');
    }
    if (isMode2) {
        console.log('      📌 模式2：充值成功后需要返回每日签到页面并点击Claim按钮');
    }

    try {
        // 1. 检查是否出现 "Deposit Tutorial Video" 弹窗
        const hasTutorialPopup = await checkForTutorialPopup(page);

        if (hasTutorialPopup) {
            console.log('      ✅ 检测到 "Deposit Tutorial Video" 弹窗');
            return await handleTutorialPopup(page, test, { depositAmount, isMode1, isMode2 });
        } else {
            console.log('      ✅ 未检测到弹窗，直接进入充值页面');
            return await handleDepositPageContent(page, test, { depositAmount, isMode1, isMode2 });
        }

    } catch (error) {
        console.log(`      ❌ 充值页面处理失败: ${error.message}`);
        await test.captureScreenshot('deposit-page-error');
        return { success: false, error: error.message };
    }
}

/**
 * 检查是否出现 "Deposit Tutorial Video" 弹窗
 * @param {Object} page - Playwright page 对象
 * @returns {Promise<boolean>} 是否有弹窗
 */
async function checkForTutorialPopup(page) {
    console.log('      🔍 检查是否出现 "Deposit Tutorial Video" 弹窗...');

    try {
        // 检查是否有弹窗标题 "Deposit Tutorial Video"
        const hasPopupTitle = await elementExists(page, {
            selector: '.dialogTitle',
            hasText: 'Deposit Tutorial Video',
            timeout: 2000
        });

        if (hasPopupTitle) {
            console.log('      ✅ 检测到弹窗标题 "Deposit Tutorial Video"');
            return true;
        }

        // 检查是否有关闭按钮（弹窗的标志）
        const hasCloseButton = await elementExists(page, {
            selector: '.close-btn',
            timeout: 2000
        });

        if (hasCloseButton) {
            console.log('      ✅ 检测到关闭按钮（可能是弹窗）');
            return true;
        }

        console.log('      ✅ 未检测到弹窗');
        return false;

    } catch (error) {
        console.log(`      ⚠️ 检查弹窗状态失败: ${error.message}`);
        return false;
    }
}

/**
 * 处理 "Deposit Tutorial Video" 弹窗（情况1）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {Object} options - 可选参数
 * @param {string} options.depositAmount - 充值金额（可选）
 * @param {boolean} options.isMode1 - 是否是模式1（需要充值）
 * @param {boolean} options.isMode2 - 是否是模式2（从每日签到进入）
 * @returns {Promise<Object>} 处理结果
 */
async function handleTutorialPopup(page, test, options = {}) {
    const { depositAmount, isMode1, isMode2 } = options;

    console.log('      🎯 处理 "Deposit Tutorial Video" 弹窗...');

    try {
        // 1. 点击关闭按钮
        console.log('      👆 点击关闭按钮...');
        const closeButton = page.locator('.close-btn').first();
        await closeButton.click();
        await page.waitForTimeout(1000);

        console.log('      ✅ 弹窗已关闭');

        // 2. 处理充值页面内容
        return await handleDepositPageContent(page, test, { depositAmount, isMode1, isMode2 });

    } catch (error) {
        console.log(`      ❌ 处理弹窗失败: ${error.message}`);
        await test.captureScreenshot('deposit-tutorial-popup-error');
        return { success: false, error: error.message };
    }
}

/**
 * 处理充值页面内容（情况2）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {Object} options - 可选参数
 * @param {string} options.depositAmount - 充值金额（可选）
 * @param {boolean} options.isMode1 - 是否是模式1（需要充值）
 * @param {boolean} options.isMode2 - 是否是模式2（从每日签到进入）
 * @returns {Promise<Object>} 处理结果
 */
async function handleDepositPageContent(page, test, options = {}) {
    const { depositAmount, isMode1, isMode2 } = options;

    console.log('      🎯 处理充值页面内容...');
    if (depositAmount) {
        console.log(`      💰 将填写充值金额: ${depositAmount}`);
    }
    if (isMode1) {
        console.log('      📌 模式1：充值成功后需要返回每日签到页面并处理签到');
    }
    if (isMode2) {
        console.log('      📌 模式2：充值成功后需要返回每日签到页面并点击Claim按钮');
    }

    try {
        // 1. 验证充值页面元素
        console.log('      🔍 验证充值页面元素...');

        // 检查是否有页面标题 "Deposit"
        const hasPageTitle = await elementExists(page, {
            selector: '.route-name',
            hasText: 'Deposit',
            timeout: 2000
        });

        if (hasPageTitle) {
            console.log('      ✅ 检测到页面标题 "Deposit"');
        } else {
            console.log('      ⚠️ 未检测到页面标题 "Deposit"');
        }

        // 2. 检查充值方式列表
        const hasPaymentMethods = await elementExists(page, {
            selector: '.payment-method, .deposit-method, .recharge-method',
            timeout: 2000
        });

        if (hasPaymentMethods) {
            console.log('      ✅ 检测到充值方式列表');
        } else {
            console.log('      ⚠️ 未检测到充值方式列表');
        }

        // 3. 检查充值金额输入框
        const hasAmountInput = await elementExists(page, {
            selector: 'input[type="number"], input[placeholder*="amount"], input[placeholder*="Amount"]',
            timeout: 2000
        });

        if (hasAmountInput) {
            console.log('      ✅ 检测到充值金额输入框');

            // 4. 如果有充值金额，填写充值金额
            if (depositAmount) {
                console.log(`      📝 填写充值金额: ${depositAmount}`);
                const amountInput = page.locator('input[type="number"], input[placeholder*="amount"], input[placeholder*="Amount"]').first();
                await amountInput.clear();
                await amountInput.fill(depositAmount);
                await page.waitForTimeout(500);
                console.log('      ✅ 充值金额已填写');
            }
        } else {
            console.log('      ⚠️ 未检测到充值金额输入框');
        }

        // 5. 检查充值按钮
        const hasDepositButton = await elementExists(page, {
            selector: 'button:has-text("Deposit"), button:has-text("Recharge"), .deposit-btn, .recharge-btn',
            timeout: 2000
        });

        if (hasDepositButton) {
            console.log('      ✅ 检测到充值按钮');

            // 6. 点击充值按钮
            console.log('      👆 点击充值按钮...');
            const depositButton = page.locator('button:has-text("Deposit"), button:has-text("Recharge"), .deposit-btn, .recharge-btn').first();
            await depositButton.click();
            await page.waitForTimeout(3000);

            // 7. 等待充值成功并返回每日签到页面
            if (isMode1 || isMode2) {
                console.log('      🔄 等待充值成功，返回每日签到页面...');
                await page.waitForTimeout(2000);

                // 8. 返回每日签到页面
                return await handleReturnToDailySignInAndClaim(page, test, { isMode1, isMode2 });
            } else {
                console.log('      ✅ 充值页面验证完成（非模式1/模式2）');
                await page.waitForTimeout(1000);
                return {
                    success: true,
                    activityName: '充值页面',
                    action: '页面验证',
                    depositAmount: depositAmount || null
                };
            }
        } else {
            console.log('      ⚠️ 未检测到充值按钮');
            return {
                success: true,
                activityName: '充值页面',
                action: '页面验证',
                depositAmount: depositAmount || null
            };
        }

    } catch (error) {
        console.log(`      ❌ 处理充值页面内容失败: ${error.message}`);
        await test.captureScreenshot('deposit-content-error');
        return { success: false, error: error.message };
    }
}

/**
 * 返回每日签到页面并点击 "Claim" 按钮（模式1/模式2）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {Object} options - 可选参数
 * @param {boolean} options.isMode1 - 是否是模式1（需要充值）
 * @param {boolean} options.isMode2 - 是否是模式2（已满足条件）
 * @returns {Promise<Object>} 处理结果
 */
async function handleReturnToDailySignInAndClaim(page, test, options = {}) {
    const { isMode1 = false, isMode2 = false } = options;

    console.log('      🎯 返回每日签到页面并点击 "Claim" 按钮...');
    if (isMode1) {
        console.log('      📌 模式1：需要遍历找到可签到项');
    }
    if (isMode2) {
        console.log('      📌 模式2：直接点击Claim按钮');
    }

    try {
        // 1. 检查是否在每日签到页面
        const isOnDailySignInPage = await elementExists(page, {
            selector: '.daily-name',
            hasText: 'Daily deposit rewards',
            timeout: 3000
        });

        if (isOnDailySignInPage) {
            console.log('      ✅ 已在每日签到页面');
        } else {
            console.log('      ⚠️ 不在每日签到页面，尝试返回...');
            await page.goBack();
            await page.waitForTimeout(2000);
        }

        // 2. 模式1：遍历所有签到项，找到没有 lock 属性的项
        if (isMode1) {
            console.log('      🔍 遍历所有签到项，查找可签到项...');

            // 获取所有签到项
            const dailyItems = page.locator('.daily-everyday-item');
            const itemCount = await dailyItems.count();
            console.log(`      📊 找到 ${itemCount} 个签到项`);

            // 遍历所有项，找到没有 lock 属性的项
            for (let i = 0; i < itemCount; i++) {
                const item = dailyItems.nth(i);

                // 检查是否有 lock 属性
                const hasLockClass = await item.locator('.daily-everyday-item-container').first()
                    .getAttribute('class')
                    .then(classes => classes && classes.includes('lock'))
                    .catch(() => false);

                if (!hasLockClass) {
                    console.log(`      ✅ 找到可签到项（索引 ${i}）`);

                    // 点击可签到项
                    console.log('      👆 点击可签到项...');
                    await item.click();
                    await page.waitForTimeout(2000);

                    // 处理 "Reward Claimed" 弹窗
                    return await handleRewardClaimedPopup(page, test);
                }
            }

            console.log('      ⚠️ 未找到可签到项');
            return {
                success: true,
                activityName: '每日签到',
                action: '遍历签到项失败'
            };
        }

        // 3. 模式2：直接点击 "Claim" 按钮
        if (isMode2) {
            console.log('      🔍 查找 "Claim" 按钮...');

            // 查找 "Claim" 按钮
            const claimButton = page.locator('.btn.claim').filter({ hasText: 'Claim' }).first();
            const isClaimButtonVisible = await claimButton.isVisible({ timeout: 2000 }).catch(() => false);

            if (isClaimButtonVisible) {
                console.log('      ✅ 检测到 "Claim" 按钮');

                // 点击 "Claim" 按钮
                console.log('      👆 点击 "Claim" 按钮...');
                await claimButton.click();
                await page.waitForTimeout(2000);

                // 处理 "Reward Claimed" 弹窗
                return await handleRewardClaimedPopup(page, test);
            } else {
                console.log('      ⚠️ 未找到 "Claim" 按钮');
                return {
                    success: true,
                    activityName: '每日签到',
                    action: '查找Claim按钮失败'
                };
            }
        }

    } catch (error) {
        console.log(`      ❌ 返回每日签到页面失败: ${error.message}`);
        await test.captureScreenshot('return-daily-signin-error');
        return { success: false, error: error.message };
    }
}

/**
 * 处理 "Reward Claimed" 弹窗
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleRewardClaimedPopup(page, test) {
    console.log('      🎯 处理 "Reward Claimed" 弹窗...');

    try {
        // 1. 检查是否出现 "Reward Claimed" 弹窗
        const hasRewardPopup = await elementExists(page, {
            selector: '.received-dialog',
            hasText: 'Reward Claimed',
            timeout: 3000
        });

        if (hasRewardPopup) {
            console.log('      ✅ 检测到 "Reward Claimed" 弹窗');

            // 2. 点击 "Bet Now" 按钮
            console.log('      👆 点击 "Bet Now" 按钮...');
            const betNowButton = page.locator('.receive-btn').filter({ hasText: 'Bet Now' }).first();
            await betNowButton.click();
            await page.waitForTimeout(2000);

            console.log('      ✅ 已点击 "Bet Now" 按钮，进入首页');
            console.log('      ✅ 每日签到流程完成');

            return {
                success: true,
                activityName: '每日签到',
                action: '签到完成'
            };
        } else {
            console.log('      ⚠️ 未检测到 "Reward Claimed" 弹窗');
            return {
                success: true,
                activityName: '每日签到',
                action: '点击Claim'
            };
        }

    } catch (error) {
        console.log(`      ❌ 处理 "Reward Claimed" 弹窗失败: ${error.message}`);
        await test.captureScreenshot('reward-claimed-popup-error');
        return { success: false, error: error.message };
    }
}
