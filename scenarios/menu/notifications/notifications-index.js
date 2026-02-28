/**
 * Notifications 通知模块
 * Notifications Module
 */

/**
 * 注册通知相关用例
 * @param {TestModle} menuModule - Menu 模块实例
 */
export async function registerNotificationsCases(menuModule) {

    // 用例 1: 通知页面加载验证
    menuModule.registerCase('Notifications 通知', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证通知页面加载...');

        const hasNotifications = await page.locator('text=Notifications').isVisible({ timeout: 3000 });
        if (!hasNotifications) {
            throw new Error('通知页面未加载');
        }

        console.log('      ✅ 通知页面加载验证通过');
    });

    // 用例 2: 获取通知列表
    menuModule.registerCase('Notifications 通知', '获取通知列表', async (page, auth, test) => {
        console.log('      🔍 获取通知列表...');

        const notificationItems = page.locator('.notification-item, [class*="notification"]');
        const count = await notificationItems.count();

        console.log(`      📊 通知数量: ${count}`);

        if (count > 0) {
            // 获取第一条通知的内容
            const firstNotification = await notificationItems.first().textContent();
            console.log(`      📝 第一条通知: ${firstNotification.substring(0, 50)}...`);
        }

        console.log('      ✅ 通知列表获取完成');
    });

    // 用例 3: 点击通知查看详情
    menuModule.registerCase('Notifications 通知', '查看通知详情', async (page, auth, test) => {
        console.log('      🔍 测试查看通知详情...');

        const notificationItems = page.locator('.notification-item, [class*="notification"]');
        const count = await notificationItems.count();

        if (count === 0) {
            console.log('      ℹ️ 暂无通知');
            return;
        }

        // 点击第一条通知
        await notificationItems.first().click();
        await page.waitForTimeout(1000);

        console.log('      ✅ 通知详情查看完成');
    });

    // 用例 4: 标记通知为已读
    menuModule.registerCase('Notifications 通知', '标记为已读', async (page, auth, test) => {
        console.log('      🔍 测试标记通知为已读...');

        // 查找标记为已读的按钮
        const markReadBtn = page.locator('button:has-text("Mark as Read"), button:has-text("已读")').first();
        const isVisible = await markReadBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (!isVisible) {
            console.log('      ℹ️ 未找到标记为已读按钮');
            return;
        }

        await markReadBtn.click();
        await page.waitForTimeout(500);

        console.log('      ✅ 标记为已读完成');
    });
}
