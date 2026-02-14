/**
 * 首页弹窗活动处理模块
 * Home Popup Activity Handlers
 */

// 原有处理函数
import { handleDepositPopup } from './deposit.js';
import { handleRebatePopup } from './rebate.js';
import { handleLossRebatePopup } from './loss-rebate.js';
import { handleDailyDepositRewardsPopup } from './daily-deposit-rewards.js';

// 新增处理函数
import { handleTasksPopup } from './tasks.js';
import { handleUIDPopup } from './uid.js';
import { handleDepositWheelPopup } from './deposit-wheel.js';
import { handleMyRewardsPopup } from './my-rewards.js';
import { handleNotificationsPopup } from './notifications.js';
import { handleChampionshipPopup } from './championship.js';
import { handleVIPPopup } from './vip.js';
import { handleSuperJackpotPopup } from './super-jackpot.js';
import { handleCouponsPopup } from './coupons.js';
import { handleWithdrawPopup } from './withdraw.js';

/**
 * 根据断言文本获取对应的处理函数
 * @param {string} assertText - 断言文本（如 "Deposit", "Rebate" 等）
 * @returns {Function|null} 返回对应的处理函数，如果没有则返回 null
 */
export function getPopupHandler(assertText) {
    const handlers = {
        // 原有处理函数
        'Deposit': handleDepositPopup,
        'Rebate': handleRebatePopup,
        'Loss Rebate': handleLossRebatePopup,
        'Daily deposit rewards': handleDailyDepositRewardsPopup,

        // 新增处理函数
        'Tasks': handleTasksPopup,
        'UID': handleUIDPopup,
        'Deposit Wheel': handleDepositWheelPopup,
        'My Rewards': handleMyRewardsPopup,
        'Notifications': handleNotificationsPopup,
        'Championship': handleChampionshipPopup,
        'VIP': handleVIPPopup,
        'Super Jackpot': handleSuperJackpotPopup,
        'Coupons': handleCouponsPopup,
        'Withdraw': handleWithdrawPopup,

        // 父用例页面，无需处理（已有专门的测试用例）
        'Promotions': null,      // 周卡月卡 - 活动资讯父用例
        'Home': null,            // 首页/礼品码 - 首页父用例
        'Invitation Wheel': null,  // 邀请转盘 - 已有专门用例
        'Cash everyday': null      // 邀请转盘 - 已有专门用例
    };

    return handlers[assertText] || null;
}

/**
 * 执行弹窗活动处理
 * @param {string} assertText - 断言文本
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - AuthHelper 实例
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回处理结果
 */
export async function executePopupHandler(assertText, page, auth, test) {
    const handler = getPopupHandler(assertText);

    if (!handler) {
        console.log(`        ℹ️ "${assertText}" 页面无需额外处理（父用例或已有专门测试）`);
        return {
            success: true,
            skipped: true,
            reason: 'No handler defined or parent case'
        };
    }

    console.log(`        🎯 执行 "${assertText}" 页面处理函数...`);
    return await handler(page, auth, test);
}

// 导出所有处理函数
export {
    // 原有
    handleDepositPopup,
    handleRebatePopup,
    handleLossRebatePopup,
    handleDailyDepositRewardsPopup,
    // 新增
    handleTasksPopup,
    handleUIDPopup,
    handleDepositWheelPopup,
    handleMyRewardsPopup,
    handleNotificationsPopup,
    handleChampionshipPopup,
    handleVIPPopup,
    handleSuperJackpotPopup,
    handleCouponsPopup,
    handleWithdrawPopup
};
