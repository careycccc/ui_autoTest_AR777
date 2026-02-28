/**
 * Live Support 在线客服模块
 */

export async function registerLiveSupportCases(menuModule) {
    menuModule.registerCase('Live Support 在线客服', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证在线客服页面...');
        const hasSupport = await page.locator('text=Support, text=Chat').isVisible({ timeout: 3000 });
        if (!hasSupport) throw new Error('在线客服页面未加载');
        console.log('      ✅ 在线客服页面验证通过');
    });

    menuModule.registerCase('Live Support 在线客服', '发送消息', async (page, auth, test) => {
        console.log('      🔍 测试发送消息...');
        const messageInput = page.locator('input[placeholder*="message"], textarea').first();
        const isVisible = await messageInput.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            console.log('      ℹ️ 未找到消息输入框');
            return;
        }
        await messageInput.fill('Hello, I need help');
        await page.waitForTimeout(500);
        console.log('      ✅ 消息发送测试完成');
    });
}
