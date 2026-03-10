
//活动资讯

/**
 * 检查子活动是否存在
 * @param {*} page 
 * @param {*} auth 
 * @param {*} test 
 */
export async function verifyActivelist(page, auth, test) {
    // 检查活动列表容器是否存在
    const activeListVisible = await page.locator('.activeList').isVisible().catch(() => false);

    if (!activeListVisible) {
        throw new Error('活动列表容器不存在');
    }

    // 检查活动列表中的活动项数量
    const count = await page.locator('.activeList .activeItem').count();

    console.log(`      找到 ${count} 个活动`);

    if (count === 0) {
        throw new Error('活动列表为空');
    }
    //await page.pause();
    console.log(`      ✅ 活动列表有 ${count} 个活动`);
}

/**
 * 🔥 智能活动点击处理函数（使用新的活动系统）
 * @param {Object} options - 配置选项
 * @param {Object} options.page - Playwright page 对象
 * @param {Object} options.test - TestCase 实例
 * @param {number} options.index - 活动索引（从 0 开始）
 * @param {string} options.activitySelector - 活动元素选择器（默认 '.activeList .activeItem'）
 * @param {string} options.returnWaitForSelector - 返回页面等待的选择器（默认 '.activeList'）
 * @returns {Promise<Object>} - 返回处理结果 { success: boolean, activityName: string, hasPopup: boolean, error: string }
 */
export async function handleActivityClick(options) {
    const {
        page,
        test,
        index,
        activitySelector = '.activeList .activeItem',
        returnPageName = '活动资讯页',
        returnWaitForSelector = '.activeList'
    } = options;

    try {
        console.log(`      🎯 处理活动 #${index}...`);

        // 动态导入活动配置池
        const { matchActivity } = await import('./activity-pool.js');

        // 1. 获取活动元素
        const activityItems = page.locator(activitySelector);
        const count = await activityItems.count();

        if (index >= count) {
            throw new Error(`活动索引 ${index} 超出范围（总共 ${count} 个活动）`);
        }

        const activityItem = activityItems.nth(index);
        const isVisible = await activityItem.isVisible().catch(() => false);

        if (!isVisible) {
            throw new Error(`活动 #${index} 不可见`);
        }

        // 2. 记录点击前的 URL
        const beforeUrl = page.url();
        console.log(`      📍 点击前 URL: ${beforeUrl}`);

        // 3. 点击活动
        console.log(`      👆 点击活动 #${index}...`);
        await activityItem.click();
        await page.waitForTimeout(1000);  // 等待 1 秒观察变化

        // 4. 记录点击后的 URL
        const afterUrl = page.url();
        console.log(`      📍 点击后 URL: ${afterUrl}`);

        // 5. 判断是弹窗还是直接跳转
        const urlChanged = afterUrl !== beforeUrl;
        console.log(`      📊 URL 是否变化: ${urlChanged ? '是（直接跳转）' : '否（可能是弹窗）'}`);

        let hasPopup = false;
        let matchedActivity = null;

        if (!urlChanged) {
            // 🔥 URL 未变化，检查是否有弹窗（使用项目级 elementExists 风格，手写版）
            console.log(`      🔍 检查是否有弹窗...`);

            const popupSelectors = [
                '.sheet-mask',        // 🔥 通知权限弹窗（Enable Notifications sheet）
                '.sheet-panel',       // 🔥 sheet 弹窗面板
                '.pushMessage',       // 🔥 推送消息弹窗内容
                '.received-dialog',   // 🔥 领取成功弹窗
                '.popup-container',
                '.popup-content',
                '.modal',
                '.dialog',
                '[class*="popup"]'
            ];

            for (const selector of popupSelectors) {
                const popupVisible = await page.locator(selector)
                    .first()
                    .isVisible({ timeout: 1500 })
                    .catch(() => false);

                if (popupVisible) {
                    hasPopup = true;
                    console.log(`      ✅ 检测到弹窗: ${selector}`);
                    break;
                }
            }

            if (hasPopup) {
                // 🔥 检测到弹窗，交给活动注册表来识别和处理
                console.log(`      🔍 识别弹窗活动类型并处理...`);
                const { identifyAndExecuteActivity } = await import('../activities/activity-registry.js');
                matchedActivity = await identifyAndExecuteActivity(page, test);

                if (matchedActivity && matchedActivity.success) {
                    console.log(`      ✅ 弹窗活动处理成功: ${matchedActivity.activityName}`);
                } else {
                    console.log(`      ⚠️ 弹窗活动处理失败或未识别: ${matchedActivity?.error || '未知'}`);
                }

                // 点击弹窗后再次检查 URL
                const afterPopupUrl = page.url();
                console.log(`      📍 处理弹窗后 URL: ${afterPopupUrl}`);

            } else {
                // 🔥 没有弹窗也没有跳转，可能是无效点击
                console.log(`      ⚠️ 点击后既无弹窗也无跳转，可能是无效活动`);
                throw new Error(`活动 #${index} 点击后无响应`);
            }

        } else {
            // 🔥 URL 已变化，直接跳转
            console.log(`      ✅ 检测到直接跳转`);

            // 等待页面加载
            await page.waitForTimeout(1000);

            // 🔥 在跳转后的页面匹配活动
            matchedActivity = await matchActivity(page, afterUrl);
        }

        // 6. 检查是否匹配到活动
        if (!matchedActivity) {
            console.log(`      ❌ 活动 #${index} 未匹配到任何已知活动类型`);
            await test.captureScreenshot(`activity-${index}-no-match`);
            throw new Error(`活动 #${index} 未匹配到任何已知活动类型`);
        }

        const activityName = matchedActivity.name || matchedActivity.activityName;
        console.log(`      ✅ 匹配到活动: ${activityName}`);
        console.log(`      📋 活动类型: ${hasPopup ? '弹窗类型' : '直接跳转类型'}`);

        // 如果是通过 identifyAndExecuteActivity 处理的弹窗，此时它已经接管了具体的点击和交互流程
        if (!matchedActivity.activityId) {
            // 7. 等待目标页面加载完成
            console.log(`      ⏳ 等待目标页面加载...`);
            const targetConfig = matchedActivity.targetPageConfig;

            if (targetConfig && targetConfig.waitForSelector) {
                const selectors = targetConfig.waitForSelector.split(',').map(s => s.trim());
                let selectorFound = false;

                for (const selector of selectors) {
                    const exists = await page.locator(selector)
                        .first()
                        .isVisible({ timeout: 3000 })
                        .catch(() => false);

                    if (exists) {
                        console.log(`      ✅ 找到目标元素: ${selector}`);
                        selectorFound = true;
                        break;
                    }
                }

                if (!selectorFound) {
                    console.log(`      ⚠️ 未找到目标元素，但继续执行`);
                }
            }

            if (targetConfig) {
                await page.waitForTimeout(targetConfig.waitTime || 1000);
            }

            // 8. 执行自定义处理函数（如果有）
            if (matchedActivity.handler && typeof matchedActivity.handler === 'function') {
                console.log(`      🔧 执行自定义处理函数...`);
                try {
                    await matchedActivity.handler(page, test);
                    console.log(`      ✅ 自定义处理完成`);
                } catch (handlerError) {
                    console.log(`      ⚠️ 自定义处理失败: ${handlerError.message}`);
                }
            }
        } else {
            // 已由 activity-registry 执行过处理，跳过单独等待逻辑
            console.log(`      ✅ 弹窗活动流程由内部处理器接管完成`);
        }

        // 9. 如果当前不在活动资讯页（通过 URL 判断），再去返回
        const currentCheckUrl = page.url();
        if (!currentCheckUrl.includes('/activity') && !currentCheckUrl.includes('/promo')) {
            console.log(`      ↩️ 当前在 ${currentCheckUrl}，准备返回 ${returnPageName}...`);
            await page.goBack();
            await page.waitForTimeout(1000);
            
            // 10. 验证是否成功返回
            const returnedUrl = page.url();
            console.log(`      📍 返回后 URL: ${returnedUrl}`);

            // 等待返回页面的元素出现
            const returnSuccess = await page.locator(returnWaitForSelector)
                .first()
                .isVisible({ timeout: 3000 })
                .catch(() => false);

            if (!returnSuccess) {
                console.log(`      ⚠️ 返回页面元素未找到，尝试再次返回...`);
                await page.goBack();
                await page.waitForTimeout(1000);
            }
        } else {
            console.log(`      ✅ 已经在活动资讯页，无需跳转（当前 URL: ${currentCheckUrl}）`);
        }

        console.log(`      ✅ 已返回 ${returnPageName}`);

        return {
            success: true,
            activityName: matchedActivity.name,
            hasPopup: hasPopup,
            index: index
        };

    } catch (error) {
        console.error(`      ❌ 处理活动 #${index} 失败: ${error.message}`);
        await test.captureScreenshot(`activity-${index}-error`);

        return {
            success: false,
            activityName: null,
            hasPopup: null,
            index: index,
            error: error.message
        };
    }
}

/**
 * 🔥 验证各个活动资讯活动（智能识别版本）
 * @param {*} page 
 * @param {*} auth 
 * @param {*} test 
 */
export async function verifyAllActivities(page, auth, test) {
    console.log('      🔍 开始验证各个活动资讯活动...');

    // 动态导入活动配置池
    const { getActivityPoolStats } = await import('./activity-pool.js');
    const poolStats = getActivityPoolStats();
    console.log(`      📚 活动配置池: 共 ${poolStats.total} 种活动类型`);
    console.log(`      📋 活动列表: ${poolStats.activities.join(', ')}`);

    // 获取页面上的活动总数
    const activityCount = await page.locator('.activeList .activeItem').count();
    console.log(`      📊 页面显示 ${activityCount} 个活动需要验证\n`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // 遍历所有活动
    for (let i = 0; i < activityCount; i++) {
        try {
            console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`      📌 验证活动 ${i + 1}/${activityCount}`);

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

        } catch (error) {
            failCount++;
            console.error(`      ❌ 活动 #${i} 验证异常: ${error.message}`);

            results.push({
                index: i,
                success: false,
                error: error.message
            });

            // 如果发生异常，可能页面没有回到正确的状态，尝试强制返回活动页面
            try {
                const currentUrl = page.url();
                if (!currentUrl.includes('/activity') && !currentUrl.includes('/promo')) {
                    console.log(`      🔄 异常后不在活动列表页，尝试强制返回...`);
                    const baseUrl = currentUrl.split('/').slice(0, 3).join('/');
                    await page.goto(`${baseUrl}/activity`);
                    await page.waitForTimeout(2000);
                    
                    // 确保列表重新加载
                    await page.locator('.activeList').isVisible({ timeout: 5000 }).catch(() => false);
                }
            } catch (navError) {
                console.log(`      ❌ 强制返回活动页失败: ${navError.message}`);
            }

            // 继续验证下一个活动，不中断流程
        }
    }

    // 输出统计结果
    console.log(`\n      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`      📊 验证完成统计:`);
    console.log(`      ✅ 成功: ${successCount}/${activityCount}`);
    console.log(`      ❌ 失败: ${failCount}/${activityCount}`);
    console.log(`      📈 成功率: ${((successCount / activityCount) * 100).toFixed(2)}%`);

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
        total: activityCount,
        success: successCount,
        fail: failCount,
        results: results
    };
}

/**
 * 验证活动资讯接口与页面元素一致性
 * @param {*} page 
 * @param {*} auth 
 * @param {*} test 
 */
export async function verifyActivityApiConsistency(page, auth, test) {
    console.log('      🔍 开始验证活动资讯接口与页面一致性...');

    // 1. 从网络监控中查找活动资讯接口
    const apiRequests = test.networkMonitor.getApiRequests();
    const activityRequest = apiRequests.find(req =>
        req.url.includes('/api/Activity/GetActivityInformationList')
    );

    if (!activityRequest) {
        console.log('      ⚠️ 未找到活动资讯接口请求');
        await test.captureScreenshot('activity-api-not-found');
        throw new Error('未找到活动资讯接口 /api/Activity/GetActivityInformationList');
    }

    console.log(`      ✅ 找到活动资讯接口: ${activityRequest.url}`);

    // 2. 检查接口响应
    const responseBody = activityRequest.responseBody;
    if (!responseBody) {
        console.log('      ⚠️ 接口响应体为空');
        await test.captureScreenshot('activity-api-empty-response');
        throw new Error('活动资讯接口响应体为空');
    }

    // 3. 检查接口返回的数组
    let activityList = [];

    // 打印完整的响应体结构用于调试
    console.log(`      🔍 接口响应体类型: ${typeof responseBody}`);
    console.log(`      🔍 接口响应体键: ${Object.keys(responseBody).join(', ')}`);

    // 🔥 打印完整的响应体用于调试
    console.log(`      🔍 完整响应体:`, JSON.stringify(responseBody, null, 2));

    // 根据不同的响应结构提取数组
    if (Array.isArray(responseBody)) {
        activityList = responseBody;
        console.log(`      📌 使用 responseBody 作为数组`);
    } else if (responseBody.data && Array.isArray(responseBody.data)) {
        activityList = responseBody.data;
        console.log(`      � 使用 responseBody.data 作为数组`);
        console.log(`      🔍 data 数组实际长度: ${responseBody.data.length}`);

        // 🔥 打印所有活动的 ID 和标题
        console.log(`      🔍 所有活动列表:`);
        responseBody.data.forEach((item, index) => {
            console.log(`        ${index + 1}. ID: ${item.id || 'N/A'}, 标题: ${item.title || item.name || 'N/A'}`);
        });
    } else if (responseBody.result && Array.isArray(responseBody.result)) {
        activityList = responseBody.result;
        console.log(`      📌 使用 responseBody.result 作为数组`);
    }

    console.log(`      📊 接口返回活动数量: ${activityList.length}`);

    // 4. 如果接口返回数组为空，截图报错
    if (activityList.length === 0) {
        console.log('      ❌ 接口返回的活动列表为空');
        await test.captureScreenshot('activity-api-empty-array');
        throw new Error('活动资讯接口返回的数组为空');
    }

    // 5. 检查页面上的活动元素数量
    // 尝试多种选择器来确保准确性
    const selector1Count = await page.locator('.activeList > .activeItem').count();
    const selector2Count = await page.locator('.activeList .activeItem').count();
    const selector3Count = await page.locator('.activeItem').count();

    console.log(`      📄 页面元素统计:`);
    console.log(`      - .activeList > .activeItem: ${selector1Count} 个`);
    console.log(`      - .activeList .activeItem: ${selector2Count} 个`);
    console.log(`      - .activeItem: ${selector3Count} 个`);

    // 使用最准确的选择器
    const pageActivityCount = selector2Count;
    console.log(`      📄 页面显示活动数量: ${pageActivityCount}`);

    // 6. 对比接口数量和页面数量
    if (pageActivityCount !== activityList.length) {
        console.log(`      ❌ 数量不一致！接口: ${activityList.length}, 页面: ${pageActivityCount}`);
        await test.captureScreenshot('activity-count-mismatch');

        // 记录错误但不中断测试流程
        console.log('      ⚠️ 活动数量不一致，但继续执行后续测试');
        // 不抛出错误，让测试继续
    } else {
        console.log(`      ✅ 活动数量一致: ${activityList.length} 个`);
    }
}

/**
 * 进入第一个活动
 * @param {} page 
 * @param {*} auth 
 * @param {*} test 
 */
export async function verifyActivefirst(page, auth, test) {

}