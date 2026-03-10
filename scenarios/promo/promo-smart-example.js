/**
 * 智能活动识别系统使用示例
 * 展示如何使用新的自动识别和处理系统
 */

import { verifyAllActivities } from './promo.js';

/**
 * 示例 1: 最简单的使用方式
 * 只需调用 verifyAllActivities，系统会自动：
 * 1. 获取页面上的所有活动
 * 2. 依次点击每个活动
 * 3. 自动判断是弹窗还是直接跳转
 * 4. 在配置池中匹配活动类型
 * 5. 执行相应的处理逻辑
 * 6. 自动返回活动列表页
 * 7. 继续下一个活动
 */
export async function simpleUsage(page, auth, test) {
    console.log('🚀 开始验证所有活动（智能识别）...\n');

    // 一行代码搞定所有活动验证！
    const result = await verifyAllActivities(page, auth, test);

    console.log('\n📊 验证结果:');
    console.log(`   总数: ${result.total}`);
    console.log(`   成功: ${result.success}`);
    console.log(`   失败: ${result.fail}`);
    console.log(`   成功率: ${((result.success / result.total) * 100).toFixed(2)}%`);
}

/**
 * 示例 2: 查看详细结果
 */
export async function detailedResults(page, auth, test) {
    console.log('🚀 开始验证所有活动（查看详细结果）...\n');

    const result = await verifyAllActivities(page, auth, test);

    // 输出每个活动的详细信息
    console.log('\n📋 详细结果:');
    result.results.forEach((item, index) => {
        if (item.success) {
            console.log(`   ${index + 1}. ✅ ${item.activityName} (${item.hasPopup ? '弹窗' : '直接跳转'})`);
        } else {
            console.log(`   ${index + 1}. ❌ 失败: ${item.error}`);
        }
    });
}

/**
 * 示例 3: 只验证前 N 个活动
 */
export async function verifyFirstN(page, auth, test, n = 5) {
    console.log(`🚀 开始验证前 ${n} 个活动...\n`);

    const { handleActivityClick } = await import('./promo.js');

    const activityCount = await page.locator('.activeList .activeItem').count();
    const maxToTest = Math.min(activityCount, n);

    for (let i = 0; i < maxToTest; i++) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`验证活动 ${i + 1}/${maxToTest}`);

        const result = await handleActivityClick({
            page,
            test,
            index: i
        });

        if (result.success) {
            console.log(`✅ 成功: ${result.activityName}`);
        } else {
            console.log(`❌ 失败: ${result.error}`);
        }
    }
}

/**
 * 示例 4: 验证特定索引的活动
 */
export async function verifySpecificActivities(page, auth, test) {
    console.log('🚀 验证特定的活动...\n');

    const { handleActivityClick } = await import('./promo.js');

    // 只验证第 0、2、4 个活动
    const indicesToVerify = [0, 2, 4];

    for (const index of indicesToVerify) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`验证活动 #${index}`);

        const result = await handleActivityClick({
            page,
            test,
            index
        });

        if (result.success) {
            console.log(`✅ 成功: ${result.activityName}`);
        } else {
            console.log(`❌ 失败: ${result.error}`);
        }
    }
}

/**
 * 示例 5: 带错误重试的验证
 */
export async function verifyWithRetry(page, auth, test) {
    console.log('🚀 开始验证所有活动（带重试）...\n');

    const { handleActivityClick } = await import('./promo.js');

    const activityCount = await page.locator('.activeList .activeItem').count();
    const maxRetries = 2;
    const results = [];

    for (let i = 0; i < activityCount; i++) {
        let success = false;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries && !success; attempt++) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`验证活动 ${i + 1}/${activityCount} (尝试 ${attempt}/${maxRetries})`);

            const result = await handleActivityClick({
                page,
                test,
                index: i
            });

            if (result.success) {
                success = true;
                console.log(`✅ 成功: ${result.activityName}`);
                results.push(result);
            } else {
                lastError = result.error;
                console.log(`❌ 失败: ${result.error}`);

                if (attempt < maxRetries) {
                    console.log(`⏳ 等待 2 秒后重试...`);
                    await page.waitForTimeout(2000);
                }
            }
        }

        if (!success) {
            console.log(`❌ 活动 #${i} 在 ${maxRetries} 次尝试后仍然失败`);
            results.push({ success: false, index: i, error: lastError });
        }
    }

    return results;
}

/**
 * 示例 6: 查看活动配置池信息
 */
export async function showActivityPool() {
    console.log('📚 活动配置池信息:\n');

    const { getActivityPoolStats, ACTIVITY_POOL } = await import('./activity-pool.js');

    const stats = getActivityPoolStats();

    console.log(`总活动类型: ${stats.total}`);
    console.log(`有弹窗: ${stats.withPopup}`);
    console.log(`无弹窗: ${stats.withoutPopup}`);
    console.log('\n活动列表:');

    ACTIVITY_POOL.forEach((activity, index) => {
        console.log(`\n${index + 1}. ${activity.name}`);
        console.log(`   识别方式: ${activity.identifiers.length} 种`);
        activity.identifiers.forEach(id => {
            console.log(`     - ${id.type}: ${id.value}`);
        });
        console.log(`   弹窗: ${activity.hasPopup ? '是' : '否'}`);
        console.log(`   目标页面: ${activity.targetPageConfig.name}`);
    });
}

/**
 * 示例 7: 完整的测试流程
 */
export async function completeTest(page, auth, test) {
    console.log('🚀 开始完整的活动测试流程...\n');

    // 步骤 1: 显示配置池信息
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('步骤 1: 查看活动配置池');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    await showActivityPool();

    // 步骤 2: 检查活动列表
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('步骤 2: 检查页面活动列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const hasActivityList = await page.locator('.activeList').isVisible();
    if (!hasActivityList) {
        throw new Error('活动列表不存在');
    }
    console.log('✅ 活动列表存在');

    const activityCount = await page.locator('.activeList .activeItem').count();
    console.log(`📊 页面显示 ${activityCount} 个活动`);

    // 步骤 3: 验证所有活动
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('步骤 3: 验证所有活动');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const result = await verifyAllActivities(page, auth, test);

    // 步骤 4: 输出最终报告
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('步骤 4: 测试报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 总活动数: ${result.total}`);
    console.log(`✅ 成功: ${result.success} (${((result.success / result.total) * 100).toFixed(2)}%)`);
    console.log(`❌ 失败: ${result.fail} (${((result.fail / result.total) * 100).toFixed(2)}%)`);

    if (result.success > 0) {
        console.log('\n✅ 成功的活动:');
        result.results.filter(r => r.success).forEach((r, idx) => {
            console.log(`   ${idx + 1}. ${r.activityName} (${r.hasPopup ? '弹窗' : '直接跳转'})`);
        });
    }

    if (result.fail > 0) {
        console.log('\n❌ 失败的活动:');
        result.results.filter(r => !r.success).forEach((r, idx) => {
            console.log(`   ${idx + 1}. 活动 #${r.index}: ${r.error}`);
        });
    }

    console.log('\n🎉 测试完成！');

    return result;
}

/**
 * 使用说明
 * 
 * 在你的测试文件中导入并使用：
 * 
 * import { simpleUsage } from './scenarios/promo/promo-smart-example.js';
 * 
 * // 在测试用例中调用
 * await simpleUsage(page, auth, test);
 * 
 * 或者直接使用 verifyAllActivities：
 * 
 * import { verifyAllActivities } from './scenarios/promo/promo.js';
 * 
 * const result = await verifyAllActivities(page, auth, test);
 * console.log(`成功: ${result.success}, 失败: ${result.fail}`);
 */
