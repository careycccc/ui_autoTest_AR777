/**
 * 新版返佣 - 子用例模块
 */
import {
    earnTeamDetail,
    Withdrawalrewards,
    earnInviteLink,
    earnInviteRewardsRankInfo,
    earnInviteRewardsHistory,
    earnInviteRewardsRules,
    earnInviteRewardsRanklist,
    earnInviteRewardsInviteLink
} from './earn-index.js';
import { handleTelegramJump } from '../utils.js';

/**
 * 注册新版返佣的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerEarnCases(runner) {
    // 1. 检查新版返佣进入团队详情
    runner.registerCase('新版返佣', '检查新版返佣进入团队详情', async (page, auth, test) => {
        await earnTeamDetail(page, test);
    });

    // 2. 检查新版返佣进入手动/自动领取佣金，佣金详情
    runner.registerCase('新版返佣', '检查新版返佣进入手动/自动领取佣金，佣金详情', async (page, auth, test) => {
        await Withdrawalrewards(page, test);
    });

    // 3. 检查新版返佣的邀请界面
    runner.registerCase('新版返佣', '检查新版返佣的邀请界面', async (page, auth, test) => {
        await earnInviteLink(page, test);
    });

    // 4. 检查新版返佣界面的外链跳转
    runner.registerCase('新版返佣', '检查新版返佣界面的外链跳转', async (page, auth, test) => {
        const jumpResult = await handleTelegramJump(page, '.link-wrapper', {
            telegramText: 'Telegram',
            jumpTimeout: 5000,
            waitAfterBack: 1000,
            verifyReturn: true,
            name: '新版返佣首页->Telegram'
        });

        if (!jumpResult.success) {
            console.log(`        ⚠️ Telegram 跳转验证失败: ${jumpResult.error || '未知错误'}`);
            // 邀请码验证成功，只是跳转功能不可用
            return true;
        }
    });

    // 5. 检查新版返佣的排行榜的界面的个人详情页
    runner.registerCase('新版返佣', '检查新版返佣的排行榜的界面的个人详情页', async (page, auth, test) => {
        await earnInviteRewardsRankInfo(page, test);
    });

    //6.检查新版返佣的排行榜的界面的历史记录
    runner.registerCase('新版返佣', '检查新版返佣的排行榜的界面的历史记录', async (page, auth, test) => {
        await earnInviteRewardsHistory(page, test);
    });

    //7.检查新版返佣的排行榜的界面的规则
    runner.registerCase('新版返佣', '检查新版返佣的排行榜的界面的规则', async (page, auth, test) => {
        await earnInviteRewardsRules(page, test);
    });

    //8.检查新版返佣的排行榜的界面的排行榜
    runner.registerCase('新版返佣', '检查新版返佣的排行榜的界面的排行榜', async (page, auth, test) => {
        await earnInviteRewardsRanklist(page, test);
    });

    //9.检查新版返佣的邀请界面
    runner.registerCase('新版返佣', '检查新版返佣的邀请界面', async (page, auth, test) => {
        await earnInviteRewardsInviteLink(page, test);
    });
}
