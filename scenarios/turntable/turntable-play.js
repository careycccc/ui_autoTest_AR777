import { handleFailure } from '../utils.js';

/**
 * 邀请转盘的开始
 * 
 */
export async function turntablePlay(page, test, actionName) {
    try {
        // 1. 查看是否存在 Cash everyday
        const cashEveryday = await page.getByText('Cash everyday').isVisible({ timeout: 3000 }).catch(() => false);

        if (cashEveryday) {
            console.log('        ✅ 找到 Cash everyday，尝试查找 gift_list...');

            // 2. 查找 .gift_list
            const giftList = page.locator('.gift_list');
            const giftListVisible = await giftList.isVisible({ timeout: 3000 }).catch(() => false);

            if (giftListVisible) {
                // 3. 获取所有 .gift_item
                const giftItems = giftList.locator('.gift_item');
                const itemCount = await giftItems.count();

                if (itemCount > 0) {
                    // 4. 随机点击其中一个 gift_item
                    const randomIndex = Math.floor(Math.random() * Math.min(itemCount, 4));
                    await giftItems.nth(randomIndex).click();
                    console.log(`        ✅ 随机点击了第 ${randomIndex + 1} 个 gift_item（共 ${itemCount} 个）`);
                } else {
                    console.log('        ⚠️ gift_list 中没有找到 gift_item');
                }
            } else {
                console.log('        ⚠️ 未找到 .gift_list');
            }
        } else {
            console.log('        ℹ️ 未找到 Cash everyday，跳过礼物选择');
        }

        // ✅ 两条路径汇合：无论是否找到 Cash everyday，都执行后续操作
        await page.waitForTimeout(1000);

        // 这里进行正式的转盘活动开始


        return true;
    } catch (error) {
        return await handleFailure(test, `邀请转盘-${actionName || '操作'}失败: ${error.message}`);
    }
}