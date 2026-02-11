/**
 * 新版返佣功能 - 主入口文件（向后兼容）
 * 
 * 代码已模块化拆分：
 * - earn-team.js: 团队相关功能
 * - earn-invite.js: 邀请相关功能
 * - earn-rewards.js: 排行榜奖励相关功能
 * - earn-index.js: 统一导出入口
 */

// 重新导出所有功能，保持向后兼容
export * from './earn-index.js';
