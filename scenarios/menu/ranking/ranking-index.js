/**
 * Ranking 排行榜模块
 */

export async function registerRankingCases(menuModule) {
    menuModule.registerCase('Ranking 排行榜', '页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证排行榜页面...');
        const hasRanking = await page.locator('text=Ranking, text=Leaderboard').isVisible({ timeout: 3000 });
        if (!hasRanking) throw new Error('排行榜页面未加载');
        console.log('      ✅ 排行榜页面验证通过');
    });

    menuModule.registerCase('Ranking 排行榜', '获取排行榜数据', async (page, auth, test) => {
        console.log('      🔍 获取排行榜数据...');
        const rankItems = page.locator('.rank-item, [class*="rank"]');
        const count = await rankItems.count();
        console.log(`      🏆 排行榜人数: ${count}`);
        if (count > 0) {
            const topPlayer = await rankItems.first().textContent();
            console.log(`      👑 第一名: ${topPlayer.substring(0, 30)}`);
        }
        console.log('      ✅ 排行榜数据获取完成');
    });
}
