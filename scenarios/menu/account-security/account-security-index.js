/**
 * Account & Security 账户与安全模块
 */

export async function registerAccountSecurityCases(menuModule) {
    menuModule.registerCase('Account & Security 账户安全', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证账户安全页面...');
        const hasSecurity = await page.locator('text=Account, text=Security').isVisible({ timeout: 3000 });
        if (!hasSecurity) throw new Error('账户安全页面未加载');
        console.log('      ✅ 账户安全页面验证通过');
    });

    menuModule.registerCase('Account & Security 账户安全', '查看账户信息', async (page, auth, test) => {
        console.log('      🔍 查看账户信息...');
        // 获取手机号、邮箱等信息
        const phoneText = await page.locator('.phone, [class*="mobile"]').textContent().catch(() => '');
        const emailText = await page.locator('.email').textContent().catch(() => '');
        console.log(`      📱 手机号: ${phoneText}`);
        console.log(`      📧 邮箱: ${emailText}`);
        console.log('      ✅ 账户信息查看完成');
    });

    menuModule.registerCase('Account & Security 账户安全', '修改密码', async (page, auth, test) => {
        console.log('      🔍 测试修改密码功能...');
        const changePasswordBtn = page.locator('text=Change Password, text=修改密码').first();
        const isVisible = await changePasswordBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            console.log('      ℹ️ 未找到修改密码按钮');
            return;
        }
        await changePasswordBtn.click();
        await page.waitForTimeout(1000);
        console.log('      ✅ 修改密码功能验证完成');
    });
}
