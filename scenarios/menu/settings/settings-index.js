/**
 * Settings 设置模块
 */

export async function registerSettingsCases(menuModule) {
    menuModule.registerCase('Settings 设置', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证设置页面...');
        const hasSettings = await page.locator('text=Settings').isVisible({ timeout: 3000 });
        if (!hasSettings) throw new Error('设置页面未加载');
        console.log('      ✅ 设置页面验证通过');
    });

    menuModule.registerCase('Settings 设置', '查看设置选项', async (page, auth, test) => {
        console.log('      🔍 查看设置选项...');
        const settingItems = page.locator('.setting-item, [class*="setting"]');
        const count = await settingItems.count();
        console.log(`      ⚙️ 设置选项数量: ${count}`);
        console.log('      ✅ 设置选项查看完成');
    });

    menuModule.registerCase('Settings 设置', '切换语言', async (page, auth, test) => {
        console.log('      🔍 测试切换语言...');
        const languageBtn = page.locator('text=Language, text=语言').first();
        const isVisible = await languageBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            console.log('      ℹ️ 未找到语言设置');
            return;
        }
        await languageBtn.click();
        await page.waitForTimeout(1000);
        console.log('      ✅ 语言切换测试完成');
    });

    menuModule.registerCase('Settings 设置', '切换主题', async (page, auth, test) => {
        console.log('      🔍 测试切换主题...');
        const themeBtn = page.locator('text=Theme, text=主题').first();
        const isVisible = await themeBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            console.log('      ℹ️ 未找到主题设置');
            return;
        }
        await themeBtn.click();
        await page.waitForTimeout(1000);
        console.log('      ✅ 主题切换测试完成');
    });
}
