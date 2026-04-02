/**
 * 增强版活动资讯验证器
 * 解决活动列表在处理过程中消失的问题
 * 
 * 核心改进：
 * 1. 每次处理完活动后强制返回活动资讯页面
 * 2. 重新获取活动列表数量，确保索引有效
 * 3. 增加页面状态检查和恢复机制
 */

import { handleActivityClick } from './promo.js';

/**
 * 🔥 增强版活动验证函数
 * 确保每次处理完活动后都正确返回活动资讯页面
 * 
 * @param {Object} page - Playwright page 对象
 * @param {Object} auth - 认证信息
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 验证结果
 */
export async function verifyAllActivitiesEnhanced(page, auth, test) {
    console.log('      🔍 开始增强版活动资讯验证...');

    // 动态导入活动配置池
    const { getActivityPoolStats } = await import('./activity-pool.js');
    const poolStats = getActivityPoolStats();
    console.log(`      📚 活动配置池: 共 ${poolStats.total} 种活动类型`);
    console.log(`      📋 活动列表: ${poolStats.activities.join(', ')}`);

    // 获取页面上的活动总数
    const initialActivityCount = await page.locator('.activeList .activeItem').count();
    console.log(`      📊 页面显示 ${initialActivityCount} 个活动需要验证\n`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // 遍历所有活动
    for (let i = 0; i < initialActivityCount; i++) {
        try {
            console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`      📌 验证活动 ${i + 1}/${initialActivityCount}`);

            // 🔥 关键改进：每次处理前确保在活动资讯页面
            await ensureOnActivityPage(page, test);

            // 🔥 关键改进：重新获取当前活动列表数量
            const currentActivityCount = await page.locator('.activeList .activeItem').count();
            console.log(`      📊 当前活动列表数量: ${currentActivityCount}`);

            // 检查索引是否有效
            if (i >= currentActivityCount) {
                console.log(`      ⚠️ 活动索引 ${i} 超出范围（当前共 ${currentActivityCount} 个活动）`);
                failCount++;
                results.push({
                    index: i,
                    success: false,
                    error: `活动索引 ${i} 超出范围（当前共 ${currentActivityCount} 个活动）`
                });
                continue;
            }

            // 🔥 调用智能识别的 handleActivityClick
            const result = await handleActivityClick({
                page,
                test,
                index: i
            });

            if (result.success) {
                successCount++;
                console.log(`      ✅ 活动 #${i} 验证成功: ${result.activityName}`);
                console.log(`      📊 类型: ${result.hasPopup ? '弹窗类型' : '直接跳转类型'}`);

                results.push({
                    index: i,
                    success: true,
                    activityName: result.activityName,
                    hasPopup: result.hasPopup
                });
            } else {
                failCount++;
                console.log(`      ❌ 活动 #${i} 验证失败: ${result.error}`);

                results.push({
                    index: i,
                    success: false,
                    error: result.error
                });
            }

            // 🔥 关键改进：每次处理完后强制返回活动资讯页面
            await ensureOnActivityPage(page, test);

        } catch (error) {
            failCount++;
            console.error(`      ❌ 活动 #${i} 验证异常: ${error.message}`);

            results.push({
                index: i,
                success: false,
                error: error.message
            });

            // 🔥 发生异常时，强制返回活动页面
            try {
                await forceNavigateToActivityPage(page, test);
            } catch (navError) {
                console.log(`      ❌ 强制返回活动页失败: ${navError.message}`);
            }
        }
    }

    // 输出统计结果
    console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`      📊 验证完成统计:`);
    console.log(`      ✅ 成功: ${successCount}/${initialActivityCount}`);
    console.log(`      ❌ 失败: ${failCount}/${initialActivityCount}`);
    console.log(`      📈 成功率: ${((successCount / initialActivityCount) * 100).toFixed(2)}%`);

    // 输出成功的活动列表
    if (successCount > 0) {
        console.log(`\n      ✅ 成功验证的活动:`);
        results.filter(r => r.success).forEach(r => {
            console.log(`        ${r.index + 1}. ${r.activityName} (${r.hasPopup ? '弹窗' : '直接跳转'})`);
        });
    }

    // 输出失败的活动列表
    if (failCount > 0) {
        console.log(`\n      ❌ 失败的活动:`);
        results.filter(r => !r.success).forEach(r => {
            console.log(`        ${r.index + 1}. ${r.error}`);
        });
        console.log(`\n      ⚠️ 有 ${failCount} 个活动验证失败，请查看截图`);
    }

    return {
        total: initialActivityCount,
        success: successCount,
        fail: failCount,
        results: results
    };
}

/**
 * 🔥 确保在活动资讯页面
 * 如果不在，则返回或导航到活动资讯页面
 * 
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function ensureOnActivityPage(page, test) {
    const currentUrl = page.url();
    console.log(`      🔍 检查当前页面状态: ${currentUrl}`);

    // 检查是否已经在活动资讯页面
    if (currentUrl.includes('/activity') || currentUrl.includes('/promo')) {
        // 进一步检查活动列表是否存在
        const activityListVisible = await page.locator('.activeList')
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (activityListVisible) {
            console.log(`      ✅ 已在活动资讯页面，活动列表可见`);
            return;
        } else {
            console.log(`      ⚠️ URL 正确但活动列表不可见，尝试刷新...`);
            await page.reload();
            await page.waitForTimeout(2000);
            return;
        }
    }

    // 不在活动资讯页面，尝试返回
    console.log(`      ⚠️ 不在活动资讯页面，尝试返回...`);

    // 方法1: 尝试使用浏览器返回
    try {
        await page.goBack();
        await page.waitForTimeout(1500);

        const returnedUrl = page.url();
        if (returnedUrl.includes('/activity') || returnedUrl.includes('/promo')) {
            console.log(`      ✅ 通过返回成功回到活动资讯页面`);
            return;
        }
    } catch (error) {
        console.log(`      ⚠️ 浏览器返回失败: ${error.message}`);
    }

    // 方法2: 强制导航到活动页面
    await forceNavigateToActivityPage(page, test);
}

/**
 * 🔥 强制导航到活动资讯页面
 * 
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function forceNavigateToActivityPage(page, test) {
    console.log(`      🔄 强制导航到活动资讯页面...`);

    try {
        // 方法1: 点击底部菜单的活动按钮
        const activityMenuButton = page.locator('.tabbar-item, .menu-item, .tab-item')
            .filter({ hasText: /Activity|活动|Promo|资讯/i })
            .first();

        const hasButton = await activityMenuButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasButton) {
            console.log(`      👆 点击底部菜单活动按钮...`);
            await activityMenuButton.click();
            await page.waitForTimeout(2000);

            // 验证是否成功
            const currentUrl = page.url();
            if (currentUrl.includes('/activity') || currentUrl.includes('/promo')) {
                console.log(`      ✅ 已通过菜单跳转到活动资讯页面`);
                return;
            }
        }

        // 方法2: 直接导航到活动页面
        console.log(`      🔄 直接导航到活动页面...`);
        const baseUrl = page.url().split('/').slice(0, 3).join('/');
        await page.goto(`${baseUrl}/activity`);
        await page.waitForTimeout(2000);

        // 等待活动列表加载
        await page.locator('.activeList').isVisible({ timeout: 5000 }).catch(() => false);

        console.log(`      ✅ 已直接导航到活动资讯页面`);

    } catch (error) {
        console.log(`      ❌ 强制导航失败: ${error.message}`);
        await test.captureScreenshot('force-navigate-failed');
        throw error;
    }
}
