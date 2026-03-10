/**
 * 活动执行器 - 通用的活动处理流程
 * 可以在项目的任何地方调用，自动处理：
 * 1. 点击元素
 * 2. 检测弹窗/直接跳转
 * 3. 识别活动类型
 * 4. 执行活动处理逻辑
 * 5. 返回原页面
 */

import { identifyAndExecuteActivity } from './activity-registry.js';

/**
 * 🔥 通用活动执行器
 * 从任何页面点击任何元素进入活动，自动识别和处理
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.page - Playwright page 对象
 * @param {Object} options.test - TestCase 实例
 * @param {string} options.clickSelector - 要点击的元素选择器（可选，如果不提供则认为已经在活动页面）
 * @param {number} options.clickIndex - 如果有多个相同选择器，指定点击第几个（默认 0）
 * @param {boolean} options.autoReturn - 是否自动返回原页面（默认 true）
 * @param {string} options.returnSelector - 返回页面的验证选择器（可选）
 * @param {number} options.waitAfterClick - 点击后等待时间（默认 1000ms）
 * @param {string} options.mode - 执行模式：'execute'（执行活动逻辑，默认）或 'validate'（仅验证页面）
 * @returns {Promise<Object>} 执行结果
 */
export async function executeActivity(options) {
    const {
        page,
        test,
        clickSelector = null,
        clickIndex = 0,
        autoReturn = true,
        returnSelector = null,
        waitAfterClick = 1000,
        mode = 'execute'  // 🔥 新增：执行模式
    } = options;

    const beforeUrl = page.url();
    console.log(`      📍 起始 URL: ${beforeUrl}`);

    try {
        // 1. 如果提供了点击选择器，先点击
        if (clickSelector) {
            console.log(`      👆 点击元素: ${clickSelector} (索引: ${clickIndex})`);

            const elements = page.locator(clickSelector);
            const count = await elements.count();

            if (count === 0) {
                throw new Error(`未找到元素: ${clickSelector}`);
            }

            if (clickIndex >= count) {
                throw new Error(`索引 ${clickIndex} 超出范围（共 ${count} 个元素）`);
            }

            const element = elements.nth(clickIndex);
            const isVisible = await element.isVisible().catch(() => false);

            if (!isVisible) {
                throw new Error(`元素不可见: ${clickSelector}`);
            }

            await element.click();
            await page.waitForTimeout(waitAfterClick);
        }

        // 2. 检查 URL 是否变化
        const afterClickUrl = page.url();
        const urlChanged = afterClickUrl !== beforeUrl;
        console.log(`      📊 URL 是否变化: ${urlChanged ? '是' : '否'}`);
        console.log(`      📍 当前 URL: ${afterClickUrl}`);

        // 3. 如果 URL 未变化，检查是否有弹窗
        let hasPopup = false;
        if (!urlChanged && clickSelector) {
            console.log(`      🔍 检查是否有弹窗...`);

            const popupSelectors = [
                '.popup-container',
                '.popup-content',
                '.modal',
                '.dialog',
                '[class*="popup"]'
            ];

            for (const selector of popupSelectors) {
                const popupVisible = await page.locator(selector)
                    .first()
                    .isVisible({ timeout: 1000 })
                    .catch(() => false);

                if (popupVisible) {
                    hasPopup = true;
                    console.log(`      ✅ 检测到弹窗: ${selector}`);
                    break;
                }
            }

            if (hasPopup) {
                // 点击弹窗中的按钮
                console.log(`      👆 点击弹窗中的按钮...`);

                const buttonSelectors = [
                    '.popup-confirm',
                    '.confirm-btn',
                    '.modal-confirm',
                    'button:has-text("确认")',
                    'button:has-text("Confirm")',
                    'button:has-text("OK")',
                    'button'
                ];

                let buttonClicked = false;
                for (const btnSelector of buttonSelectors) {
                    try {
                        const btn = page.locator(btnSelector).first();
                        const btnVisible = await btn.isVisible({ timeout: 500 }).catch(() => false);

                        if (btnVisible) {
                            await btn.click();
                            console.log(`      ✅ 点击了按钮: ${btnSelector}`);
                            buttonClicked = true;
                            await page.waitForTimeout(1000);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (!buttonClicked) {
                    console.log(`      ⚠️ 未找到可点击的弹窗按钮`);
                }
            } else if (clickSelector) {
                // 既没有 URL 变化也没有弹窗
                console.log(`      ⚠️ 点击后既无 URL 变化也无弹窗`);
            }
        }

        // 4. 等待页面稳定
        await page.waitForTimeout(1000);

        // 5. 识别并执行/验证活动
        let result;

        if (mode === 'validate') {
            // 🔥 验证模式：仅验证页面，不执行活动逻辑
            console.log(`      🔍 验证模式：仅验证页面...`);
            const { identifyActivity } = await import('./activity-registry.js');
            const currentUrl = page.url();
            const activity = await identifyActivity(page, currentUrl);

            if (activity) {
                console.log(`      ✅ 识别到活动: ${activity.name}`);
                result = {
                    success: true,
                    activityId: activity.id,
                    activityName: activity.name,
                    mode: 'validate'
                };
            } else {
                console.log(`      ⚠️ 未识别到活动`);
                result = {
                    success: false,
                    error: '未识别到活动',
                    mode: 'validate'
                };
            }
        } else {
            // 🔥 执行模式：识别并执行活动逻辑
            console.log(`      🔍 执行模式：识别并执行活动...`);
            result = await identifyAndExecuteActivity(page, test);
            result.mode = 'execute';
        }

        if (!result.success) {
            console.log(`      ❌ 活动${mode === 'validate' ? '验证' : '处理'}失败: ${result.error || result.reason}`);
            await test.captureScreenshot(`activity-${mode}-failed`);
        } else {
            console.log(`      ✅ 活动${mode === 'validate' ? '验证' : '处理'}成功: ${result.activityName}`);
        }

        // 6. 返回原页面
        if (autoReturn && clickSelector) {
            console.log(`      ↩️ 返回原页面...`);
            await page.goBack();
            await page.waitForTimeout(1000);

            const returnedUrl = page.url();
            console.log(`      📍 返回后 URL: ${returnedUrl}`);

            // 如果提供了返回选择器，验证是否成功返回
            if (returnSelector) {
                const returnSuccess = await page.locator(returnSelector)
                    .first()
                    .isVisible({ timeout: 3000 })
                    .catch(() => false);

                if (!returnSuccess) {
                    console.log(`      ⚠️ 返回页面验证失败，尝试再次返回...`);
                    await page.goBack();
                    await page.waitForTimeout(1000);
                }
            }

            console.log(`      ✅ 已返回原页面`);
        }

        return {
            success: result.success,
            activityId: result.activityId,
            activityName: result.activityName,
            hasPopup: hasPopup,
            urlChanged: urlChanged,
            error: result.error || result.reason
        };

    } catch (error) {
        console.error(`      ❌ 执行失败: ${error.message}`);
        await test.captureScreenshot('activity-executor-error');

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 🔥 批量执行活动（用于活动列表）
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.page - Playwright page 对象
 * @param {Object} options.test - TestCase 实例
 * @param {string} options.listSelector - 活动列表容器选择器
 * @param {string} options.itemSelector - 活动项选择器
 * @param {number} options.maxActivities - 最多处理多少个活动（可选）
 * @param {Array<number>} options.skipIndexes - 要跳过的活动索引（可选）
 * @returns {Promise<Object>} 批量执行结果
 */
export async function executeBatchActivities(options) {
    const {
        page,
        test,
        listSelector = '.activeList',
        itemSelector = '.activeItem',
        maxActivities = null,
        skipIndexes = []
    } = options;

    console.log('      🔍 开始批量执行活动...');

    // 获取活动总数
    const fullSelector = `${listSelector} ${itemSelector}`;
    const activityCount = await page.locator(fullSelector).count();
    console.log(`      📊 发现 ${activityCount} 个活动`);

    const maxToProcess = maxActivities ? Math.min(activityCount, maxActivities) : activityCount;
    console.log(`      📋 将处理 ${maxToProcess} 个活动\n`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const results = [];

    for (let i = 0; i < maxToProcess; i++) {
        // 检查是否跳过
        if (skipIndexes.includes(i)) {
            console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`      ⏭️ 跳过活动 ${i + 1}/${maxToProcess}`);
            skipCount++;
            results.push({
                index: i,
                success: false,
                skipped: true
            });
            continue;
        }

        try {
            console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`      📌 处理活动 ${i + 1}/${maxToProcess}`);

            const result = await executeActivity({
                page,
                test,
                clickSelector: fullSelector,
                clickIndex: i,
                autoReturn: true,
                returnSelector: listSelector
            });

            if (result.success) {
                successCount++;
                console.log(`      ✅ 活动 #${i} 成功: ${result.activityName}`);
                results.push({
                    index: i,
                    success: true,
                    activityId: result.activityId,
                    activityName: result.activityName,
                    hasPopup: result.hasPopup
                });
            } else {
                failCount++;
                console.log(`      ❌ 活动 #${i} 失败: ${result.error}`);
                results.push({
                    index: i,
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            failCount++;
            console.error(`      ❌ 活动 #${i} 异常: ${error.message}`);
            results.push({
                index: i,
                success: false,
                error: error.message
            });
        }
    }

    // 输出统计结果
    console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`      📊 批量执行完成:`);
    console.log(`      ✅ 成功: ${successCount}/${maxToProcess}`);
    console.log(`      ❌ 失败: ${failCount}/${maxToProcess}`);
    if (skipCount > 0) {
        console.log(`      ⏭️ 跳过: ${skipCount}/${maxToProcess}`);
    }
    console.log(`      📈 成功率: ${((successCount / maxToProcess) * 100).toFixed(2)}%`);

    // 输出成功的活动列表
    if (successCount > 0) {
        console.log(`\n      ✅ 成功的活动:`);
        results.filter(r => r.success).forEach(r => {
            console.log(`        ${r.index + 1}. ${r.activityName} (${r.hasPopup ? '弹窗' : '直接跳转'})`);
        });
    }

    // 输出失败的活动列表
    if (failCount > 0) {
        console.log(`\n      ❌ 失败的活动:`);
        results.filter(r => !r.success && !r.skipped).forEach(r => {
            console.log(`        ${r.index + 1}. ${r.error}`);
        });
    }

    return {
        total: maxToProcess,
        success: successCount,
        fail: failCount,
        skip: skipCount,
        results: results
    };
}

/**
 * 🔥 直接执行指定的活动（通过活动 ID）
 * 适用于已经在活动页面，直接执行处理逻辑
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.page - Playwright page 对象
 * @param {Object} options.test - TestCase 实例
 * @param {string} options.activityId - 活动 ID
 * @returns {Promise<Object>} 执行结果
 */
export async function executeActivityById(options) {
    const { page, test, activityId } = options;

    console.log(`      🎯 执行指定活动: ${activityId}`);

    const { executeActivity: execActivity } = await import('./activity-registry.js');

    try {
        const result = await execActivity(activityId, page, test);

        if (result.success) {
            console.log(`      ✅ 活动执行成功: ${result.activityName}`);
        } else {
            console.log(`      ❌ 活动执行失败: ${result.error || result.reason}`);
        }

        return result;

    } catch (error) {
        console.error(`      ❌ 执行异常: ${error.message}`);
        return {
            success: false,
            activityId: activityId,
            error: error.message
        };
    }
}
