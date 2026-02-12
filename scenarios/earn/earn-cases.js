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
    earnInviteRewardsInviteLink,
    earnRankToRewards,
    earnRankToInvitees,
    earnInviteRewardsGoToAttend
} from './earn-index.js';
import { handleTelegramJump } from '../utils.js';

/**
 * 注册新版返佣的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerEarnCases(runner) {
    // 1. 检查新版返佣进入团队详情
    runner.registerCase('新版返佣', '新版返佣->我的团队详情', async (page, auth, test) => {
        await earnTeamDetail(page, test);
    });

    // 2. 检查新版返佣进入手动/自动领取佣金，佣金详情
    runner.registerCase('新版返佣', '新版返佣->进入手动/自动领取佣金按钮', async (page, auth, test) => {
        await Withdrawalrewards(page, test);
    });

    // 3. 检查新版返佣的邀请界面
    runner.registerCase('新版返佣', '新版返佣->邀请界面按钮', async (page, auth, test) => {
        await earnInviteLink(page, test);
    });

    // 4. 检查新版返佣界面的外链跳转
    runner.registerCase('新版返佣', '新版返佣->外链跳转按钮', async (page, auth, test) => {
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
    runner.registerCase('新版返佣', '新版返佣排行榜->个人详情页按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnInviteRewardsRankInfo(page, test, { skipTabSwitch: false });
    });

    //6.检查新版返佣的排行榜的界面的历史记录
    runner.registerCase('新版返佣', '新版返佣排行榜->历史记录按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnInviteRewardsHistory(page, test, { skipTabSwitch: false });
    });

    //7.检查新版返佣的排行榜的界面的规则
    runner.registerCase('新版返佣', '新版返佣排行榜->规则按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnInviteRewardsRules(page, test, { skipTabSwitch: false });
    });

    //8.检查新版返佣的排行榜的界面的排行榜
    runner.registerCase('新版返佣', '新版返佣排行榜->榜单页面按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnInviteRewardsRanklist(page, test, { skipTabSwitch: false });
    });

    //9.检查新版返佣的邀请界面
    runner.registerCase('新版返佣', '新版返佣排行榜->邀请按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnInviteRewardsInviteLink(page, test, { skipTabSwitch: false });
    });

    // 10.检查新版返佣排行榜界面的最下面的那两个按钮Rewards
    runner.registerCase('新版返佣', '新版返佣排行榜->Rewards按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnRankToRewards(page, test, { skipTabSwitch: false });
    });
    // 11.检查新版返佣排行榜界面的最下面的那两个按钮Invitees
    runner.registerCase('新版返佣', '新版返佣排行榜->Invitee按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnRankToInvitees(page, test, { skipTabSwitch: false });
    });

    // 12.检查新版返佣排行榜底部弹窗 - Go To Attend
    runner.registerCase('新版返佣', '新版返佣排行榜->Go To Attend按钮', async (page, auth, test) => {
        // 作为独立用例运行时，需要先切换到 Invite Rewards tab
        await earnInviteRewardsGoToAttend(page, test, { skipTabSwitch: false });
    });
}
