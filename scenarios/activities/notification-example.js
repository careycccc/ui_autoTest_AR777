/**
 * 站内信活动处理示例
 * 演示如何使用站内信处理器处理完整的交互流程
 */

import { executeActivity } from './activity-executor.js';

/**
 * 站内信处理示例 - 从活动列表进入
 */
export async function notificationFromActivityList(page, test) {
    console.log('🎯 示例：从活动列表进入站内信');

    try {
        // 从活动列表点击站内信活动
        const result = await executeActivity({
            page,
            test,
            clickSelector: '.activeList .activeItem',
            clickIndex: 0, // 假设站内信是第一个活动
            autoReturn: true
        });

        if (result.success) {
            console.log('✅ 站内信活动处理成功');

            // 检查是否处理了子活动
            if (result.activityResult && result.activityResult.jumpedActivity) {
                console.log(`🎯 还处理了子活动: ${result.activityResult.activityName}`);
                console.log(`📝 按钮文本: ${result.activityResult.buttonText}`);
            }

            return result;
        } else {
            console.log(`❌ 站内信活动处理失败: ${result.error}`);
            return result;
        }

    } catch (error) {
        console.log(`❌ 站内信示例执行失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 站内信处理示例 - 直接调用处理器
 */
export async function notificationDirectCall(page, test) {
    console.log('🎯 示例：直接调用站内信处理器');

    try {
        // 假设已经在站内信页面，直接调用处理器
        const { handleNotification } = await import('./activity-handlers.js');
        const result = await handleNotification(page, test);

        if (result.success) {
            console.log('✅ 站内信处理器调用成功');
            console.log(`📊 处理结果:`, result);
            return result;
        } else {
            console.log(`❌ 站内信处理器调用失败: ${result.error || result.reason}`);
            return result;
        }

    } catch (error) {
        console.log(`❌ 直接调用示例执行失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 站内信处理示例 - 智能识别调用
 */
export async function notificationSmartIdentify(page, test) {
    console.log('🎯 示例：智能识别站内信页面');

    try {
        // 使用智能识别系统自动识别并处理
        const { identifyAndExecuteActivity } = await import('./activity-registry.js');
        const result = await identifyAndExecuteActivity(page, test);

        if (result.success) {
            console.log('✅ 智能识别处理成功');
            console.log(`🎯 识别的活动: ${result.activityName}`);
            console.log(`🆔 活动ID: ${result.activityId}`);
            return result;
        } else {
            console.log(`❌ 智能识别处理失败: ${result.error}`);
            return result;
        }

    } catch (error) {
        console.log(`❌ 智能识别示例执行失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 完整的站内信处理流程演示
 */
export async function fullNotificationDemo(page, test) {
    console.log('🎯 完整站内信处理流程演示');
    console.log('');

    const results = {
        navigation: null,
        processing: null,
        summary: {
            totalMessages: 0,
            rewardsCollected: 0,
            activitiesProcessed: 0,
            errors: []
        }
    };

    try {
        // 步骤1: 导航到站内信页面
        console.log('📍 步骤1: 导航到站内信页面');
        await page.goto('/notifications'); // 假设的站内信页面URL
        await page.waitForTimeout(2000);

        // 步骤2: 验证页面加载
        const hasTitle = await page.locator('.head-title .route-name')
            .filter({ hasText: 'Notifications' })
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (!hasTitle) {
            throw new Error('未能成功导航到站内信页面');
        }

        console.log('✅ 成功进入站内信页面');
        results.navigation = { success: true };

        // 步骤3: 处理站内信
        console.log('');
        console.log('📍 步骤2: 处理站内信内容');
        const processingResult = await notificationDirectCall(page, test);
        results.processing = processingResult;

        // 步骤4: 汇总结果
        if (processingResult.success) {
            console.log('');
            console.log('📊 处理结果汇总:');
            console.log(`   ✅ 站内信处理: 成功`);

            if (processingResult.activityResult) {
                const activityResult = processingResult.activityResult;
                console.log(`   🎯 子活动处理: ${activityResult.activityName || '未知'}`);
                console.log(`   📝 触发按钮: ${activityResult.buttonText || '未知'}`);
                console.log(`   🔄 页面跳转: ${activityResult.jumpedActivity ? '是' : '否'}`);

                if (activityResult.jumpedActivity) {
                    results.summary.activitiesProcessed = 1;
                }
            }
        } else {
            results.summary.errors.push(processingResult.error || processingResult.reason);
        }

        return results;

    } catch (error) {
        console.log(`❌ 完整演示执行失败: ${error.message}`);
        results.summary.errors.push(error.message);
        return results;
    }
}

// 导出所有示例函数
export default {
    notificationFromActivityList,
    notificationDirectCall,
    notificationSmartIdentify,
    fullNotificationDemo
};