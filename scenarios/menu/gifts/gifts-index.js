/**
 * Gifts 礼物模块
 */

export async function registerGiftsCases(menuModule) {
    menuModule.registerCase('Gifts 礼物', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证礼物页面...');
        const hasGifts = await page.locator('text=Gifts, text=Rewards').isVisible({ timeout: 3000 });
        if (!hasGifts) throw new Error('礼物页面未加载');
        console.log('      ✅ 礼物页面验证通过');
    });

    menuModule.registerCase('Gifts 礼物', '查看可用礼物', async (page, auth, test) => {
        console.log('      🔍 查看可用礼物...');
        const giftItems = page.locator('.gift-item, [class*="gift"]');
        const count = await giftItems.count();
        console.log(`      🎁 可用礼物数量: ${count}`);
        console.log('      ✅ 礼物查看完成');
    });

    menuModule.registerCase('Gifts 礼物', '领取礼物', async (page, auth, test) => {
        console.log('      🔍 测试领取礼物...');
        const claimBtn = page.locator('button:has-text("Claim"), button:has-text("领取")').first();
        const isVisible = await claimBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            console.log('      ℹ️ 暂无可领取的礼物');
            return;
        }
        await claimBtn.click();
        await page.waitForTimeout(1000);
        console.log('      ✅ 礼物领取测试完成');
    });
}
