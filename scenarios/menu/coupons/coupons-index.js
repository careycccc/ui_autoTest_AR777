/**
 * Coupons 优惠券模块
 */

export async function registerCouponsCases(menuModule) {
    menuModule.registerCase('Coupons 优惠券', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证优惠券页面...');
        const hasCoupons = await page.locator('text=Coupons').isVisible({ timeout: 3000 });
        if (!hasCoupons) throw new Error('优惠券页面未加载');
        console.log('      ✅ 优惠券页面验证通过');
    });

    menuModule.registerCase('Coupons 优惠券', '查看可用优惠券', async (page, auth, test) => {
        console.log('      🔍 查看可用优惠券...');
        const couponItems = page.locator('.coupon-item, [class*="coupon"]');
        const count = await couponItems.count();
        console.log(`      🎫 可用优惠券数量: ${count}`);
        console.log('      ✅ 优惠券查看完成');
    });

    menuModule.registerCase('Coupons 优惠券', '使用优惠券', async (page, auth, test) => {
        console.log('      🔍 测试使用优惠券...');
        const useBtn = page.locator('button:has-text("Use"), button:has-text("使用")').first();
        const isVisible = await useBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
            console.log('      ℹ️ 暂无可使用的优惠券');
            return;
        }
        await useBtn.click();
        await page.waitForTimeout(1000);
        console.log('      ✅ 优惠券使用测试完成');
    });
}
