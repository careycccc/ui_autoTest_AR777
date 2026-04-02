/**
 * 活动资讯列表处理器
 * 处理活动资讯页面的活动列表，逐个点击并识别处理
 */

import { identifyAndExecuteActivity } from '../activities/activity-registry.js';

/**
 * 处理活动资讯列表中的所有活动
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 处理结果
 */
export async function handleActivityList(page, test, options = {}) {
    const {
        listSelector = '.activeList .activeItem',  // 活动列表项选择器
        waitAfterClick = 3000,                     // 增加点击后等待时间到3秒
        maxRetries = 3                             // 最大重试次数
    } = options;

    console.log('🎯 开始处理活动资讯列表...');

    const results = {
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        details: []
    };

    try {
        // 获取活动列表
        const activityItems = page.locator(listSelector);
        const totalCount = await activityItems.count();

        if (totalCount === 0) {
            console.log('⚠️ 未找到活动列表项');
            return {
                success: false,
                reason: '未找到活动列表',
                results: results
            };
        }

        console.log(`📊 发现 ${totalCount} 个活动项`);
        results.total = totalCount;

        // 逐个处理活动
        for (let i = 0; i < totalCount; i++) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📍 处理第 ${i + 1}/${totalCount} 个活动`);
            console.log(`${'='.repeat(60)}`);

            const itemResult = await processActivityItem(page, test, listSelector, i, waitAfterClick);

            results.details.push(itemResult);

            if (itemResult.success) {
                results.success++;
            } else if (itemResult.skipped) {
                results.skipped++;
            } else {
                results.failed++;
            }

            // 🔥 确保在处理下一个活动前回到活动资讯页面
            const currentUrl = page.url();
            if (!currentUrl.includes('/activity')) {
                console.log(`⚠️ 当前不在活动资讯页面，尝试返回...`);
                await page.goto('https://arplatsaassit4.club/activity');
                await page.waitForTimeout(2000);
            }

            // 等待一下再处理下一个
            await page.waitForTimeout(1000);
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 活动资讯处理完成`);
        console.log(`   总数: ${results.total}`);
        console.log(`   成功: ${results.success}`);
        console.log(`   失败: ${results.failed}`);
        console.log(`   跳过: ${results.skipped}`);
        console.log(`${'='.repeat(60)}\n`);

        return {
            success: true,
            results: results
        };

    } catch (error) {
        console.log(`❌ 活动资讯列表处理失败: ${error.message}`);
        await test.captureScreenshot('activity-list-error');
        return {
            success: false,
            error: error.message,
            results: results
        };
    }
}

/**
 * 处理单个活动项
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {string} listSelector - 列表选择器
 * @param {number} index - 活动索引
 * @param {number} waitTime - 等待时间
 * @returns {Promise<Object>} 处理结果
 */
async function processActivityItem(page, test, listSelector, index, waitTime) {
    const itemInfo = {
        index: index + 1,
        success: false,
        skipped: false,
        activityName: '未知',
        activityId: null,
        error: null,
        isPopup: false,
        urlChanged: false
    };

    try {
        // 记录当前 URL
        const beforeUrl = page.url();
        console.log(`📍 当前 URL: ${beforeUrl}`);

        // 重新获取活动列表（因为可能页面已刷新）
        const activityItems = page.locator(listSelector);
        const currentCount = await activityItems.count();

        if (index >= currentCount) {
            console.log(`⚠️ 活动项索引 ${index} 超出范围（当前共 ${currentCount} 项）`);
            itemInfo.skipped = true;
            itemInfo.error = '索引超出范围';
            return itemInfo;
        }

        // 点击活动项
        const activityItem = activityItems.nth(index);
        const isVisible = await activityItem.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVisible) {
            console.log(`⚠️ 活动项 ${index + 1} 不可见`);
            itemInfo.skipped = true;
            itemInfo.error = '活动项不可见';
            return itemInfo;
        }

        console.log(`👆 点击活动项 ${index + 1}...`);
        await activityItem.click();

        // 🔥 增加等待时间，让弹窗有足够时间显示
        console.log(`⏳ 等待 ${waitTime}ms 让弹窗显示...`);
        await page.waitForTimeout(waitTime);

        // 检查 URL 是否变化
        const afterUrl = page.url();
        itemInfo.urlChanged = afterUrl !== beforeUrl;
        console.log(`📍 点击后 URL: ${afterUrl}`);
        console.log(`📊 URL 是否变化: ${itemInfo.urlChanged ? '是' : '否'}`);

        // 🔥 等待更长时间让弹窗完全加载
        if (!itemInfo.urlChanged) {
            console.log(`⏳ URL 未变化，等待弹窗加载...`);
            await page.waitForTimeout(2000); // 额外等待2秒让弹窗完全显示
        }

        // 🔥 调试：输出页面当前状态
        try {
            const pageTitle = await page.title();
            const bodyText = await page.locator('body').textContent().catch(() => '');
            const textSnippet = bodyText.substring(0, 300).replace(/\s+/g, ' ').trim();

            console.log(`� 页面标题: "${pageTitle}"`);
            console.log(`📝 页面文本片段: "${textSnippet}..."`);

            // 检查是否包含关键文本
            if (bodyText.includes('Enable Notifications')) {
                console.log(`🎯 页面包含 "Enable Notifications" 文本`);
            }
            if (bodyText.includes('Enable Now & Claim')) {
                console.log(`🎯 页面包含 "Enable Now & Claim" 文本`);
            }
        } catch (e) {
            console.log(`⚠️ 页面状态调试失败: ${e.message}`);
        }

        // 检查是否有弹窗
        itemInfo.isPopup = await checkForPopup(page);
        console.log(`📊 是否有弹窗: ${itemInfo.isPopup ? '是' : '否'}`);

        // 🔥 如果有弹窗或URL变化，尝试识别并执行活动
        if (itemInfo.isPopup || itemInfo.urlChanged) {
            console.log(`🔍 识别活动类型...`);
            const activityResult = await identifyAndExecuteActivity(page, test);

            if (activityResult.success) {
                console.log(`✅ 活动识别成功: ${activityResult.activityName}`);
                itemInfo.success = true;
                itemInfo.activityName = activityResult.activityName;
                itemInfo.activityId = activityResult.activityId;
            } else {
                console.log(`❌ 活动识别失败: ${activityResult.error || '未知错误'}`);
                await test.captureScreenshot(`activity-item-${index + 1}-failed`);

                itemInfo.success = false;
                itemInfo.error = activityResult.error || '活动识别失败';

                // 🔥 识别失败，尝试关闭弹窗或返回
                await handleUnrecognizedActivity(page, test);
            }
        } else {
            console.log(`⚠️ 点击后既无弹窗也无跳转，可能是无效活动`);
            itemInfo.success = false;
            itemInfo.error = `活动 #${index + 1} 点击后无响应`;
        }

        // 🔥 返回活动资讯页面
        console.log(`↩️ 返回活动资讯页面...`);
        const returnResult = await returnToActivityPage(page, test, beforeUrl);

        if (!returnResult.success) {
            console.log(`⚠️ 返回活动资讯失败，强制跳转...`);
            await forceNavigateToActivityPage(page, test);
        }

        return itemInfo;

    } catch (error) {
        console.log(`❌ 处理活动项 ${index + 1} 失败: ${error.message}`);
        await test.captureScreenshot(`activity-item-${index + 1}-error`);

        itemInfo.success = false;
        itemInfo.error = error.message;

        // 尝试返回活动资讯
        try {
            await forceNavigateToActivityPage(page, test);
        } catch (e) {
            console.log(`❌ 强制返回也失败: ${e.message}`);
        }

        return itemInfo;
    }
}

/**
 * 检查是否有弹窗
 * @param {Object} page - Playwright page 对象
 * @returns {Promise<boolean>} 是否有弹窗
 */
async function checkForPopup(page) {
    console.log(`🔍 检查是否有弹窗...`);

    // 🔥 最优先：直接检查通知权限开启弹窗的特征文本
    try {
        console.log(`🔍 检查通知权限开启弹窗特征文本...`);

        // 🔥 增加等待时间，让弹窗有足够时间显示
        const hasNotificationText = await page.getByText('Enable Notifications', { exact: false })
            .isVisible({ timeout: 5000 })  // 增加到5秒
            .catch(() => false);

        if (hasNotificationText) {
            console.log(`✅ 检测到通知权限开启弹窗（通过标题文本 "Enable Notifications"）`);
            return true;
        }

        const hasClaimText = await page.getByText('Enable Now & Claim', { exact: false })
            .isVisible({ timeout: 5000 })  // 增加到5秒
            .catch(() => false);

        if (hasClaimText) {
            console.log(`✅ 检测到通知权限开启弹窗（通过按钮文本 "Enable Now & Claim"）`);
            return true;
        }

        // 检查是否有 "Withdrawal Success!" 文本
        const hasWithdrawalText = await page.getByText('Withdrawal Success!', { exact: false })
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (hasWithdrawalText) {
            console.log(`✅ 检测到提现成功弹窗`);
            return true;
        }

        console.log(`❌ 未找到通知权限开启弹窗的特征文本`);
    } catch (e) {
        console.log(`⚠️ 文本检测出错: ${e.message}`);
    }

    // 🔥 检查页面是否有任何模态覆盖层（通过z-index或position检测）
    try {
        console.log(`🔍 检查页面覆盖层...`);

        // 检查是否有高z-index的元素（通常弹窗会有很高的z-index）
        const highZIndexElements = await page.locator('[style*="z-index"]').all();

        for (const element of highZIndexElements) {
            const isVisible = await element.isVisible().catch(() => false);
            if (isVisible) {
                const style = await element.getAttribute('style').catch(() => '');
                if (style.includes('z-index') && (style.includes('999') || style.includes('1000') || style.includes('9999'))) {
                    console.log(`✅ 检测到高z-index覆盖层弹窗`);
                    return true;
                }
            }
        }

        // 检查是否有fixed定位的覆盖层
        const fixedElements = await page.locator('[style*="position: fixed"], [style*="position:fixed"]').all();

        for (const element of fixedElements) {
            const isVisible = await element.isVisible().catch(() => false);
            if (isVisible) {
                const rect = await element.boundingBox().catch(() => null);
                if (rect && rect.width > 200 && rect.height > 200) { // 足够大的覆盖层
                    console.log(`✅ 检测到fixed定位覆盖层弹窗`);
                    return true;
                }
            }
        }

        console.log(`❌ 未找到覆盖层弹窗`);
    } catch (e) {
        console.log(`⚠️ 覆盖层检测出错: ${e.message}`);
    }

    // 🔥 检查常见弹窗选择器
    const popupSelectors = [
        '.popup-container',
        '.sheet-panel',
        '.dialog-container',
        '.modal',
        '.received-dialog',
        '.pushMessage',
        '[class*="popup"]',
        '[class*="dialog"]',
        '[class*="sheet"]',
        '[class*="modal"]',
        '[class*="overlay"]',
        '[class*="mask"]'
    ];

    console.log(`🔍 检查常见弹窗选择器...`);
    for (const selector of popupSelectors) {
        try {
            const hasPopup = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false);
            if (hasPopup) {
                console.log(`✅ 检测到弹窗: ${selector}`);
                return true;
            }
        } catch (e) {
            // 忽略错误，继续检查下一个选择器
        }
    }

    // 🔥 最后检查：页面是否有任何可见的按钮包含关键词
    try {
        console.log(`🔍 检查页面按钮...`);

        const buttons = await page.locator('button, .btn, [role="button"]').all();
        for (const button of buttons) {
            const isVisible = await button.isVisible().catch(() => false);
            if (isVisible) {
                const text = await button.textContent().catch(() => '');
                if (text.includes('Enable') || text.includes('Claim') || text.includes('Close') || text.includes('确认') || text.includes('取消')) {
                    console.log(`✅ 检测到可能的弹窗按钮: "${text}"`);
                    return true;
                }
            }
        }

        console.log(`❌ 未找到弹窗按钮`);
    } catch (e) {
        console.log(`⚠️ 按钮检测出错: ${e.message}`);
    }

    console.log(`❌ 未检测到任何弹窗`);
    return false;
}

/**
 * 处理未识别的活动（关闭弹窗或返回）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function handleUnrecognizedActivity(page, test) {
    console.log(`🔄 尝试关闭弹窗或返回...`);

    try {
        // 尝试查找并点击关闭按钮
        const closeSelectors = [
            '.popup-close',
            '.close-icon',
            '.close',
            '[class*="close"]',
            'button:has-text("Close")',
            'button:has-text("关闭")'
        ];

        for (const selector of closeSelectors) {
            const closeBtn = page.locator(selector).first();
            const isVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false);

            if (isVisible) {
                console.log(`👆 点击关闭按钮: ${selector}`);
                await closeBtn.click();
                await page.waitForTimeout(1000);
                return;
            }
        }

        // 如果没有关闭按钮，尝试按 ESC
        console.log(`⌨️ 尝试按 ESC 键...`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

    } catch (error) {
        console.log(`⚠️ 关闭弹窗失败: ${error.message}`);
    }
}

/**
 * 返回活动资讯页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {string} targetUrl - 目标 URL
 * @returns {Promise<Object>} 返回结果
 */
async function returnToActivityPage(page, test, targetUrl) {
    try {
        // 方法1: 使用浏览器返回
        await page.goBack();
        await page.waitForTimeout(1500);

        const currentUrl = page.url();

        // 验证是否返回成功
        if (currentUrl === targetUrl || currentUrl.includes('/activity') || currentUrl.includes('/promo')) {
            console.log(`✅ 成功返回活动资讯页面`);
            return { success: true, method: 'goBack' };
        }

        // 方法2: 再次尝试返回
        console.log(`⚠️ 第一次返回未成功，再次尝试...`);
        await page.goBack();
        await page.waitForTimeout(1500);

        const currentUrl2 = page.url();
        if (currentUrl2 === targetUrl || currentUrl2.includes('/activity') || currentUrl2.includes('/promo')) {
            console.log(`✅ 第二次返回成功`);
            return { success: true, method: 'goBack' };
        }

        return { success: false, reason: '返回失败' };

    } catch (error) {
        console.log(`❌ 返回失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 强制跳转到活动资讯页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function forceNavigateToActivityPage(page, test) {
    console.log(`🔄 强制跳转到活动资讯页面...`);

    try {
        // 方法1: 点击底部菜单
        const activityMenuButton = page.locator('.tabbar-item, .menu-item, .tab-item')
            .filter({ hasText: /Activity|活动|Promo|资讯/i })
            .first();

        const hasButton = await activityMenuButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasButton) {
            console.log(`👆 点击底部菜单活动按钮...`);
            await activityMenuButton.click();
            await page.waitForTimeout(2000);
            console.log(`✅ 已通过菜单跳转`);
            return;
        }

        // 方法2: 直接导航
        console.log(`🔄 直接导航到活动页面...`);
        const baseUrl = page.url().split('/').slice(0, 3).join('/');
        await page.goto(`${baseUrl}/activity`);
        await page.waitForTimeout(2000);
        console.log(`✅ 已直接导航`);

    } catch (error) {
        console.log(`❌ 强制跳转失败: ${error.message}`);
        await test.captureScreenshot('force-navigate-failed');
        throw error;
    }
}

export default {
    handleActivityList
};
