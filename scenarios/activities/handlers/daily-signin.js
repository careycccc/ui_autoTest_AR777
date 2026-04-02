/**
 * 每日签到活动处理器
 * 包含每日签到的所有处理逻辑
 * 
 * 处理流程：
 * 1. 检查是否是弹窗形式
 * 2. 情况1：显示 "Claim" 按钮，点击领取奖励
 * 3. 情况2：显示 "Deposit Now" 按钮，点击 "Details >" 进入每日签到页面
 * 4. 进入每日签到页面后，检查是否有 "Deposit" 按钮
 * 5. 如果有，点击进入充值界面（使用充值处理器）
 */

import { elementExists } from '../../../src/utils/element-finder.js';

/**
 * 每日签到活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handleDailySignIn(page, test) {
    console.log('      🎯 处理每日签到活动...');

    try {
        // 1. 检查是否是弹窗形式
        const isPopup = await checkForDailySignInPopup(page);

        if (isPopup) {
            console.log('      ✅ 检测到每日签到弹窗');
            return await handleDailySignInPopup(page, test);
        } else {
            console.log('      ✅ 检测到每日签到页面');
            return await handleDailySignInPage(page, test);
        }

    } catch (error) {
        console.log(`      ❌ 每日签到处理失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-error');
        return { success: false, error: error.message };
    }
}

/**
 * 检查是否是每日签到弹窗
 * @param {Object} page - Playwright page 对象
 * @returns {Promise<boolean>} 是否是弹窗
 */
async function checkForDailySignInPopup(page) {
    console.log('      🔍 检查是否是每日签到弹窗...');

    try {
        // 检查是否有弹窗标题 "Daily check-in"
        const hasPopupTitle = await elementExists(page, {
            selector: '.sheet-panel',
            hasText: 'Daily check-in',
            timeout: 2000
        });

        if (hasPopupTitle) {
            console.log('      ✅ 检测到弹窗标题 "Daily check-in"');
            return true;
        }

        // 检查是否有页面标题 "Daily deposit rewards"
        const hasPageTitle = await elementExists(page, {
            selector: '.daily-name',
            hasText: 'Daily deposit rewards',
            timeout: 2000
        });

        if (hasPageTitle) {
            console.log('      ✅ 检测到页面标题 "Daily deposit rewards"');
            return false;
        }

        // 默认认为是弹窗
        console.log('      ⚠️ 无法确定，默认认为是弹窗');
        return true;

    } catch (error) {
        console.log(`      ⚠️ 检查弹窗状态失败: ${error.message}`);
        return true;
    }
}

/**
 * 处理每日签到弹窗
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleDailySignInPopup(page, test) {
    console.log('      🎯 处理每日签到弹窗...');

    try {
        // 检查是否有 "Claim" 按钮（情况1：可领取）
        const hasClaimButton = await elementExists(page, {
            selector: '.activity-btn',
            hasText: 'Claim',
            timeout: 2000
        });

        if (hasClaimButton) {
            console.log('      ✅ 检测到 "Claim" 按钮，执行领取逻辑');
            return await handleClaimReward(page, test);
        }

        // 检查是否有 "Deposit Now" 按钮（情况2：需要充值）
        const hasDepositButton = await elementExists(page, {
            selector: '.activity-btn',
            hasText: 'Deposit Now',
            timeout: 2000
        });

        if (hasDepositButton) {
            console.log('      ✅ 检测到 "Deposit Now" 按钮，进入每日签到页面');
            return await handleEnterDailySignInPage(page, test);
        }

        // 都没有，返回成功（页面验证通过）
        console.log('      ✅ 每日签到弹窗验证完成');
        await page.waitForTimeout(1000);

        return { success: true, activityName: '每日签到', action: '弹窗验证' };

    } catch (error) {
        console.log(`      ❌ 处理每日签到弹窗失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-popup-error');
        return { success: false, error: error.message };
    }
}

/**
 * 处理领取奖励逻辑（情况1）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleClaimReward(page, test) {
    console.log('      🎯 执行领取奖励逻辑...');

    try {
        // 1. 点击 "Claim" 按钮
        console.log('      👆 点击 "Claim" 按钮...');
        const claimButton = page.locator('.activity-btn').filter({ hasText: 'Claim' }).first();
        await claimButton.click();
        await page.waitForTimeout(2000);

        // 2. 检查是否出现 "Reward Claimed" 弹窗
        console.log('      🔍 检查是否出现 "Reward Claimed" 弹窗...');
        const hasRewardPopup = await elementExists(page, {
            selector: '.received-dialog',
            hasText: 'Reward Claimed',
            timeout: 3000
        });

        if (hasRewardPopup) {
            console.log('      ✅ 检测到 "Reward Claimed" 弹窗');

            // 3. 点击 "Closed" 按钮关闭弹窗
            console.log('      👆 点击 "Closed" 按钮关闭弹窗...');
            const closeButton = page.locator('.receive-btn').filter({ hasText: 'Closed' }).first();
            await closeButton.click();
            await page.waitForTimeout(1000);

            console.log('      ✅ 领取奖励成功');
            return { success: true, activityName: '每日签到', action: '领取奖励' };
        } else {
            console.log('      ⚠️ 未检测到 "Reward Claimed" 弹窗');
            return { success: true, activityName: '每日签到', action: '点击Claim' };
        }

    } catch (error) {
        console.log(`      ❌ 领取奖励失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-claim-error');
        return { success: false, error: error.message };
    }
}

/**
 * 处理进入每日签到页面逻辑（情况2）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleEnterDailySignInPage(page, test) {
    console.log('      🎯 进入每日签到页面...');

    try {
        // 1. 点击 "Details >" 按钮
        console.log('      👆 点击 "Details >" 按钮...');
        const detailsButton = page.locator('.bottom-head div').filter({ hasText: 'Details >' }).first();
        await detailsButton.click();

        // 2. 使用 switchToPage 切换到每日签到页面
        console.log('      🔄 使用 switchToPage 切换到每日签到页面...');
        const switchSuccess = await test.switchToPage('每日签到页面', {
            waitForSelector: '.daily-name',
            waitTime: 2000
        });

        if (!switchSuccess) {
            console.log('      ⚠️ 切换到每日签到页面失败');
            return { success: false, reason: '切换到每日签到页面失败' };
        }

        console.log('      ✅ 成功进入每日签到页面');

        // 3. 处理每日签到页面
        return await handleDailySignInPage(page, test);

    } catch (error) {
        console.log(`      ❌ 进入每日签到页面失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-enter-error');
        return { success: false, error: error.message };
    }
}

/**
 * 处理每日签到页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleDailySignInPage(page, test) {
    console.log('      🎯 处理每日签到页面...');

    try {
        // 1. 检查是否是模式1（需要充值）
        const isMode1 = await checkIsMode1(page);

        if (isMode1) {
            console.log('      ✅ 检测到模式1（需要充值）');
            return await handleMode1(page, test);
        } else {
            console.log('      ✅ 检测到模式2（已满足条件）');
            return await handleMode2(page, test);
        }

    } catch (error) {
        console.log(`      ❌ 处理每日签到页面失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-page-error');
        return { success: false, error: error.message };
    }
}

/**
 * 检查是否是模式1（需要充值）
 * @param {Object} page - Playwright page 对象
 * @returns {Promise<boolean>} 是否是模式1
 */
async function checkIsMode1(page) {
    console.log('      🔍 检查是否是模式1...');

    try {
        // 检查是否有页面标题 "Daily deposit rewards"
        const hasPageTitle = await elementExists(page, {
            selector: '.daily-name',
            hasText: 'Daily deposit rewards',
            timeout: 2000
        });

        if (!hasPageTitle) {
            console.log('      ⚠️ 未找到页面标题 "Daily deposit rewards"');
            return false;
        }

        // 检查是否有充值提示 "Deposit ₹100.00 more today to claim ₹10.00."
        const hasDepositTips = await elementExists(page, {
            selector: '.footer-tips',
            hasText: 'Deposit',
            timeout: 2000
        });

        if (hasDepositTips) {
            console.log('      ✅ 检测到充值提示');
            return true;
        }

        // 检查是否有 "Days 28"（或其他天数）
        const hasRewardDay = await elementExists(page, {
            selector: '.reward-day',
            timeout: 2000
        });

        if (hasRewardDay) {
            console.log('      ✅ 检测到奖励天数');
            return true;
        }

        console.log('      ⚠️ 未检测到模式1的特征');
        return false;

    } catch (error) {
        console.log(`      ⚠️ 检查模式1失败: ${error.message}`);
        return false;
    }
}

/**
 * 处理模式1（需要充值）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleMode1(page, test) {
    console.log('      🎯 处理模式1（需要充值）...');

    try {
        // 1. 获取充值金额
        const depositAmount = await getDepositAmountFromMode1(page);

        if (depositAmount) {
            console.log(`      ✅ 获取到充值金额: ${depositAmount}`);
        } else {
            console.log('      ⚠️ 未能获取充值金额');
        }

        // 2. 点击 "Go to deposit" 按钮
        console.log('      👆 点击 "Go to deposit" 按钮...');
        const goToDepositButton = page.locator('.daily-footer-btn').filter({ hasText: 'Go to deposit' }).first();
        await goToDepositButton.click();

        // 3. 使用 switchToPage 切换到充值页面
        console.log('      🔄 使用 switchToPage 切换到充值页面...');
        const switchSuccess = await test.switchToPage('充值页面', {
            waitForSelector: '.route-name',
            waitTime: 2000
        });

        if (!switchSuccess) {
            console.log('      ⚠️ 切换到充值页面失败');
            return { success: false, reason: '切换到充值页面失败' };
        }

        console.log('      ✅ 成功进入充值页面');

        // 4. 处理充值页面（使用充值处理器，传递充值金额和模式1标志）
        const { handleDepositPage } = await import('../deposit/deposit-handler.js');
        return await handleDepositPage(page, test, { depositAmount, isMode1: true });

    } catch (error) {
        console.log(`      ❌ 处理模式1失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-mode1-error');
        return { success: false, error: error.message };
    }
}

/**
 * 从模式1页面获取充值金额
 * @param {Object} page - Playwright page 对象
 * @returns {Promise<string|null>} 充值金额
 */
async function getDepositAmountFromMode1(page) {
    console.log('      🔍 从模式1页面获取充值金额...');

    try {
        // 查找充值提示元素
        const tipsElement = page.locator('.footer-tips').first();
        const isVisible = await tipsElement.isVisible({ timeout: 2000 }).catch(() => false);

        if (!isVisible) {
            console.log('      ⚠️ 未找到充值提示元素');
            return null;
        }

        // 获取充值提示文本
        const tipsText = await tipsElement.textContent().catch(() => '');
        console.log(`      📊 充值提示文本: "${tipsText}"`);

        // 提取充值金额（格式：Deposit ₹100.00 more today to claim ₹10.00.）
        const amountMatch = tipsText.match(/₹([\d,]+\.?\d*)/);
        if (amountMatch) {
            const amount = amountMatch[1];
            console.log(`      ✅ 提取到充值金额: ${amount}`);
            return amount;
        } else {
            console.log('      ⚠️ 未能从文本中提取充值金额');
            return null;
        }

    } catch (error) {
        console.log(`      ⚠️ 获取充值金额失败: ${error.message}`);
        return null;
    }
}

/**
 * 处理模式2（已满足条件）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleMode2(page, test) {
    console.log('      🎯 处理模式2（已满足条件）...');

    try {
        // 1. 检查是否有 "Claim" 按钮
        const hasClaimButton = await elementExists(page, {
            selector: '.btn.claim',
            hasText: 'Claim',
            timeout: 2000
        });

        if (hasClaimButton) {
            console.log('      ✅ 检测到 "Claim" 按钮');

            // 2. 检查按钮是否已经领取（class 包含 "claimed"）
            const claimButton = page.locator('.btn.claim').filter({ hasText: 'Claim' }).first();
            const buttonClass = await claimButton.getAttribute('class').catch(() => '');
            const isClaimed = buttonClass && buttonClass.includes('claimed');

            if (isClaimed) {
                console.log('      ℹ️ 按钮已领取（class 包含 "claimed"），直接返回');
                return {
                    success: true,
                    activityName: '每日签到',
                    action: '已领取'
                };
            }

            // 3. 点击 "Claim" 按钮
            console.log('      👆 点击 "Claim" 按钮...');
            await claimButton.click();
            await page.waitForTimeout(2000);

            // 4. 处理 "Reward Claimed" 弹窗
            return await handleRewardClaimedPopup(page, test);
        } else {
            console.log('      ⚠️ 未找到 "Claim" 按钮');
            return {
                success: true,
                activityName: '每日签到',
                action: '模式2验证'
            };
        }

    } catch (error) {
        console.log(`      ❌ 处理模式2失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-mode2-error');
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
