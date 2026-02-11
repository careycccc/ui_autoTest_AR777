/**
 * 新版返佣功能 - 主入口文件
 * 统一导出所有返佣相关功能
 */

// 团队相关功能
export {
    earnTeamDetail,
    earnWithdrawalRewards,
    Withdrawalrewards
} from './earn-team.js';

// 邀请相关功能
export {
    earnInviteLink,
    earnInviteRewardsRankInfo
} from './earn-invite.js';

// 排行榜奖励相关功能
export {
    earnInviteRewardsHistory,
    earnInviteRewardsRules,
    earnInviteRewardsRanklist,
    earnInviteRewardsInviteLink
} from './earn-rewards.js';
