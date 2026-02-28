/**
 * Balance Records 余额记录模块
 */

export async function registerBalanceRecordsCases(menuModule) {
    menuModule.registerCase('Balance records 余额记录', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证余额记录页面...');
        const hasBalance = await page.locator('text=Balance, text=Records').isVisible({ timeout: 3000 });
        if (!hasBalance) throw new Error('余额记录页面未加载');
        console.log('      ✅ 余额记录页面验证通过');
    });

    menuModule.registerCase('Balance records 余额记录', '获取交易记录', async (page, auth, test) => {
        console.log('      🔍 获取交易记录...');
        const records = page.locator('.record-item, [class*="record"]');
        const count = await records.count();
        console.log(`      📊 交易记录数量: ${count}`);
        console.log('      ✅ 交易记录获取完成');
    });
}
