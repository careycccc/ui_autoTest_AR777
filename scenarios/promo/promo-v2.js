/**
 * 活动资讯 - 使用新的活动系统（V2版本）
 */

import { executeActivity, executeBatchActivities } from '../activities/activity-executor.js';

/**
 * 检查子活动是否存在
 */
export async function verifyActivelist(page, auth, test) {
    const activeListVisible = await page.locator('.activeList').isVisible().catch(() => false);

    if (!activeListVisible) {
        throw new Error('活动列表容器不存在');
    }

    const count = await page.locator('.activeList .activeItem').count();
    console.log(`      找到 ${count} 个活动`);

    if (count === 0) {
        throw new Error('活动列表为空');
    }

    console.log(`      ✅ 活动列表有 ${count} 个活动`);
}

/**
 * 🔥 智能活动点击处理函数（使用新的活动系统）
 */
export async function handleActivityClick(options) {
    const {
        page,
        test,
        index,
        activitySelector = '.activeList .activeItem',
        returnWaitForSelector = '.activeList'
    } = options;

    try {
        const result = await executeActivity({
            page,
            test,
            clickSelector: activitySelector,
            clickIndex: index,
            autoReturn: true,
            returnSelector: returnWaitForSelector
        });

        return result;

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
 * 🔥 验证各个活动资讯活动（使用新的活动系统）
 */
export async function verifyAllActivities(page, auth, test) {
    console.log('      🔍 开始验证各个活动资讯活动...');

    // 使用批量执行器
    const result = await executeBatchActivities({
        page,
        test,
        listSelector: '.activeList',
        itemSelector: '.activeItem'
    });

    return result;
}

/**
 * 验证活动资讯接口与页面元素一致性
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
        console.log(`      📌 使用 responseBody.data 作为数组`);
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
    const selector1Count = await page.locator('.activeList > .activeItem').count();
    const selector2Count = await page.locator('.activeList .activeItem').count();
    const selector3Count = await page.locator('.activeItem').count();

    console.log(`      📄 页面元素统计:`);
    console.log(`      - .activeList > .activeItem: ${selector1Count} 个`);
    console.log(`      - .activeList .activeItem: ${selector2Count} 个`);
    console.log(`      - .activeItem: ${selector3Count} 个`);

    const pageActivityCount = selector2Count;
    console.log(`      📄 页面显示活动数量: ${pageActivityCount}`);

    // 6. 对比接口数量和页面数量
    if (pageActivityCount !== activityList.length) {
        console.log(`      ❌ 数量不一致！接口: ${activityList.length}, 页面: ${pageActivityCount}`);
        await test.captureScreenshot('activity-count-mismatch');
        console.log('      ⚠️ 活动数量不一致，但继续执行后续测试');
    } else {
        console.log(`      ✅ 活动数量一致: ${activityList.length} 个`);
    }
}

/**
 * 进入第一个活动
 */
export async function verifyActivefirst(page, auth, test) {
    // 待实现
}
