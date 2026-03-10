/**
 * 通知权限开启活动处理器
 * 包含通知权限开启的所有处理逻辑
 */

/**
 * 通知权限开启活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handleNotificationPermission(page, test) {
    console.log('      🎯 处理通知权限开启活动...');

    try {
        // 🔥 检查是否出现通知权限弹窗
        const sheetPanel = page.locator('.sheet-panel');
        const hasSheetPanel = await sheetPanel.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasSheetPanel) {
            return { success: false, reason: '未找到通知权限弹窗' };
        }

        console.log('      ✅ 发现通知权限弹窗');

        // 🔥 验证弹窗标题
        const panelTitle = await sheetPanel.locator('.bottom-head span').first().textContent().catch(() => '');
        console.log(`      📋 弹窗标题: "${panelTitle}"`);

        if (!panelTitle.includes('Enable Notifications')) {
            console.log('      ⚠️ 弹窗标题不匹配');
        }

        // 🔥 检查弹窗内容
        const pushMessage = sheetPanel.locator('.pushMessage');
        const hasPushMessage = await pushMessage.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasPushMessage) {
            console.log('      ⚠️ 未找到弹窗内容区域');
        } else {
            console.log('      ✅ 弹窗内容区域存在');
        }

        // 🔥 等待8秒
        console.log('      ⏳ 等待 8 秒...');
        await page.waitForTimeout(8000);

        // 🔥 点击 "Enable Now & Claim" 按钮
        const enableButton = pushMessage.locator('.btn.btn_main_style').filter({ hasText: 'Enable Now' });
        const hasEnableButton = await enableButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasEnableButton) {
            console.log('      ❌ 未找到 "Enable Now & Claim" 按钮');
            await test.captureScreenshot('notification-permission-no-button');
            return { success: false, reason: '未找到启用按钮' };
        }

        console.log('      👆 点击 "Enable Now & Claim" 按钮...');
        await enableButton.click();
        await page.waitForTimeout(2000);

        // 🔥 检查是否出现奖励领取弹窗
        const receivedDialog = page.locator('.received-dialog');
        const hasReceivedDialog = await receivedDialog.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasReceivedDialog) {
            console.log('      ⚠️ 未出现奖励领取弹窗');
            await test.captureScreenshot('notification-permission-no-reward-dialog');
        } else {
            console.log('      ✅ 出现奖励领取弹窗');

            // 🔥 获取奖励金额
            const rewardAmount = await receivedDialog.locator('.received-money').textContent().catch(() => '');
            console.log(`      💰 奖励金额: ${rewardAmount}`);

            // 🔥 验证奖励文本
            const rewardText = await receivedDialog.locator('.received-text').textContent().catch(() => '');
            console.log(`      📝 奖励文本: "${rewardText}"`);
        }

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
                const homePopupResult = await handleHomePopups(page, test);

                if (homePopupResult.processed) {
                    console.log(`      ✅ 处理了 ${homePopupResult.count} 个首页弹窗`);
                }

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
