
//活动资讯

/**
 * 检查子活动是否存在
 * @param {*} page 
 * @param {*} auth 
 * @param {*} test 
 */
export async function verifyActivelist(page, auth, test) {
    // 检查活动列表容器是否存在
    const activeListVisible = await page.locator('.activeList').isVisible().catch(() => false);

    if (!activeListVisible) {
        throw new Error('活动列表容器不存在');
    }

    // 检查活动列表中的活动项数量
    const count = await page.locator('.activeList .activeItem').count();

    console.log(`      找到 ${count} 个活动`);

    if (count === 0) {
        throw new Error('活动列表为空');
    }
    //await page.pause();
    console.log(`      ✅ 活动列表有 ${count} 个活动`);
}

/**
 * 进入第一个活动
 * @param {} page 
 * @param {*} auth 
 * @param {*} test 
 */
export async function verifyActivefirst(page, auth, test) {

}