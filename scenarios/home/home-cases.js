/**
 * 家（首页）- 子用例模块
 */

/**
 * 注册首页的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerHomeCases(runner) {
    // 首页基础检查
    runner.registerCase('家', '检查首页加载', async (page, auth, test) => {
        // 等待页面稳定
        await auth.safeWait(1000);

        // 检查页面标题或关键元素
        const url = page.url();
        console.log(`      ℹ️ 当前 URL: ${url}`);

        // 简单验证：确保在首页
        if (!url.includes('arplatsaassit4.club')) {
            throw new Error('不在首页');
        }

        console.log(`      ✅ 首页加载正常`);
    });
}
