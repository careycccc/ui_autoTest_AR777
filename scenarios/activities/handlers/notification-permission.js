/**
 * 通知权限开启活动处理器
 * 包含通知权限开启的所有处理逻辑
 */

import { findElement, elementExists } from '../../../src/utils/element-finder.js';

/**
 * 通知权限开启活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handleNotificationPermission(page, test) {
    console.log('      🎯 处理通知权限开启活动...');

    try {
        // 🔥 使用项目级 findElement 查找通知权限弹窗
        // 先在 .sheet-mask 容器内找，找不到则全局，最多重试两次
        let notificationSheet;
        try {
            notificationSheet = await findElement(page, test, {
                selector: '.sheet-panel',
                hasText: 'Enable Notifications',
                contextSelector: '.sheet-mask',
                timeout: 5000
            });
        } catch (e) {
            console.log(`      ❌ 未找到通知权限弹窗: ${e.message}`);
            return { success: false, reason: '未找到通知权限弹窗' };
        }

        console.log('      ✅ 发现通知权限弹窗');

        // 🔥 使用 elementExists 查找启用按钮，如果不存在则是只有关闭按钮的情况
        console.log('      🔍 查找 "Enable Now & Claim" 按钮...');
        const hasEnableButton = await elementExists(page, {
            text: 'Enable Now & Claim',
            contextSelector: '.sheet-mask',
            timeout: 3000
        });

        if (!hasEnableButton) {
            console.log(`      ⚠️ 未找到 "Enable Now & Claim" 按钮，该活动可能是说明或已参与`);
            console.log(`      👆 点击关闭按钮跳过本次活动...`);
            
            // 尝试点击多态关闭按钮 (SVG close, or any close class)
            let closed = false;
            const closeSelectors = [
                '.sheet-mask .close.close',
                '.sheet-mask .ar_icon.close',
                '.sheet-panel .close',
                '.close-icon',
                'button.close'
            ];
            
            for (const sel of closeSelectors) {
                const btn = page.locator(sel).first();
                if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await btn.click();
                    closed = true;
                    console.log(`      ✅ 已点击关闭按钮 (${sel})`);
                    break;
                }
            }
            
            if (!closed) {
                console.log(`      ❌ 未找到可用的关闭按钮`);
                return { success: false, reason: '无开启按钮且未找到关闭按钮' };
            }
            
            await page.waitForTimeout(1000);
            return { success: true, activityName: '通知权限开启', reason: '跳过无操作弹窗' };
        }

        // 找到了启用按钮，获取并点击
        const enableButton = await findElement(page, test, {
            text: 'Enable Now & Claim',
            contextSelector: '.sheet-mask',
            timeout: 1000
        });

        // 🔥 等待8秒
        console.log('      ⏳ 等待 8 秒...');
        await page.waitForTimeout(8000);

        console.log('      👆 点击 "Enable Now & Claim" 按钮...');
        await enableButton.click();
        await page.waitForTimeout(2000);

        // 🔥 检查后续是否有弹窗
        const receivedDialog = page.locator('.received-dialog');
        const hasReceivedDialog = await receivedDialog.isVisible({ timeout: 3000 }).catch(() => false);
        
        let rewardAmount = '';

        if (!hasReceivedDialog) {
            console.log('      ❌ 点击后未出现奖励领取弹窗');
            await test.captureScreenshot('notification-permission-no-popup-error');
            throw new Error('点击 Enable Now & Claim 按钮后未出现任何弹窗');
        } else {
            console.log('      ✅ 出现奖励领取弹窗');

            // 🔥 获取奖励金额
            rewardAmount = await receivedDialog.locator('.received-money').textContent().catch(() => '');
            console.log(`      💰 奖励金额: ${rewardAmount}`);

            // 🔥 验证奖励文本
            const rewardText = await receivedDialog.locator('.received-text').textContent().catch(() => '');
            console.log(`      📝 奖励文本: "${rewardText}"`);

            // 🔥 点击 "Bet Now" 按钮
            const betNowButton = receivedDialog.locator('.receive-btn').filter({ hasText: 'Bet Now' });
            const hasBetNowButton = await betNowButton.isVisible({ timeout: 2000 }).catch(() => false);

            if (!hasBetNowButton) {
                console.log('      ⚠️ 未找到 "Bet Now" 按钮');
                // 尝试点击关闭按钮
                const closeIcon = receivedDialog.locator('.close-icon');
                const hasCloseIcon = await closeIcon.isVisible({ timeout: 1000 }).catch(() => false);
                if (hasCloseIcon) {
                    console.log('      👆 点击关闭按钮...');
                    await closeIcon.click();
                    await page.waitForTimeout(1000);
                }
            } else {
                console.log('      👆 点击 "Bet Now" 按钮...');

                // 记录点击前的 URL
                const beforeUrl = page.url();
                console.log(`      📍 点击前 URL: ${beforeUrl}`);

                await betNowButton.click();
                await page.waitForTimeout(2000);

                // 记录点击后的 URL
                const afterUrl = page.url();
                console.log(`      📍 点击后 URL: ${afterUrl}`);

                // 🔥 检查是否跳转到首页
                const isHomePage = afterUrl.includes('arplatsaassit4.club') &&
                    (afterUrl.endsWith('/') || afterUrl.includes('/home') || afterUrl.split('/').length <= 4);

                if (isHomePage) {
                    console.log('      ✅ 已跳转到首页');

                    // 🔥 处理首页弹窗
                    console.log('      🔄 检查并处理首页弹窗...');
                    await handleHomePopups(page, test);

                    // 🔥 返回到活动资讯页面
                    console.log('      ↩️ 返回到活动资讯页面...');
                    const returnResult = await returnToActivityPage(page, test);

                    if (!returnResult.success) {
                        console.log('      ❌ 返回活动资讯页面失败');
                        await test.captureScreenshot('notification-permission-return-failed');

                        // 🔥 强制跳转到活动资讯页面
                        console.log('      🔄 强制跳转到活动资讯页面...');
                        await forceNavigateToActivity(page, test);

                        return {
                            success: false,
                            error: '返回活动资讯失败，已强制跳转',
                            rewardAmount: rewardAmount
                        };
                    }

                    console.log('      ✅ 成功返回活动资讯页面');

                } else {
                    console.log('      ⚠️ 未跳转到首页，当前页面可能不正确');
                    console.log(`      📍 当前 URL: ${afterUrl}`);
                }
            }
        }

        console.log('      ✅ 通知权限开启活动处理完成');

        return {
            success: true,
            activityName: '通知权限开启',
            rewardAmount: rewardAmount || '未知'
        };

    } catch (error) {
        console.log(`      ❌ 通知权限开启活动处理失败: ${error.message}`);
        await test.captureScreenshot('notification-permission-error');

        // 尝试强制返回活动资讯
        try {
            await forceNavigateToActivity(page, test);
        } catch (e) {
            console.log(`      ❌ 强制跳转也失败: ${e.message}`);
        }

        return { success: false, error: error.message };
    }
}

/**
 * 🔥 处理首页弹窗
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleHomePopups(page, test) {
    console.log('      🔍 检查首页弹窗...');

    let popupCount = 0;
    const maxAttempts = 5; // 最多处理5个弹窗

    for (let i = 0; i < maxAttempts; i++) {
        // 检查是否有弹窗
        const popup = page.locator('.popup-container, .dialog-container, .sheet-panel').first();
        const hasPopup = await popup.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasPopup) {
            console.log(`      ℹ️ 未发现更多弹窗（已处理 ${popupCount} 个）`);
            break;
        }

        console.log(`      📋 发现弹窗 ${i + 1}`);

        // 查找关闭按钮
        const closeButton = popup.locator('.popup-close, .close-icon, .close, [class*="close"]').first();
        const hasCloseButton = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasCloseButton) {
            console.log(`      👆 点击关闭按钮（弹窗 ${i + 1}）`);
            await closeButton.click();
            await page.waitForTimeout(1000);
            popupCount++;
        } else {
            console.log(`      ⚠️ 弹窗 ${i + 1} 未找到关闭按钮，尝试按 ESC`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        }
    }

    return {
        processed: popupCount > 0,
        count: popupCount
    };
}

/**
 * 🔥 返回到活动资讯页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 返回结果
 */
async function returnToActivityPage(page, test) {
    console.log('      ↩️ 尝试返回活动资讯页面...');

    try {
        // 方法1: 使用浏览器返回
        await page.goBack();
        await page.waitForTimeout(2000);

        // 验证是否在活动资讯页面
        const currentUrl = page.url();
        const isActivityPage = currentUrl.includes('/activity') || currentUrl.includes('/promo');

        if (isActivityPage) {
            console.log('      ✅ 通过浏览器返回成功');
            return { success: true, method: 'goBack' };
        }

        // 方法2: 再次尝试返回
        console.log('      ⚠️ 第一次返回未到达活动页面，再次尝试...');
        await page.goBack();
        await page.waitForTimeout(2000);

        const currentUrl2 = page.url();
        const isActivityPage2 = currentUrl2.includes('/activity') || currentUrl2.includes('/promo');

        if (isActivityPage2) {
            console.log('      ✅ 第二次返回成功');
            return { success: true, method: 'goBack' };
        }

        console.log('      ❌ 浏览器返回失败');
        return { success: false, reason: '返回失败' };

    } catch (error) {
        console.log(`      ❌ 返回失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 🔥 强制跳转到活动资讯页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function forceNavigateToActivity(page, test) {
    console.log('      🔄 强制跳转到活动资讯页面...');

    try {
        // 尝试点击底部菜单的活动按钮
        const activityMenuButton = page.locator('.tabbar-item, .menu-item').filter({ hasText: /Activity|活动|Promo/i }).first();
        const hasActivityButton = await activityMenuButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasActivityButton) {
            console.log('      👆 点击底部菜单活动按钮...');
            await activityMenuButton.click();
            await page.waitForTimeout(2000);
            console.log('      ✅ 已通过菜单跳转到活动页面');
        } else {
            // 如果找不到菜单按钮，尝试直接导航
            console.log('      🔄 尝试直接导航到活动页面...');
            const baseUrl = page.url().split('/').slice(0, 3).join('/');
            await page.goto(`${baseUrl}/activity`);
            await page.waitForTimeout(2000);
            console.log('      ✅ 已直接导航到活动页面');
        }

    } catch (error) {
        console.log(`      ❌ 强制跳转失败: ${error.message}`);
        throw error;
    }
}
