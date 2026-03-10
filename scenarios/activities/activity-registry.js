/**
 * 活动注册表 - 统一管理所有活动的配置和处理器
 * 这是整个项目的活动中心，所有地方都可以复用
 */

import * as handlers from './handlers/index.js';

/**
 * 活动注册表
 * 每个活动包含：
 * - id: 唯一标识符
 * - name: 活动名称
 * - identifiers: 识别方式（用于自动匹配）
 * - handler: 处理函数
 */
export const ACTIVITY_REGISTRY = {
    // 每日签到
    'daily-signin': {
        id: 'daily-signin',
        name: '每日签到',
        identifiers: [
            { type: 'url', value: '/daily' },
            { type: 'text', value: 'Daily deposit rewards' },
            { type: 'text', value: 'Daily Rewards' },
            { type: 'selector', value: '.daily-signin' }
        ],
        handler: handlers.handleDailySignIn
    },

    // 充值活动
    'recharge': {
        id: 'recharge',
        name: '充值活动',
        identifiers: [
            { type: 'url', value: '/recharge' },
            { type: 'url', value: '/deposit' },
            { type: 'text', value: 'Deposit' },
            { type: 'text', value: 'Recharge' },
            { type: 'selector', value: '.recharge-page' },
            { type: 'selector', value: '.deposit-page' }
        ],
        handler: handlers.handleRecharge
    },

    // VIP 特权
    'vip': {
        id: 'vip',
        name: 'VIP特权',
        identifiers: [
            { type: 'url', value: '/vip' },
            { type: 'text', value: 'VIP' },
            { type: 'selector', value: '.vip-level' },
            { type: 'selector', value: '.vip-benefits' }
        ],
        handler: handlers.handleVIP
    },

    // 邀请好友
    'invite': {
        id: 'invite',
        name: '邀请好友',
        identifiers: [
            { type: 'url', value: '/invite' },
            { type: 'text', value: 'Invite' },
            { type: 'text', value: 'Invitation' },
            { type: 'selector', value: '.invite-code' },
            { type: 'selector', value: '.invitation-link' }
        ],
        handler: handlers.handleInvite
    },

    // 转盘抽奖
    'turntable': {
        id: 'turntable',
        name: '转盘抽奖',
        identifiers: [
            { type: 'url', value: '/turntable' },
            { type: 'url', value: '/wheel' },
            { type: 'text', value: 'Turntable' },
            { type: 'text', value: 'Wheel' },
            { type: 'text', value: 'Spin' },
            { type: 'selector', value: '.turntable-container' },
            { type: 'selector', value: '.wheel-container' }
        ],
        handler: handlers.handleTurntable
    },

    // 救援金
    'rescue': {
        id: 'rescue',
        name: '救援金',
        identifiers: [
            { type: 'url', value: '/rescue' },
            { type: 'text', value: 'Rescue' },
            { type: 'text', value: 'Loss Rebate' },
            { type: 'selector', value: '.rescue-amount' },
            { type: 'selector', value: '.rescue-info' }
        ],
        handler: handlers.handleRescue
    },

    // 优惠券
    'coupon': {
        id: 'coupon',
        name: '优惠券',
        identifiers: [
            { type: 'url', value: '/coupon' },
            { type: 'text', value: 'Coupon' },
            { type: 'selector', value: '.coupon-list' },
            { type: 'selector', value: '.coupon-item' }
        ],
        handler: handlers.handleCoupon
    },

    // 返水活动
    'rebate': {
        id: 'rebate',
        name: '返水活动',
        identifiers: [
            { type: 'url', value: '/rebate' },
            { type: 'text', value: 'Rebate' },
            { type: 'selector', value: '.rebate-amount' },
            { type: 'selector', value: '.rebate-info' }
        ],
        handler: handlers.handleRebate
    },

    // 任务中心
    'task': {
        id: 'task',
        name: '任务中心',
        identifiers: [
            { type: 'url', value: '/task' },
            { type: 'text', value: 'Task' },
            { type: 'text', value: 'Mission' },
            { type: 'selector', value: '.task-list' },
            { type: 'selector', value: '.task-item' }
        ],
        handler: handlers.handleTask
    },

    // 锦标赛
    'championship': {
        id: 'championship',
        name: '锦标赛',
        identifiers: [
            { type: 'url', value: '/championship' },
            { type: 'url', value: '/tournament' },
            { type: 'text', value: 'Championship' },
            { type: 'text', value: 'Tournament' },
            { type: 'selector', value: '.championship-info' },
            { type: 'selector', value: '.tournament-info' }
        ],
        handler: handlers.handleChampionship
    },

    // 超级大奖
    'jackpot': {
        id: 'jackpot',
        name: '超级大奖',
        identifiers: [
            { type: 'url', value: '/jackpot' },
            { type: 'text', value: 'Super Jackpot' },
            { type: 'text', value: 'Jackpot' },
            { type: 'selector', value: '.jackpot-amount' },
            { type: 'selector', value: '.jackpot-info' }
        ],
        handler: handlers.handleJackpot
    },

    // 周卡月卡
    'membership-card': {
        id: 'membership-card',
        name: '周卡月卡',
        identifiers: [
            { type: 'url', value: '/card' },
            { type: 'url', value: '/membership' },
            { type: 'text', value: 'Weekly Card' },
            { type: 'text', value: 'Monthly Card' },
            { type: 'selector', value: '.card-info' },
            { type: 'selector', value: '.membership-info' }
        ],
        handler: handlers.handleMembershipCard
    },

    // 站内信
    'notification': {
        id: 'notification',
        name: '站内信',
        identifiers: [
            { type: 'url', value: '/notification' },
            { type: 'url', value: '/message' },
            { type: 'text', value: 'Notifications' },        // 🔥 消息列表页标题
            { type: 'text', value: 'Messages Detail' },      // 🔥 消息详情页标题
            { type: 'text', value: 'Read all' },             // 🔥 "Read all" 按钮
            { type: 'selector', value: '.head-title .route-name' },  // 🔥 标题容器
            { type: 'selector', value: '.btns .readAll' },           // 🔥 "Read all" 按钮
            { type: 'selector', value: '.van-list.list-container' }, // 🔥 消息列表容器
            { type: 'selector', value: '.van-list .item' }           // 🔥 消息项
        ],
        handler: handlers.handleNotification
    },

    // 通知权限开启
    'notification-permission': {
        id: 'notification-permission',
        name: '通知权限开启',
        identifiers: [
            { type: 'text', value: 'Enable Notifications' },
            { type: 'text', value: 'Enable Now & Claim' },
            { type: 'selector', value: '.sheet-panel' },
            { type: 'selector', value: '.pushMessage' },
            { type: 'selector', value: '.received-dialog' }
        ],
        handler: handlers.handleNotificationPermission
    },

    // 充值转盘
    'deposit-wheel': {
        id: 'deposit-wheel',
        name: '充值转盘',
        identifiers: [
            { type: 'url', value: '/deposit-wheel' },
            { type: 'text', value: 'Deposit Wheel' },
            { type: 'selector', value: '.deposit-wheel' }
        ],
        handler: handlers.handleDepositWheel
    },

    // 新版返佣
    'commission': {
        id: 'commission',
        name: '新版返佣',
        identifiers: [
            { type: 'url', value: '/commission' },
            { type: 'url', value: '/rewards' },
            { type: 'text', value: 'My Rewards' },
            { type: 'text', value: 'Commission' },
            { type: 'selector', value: '.commission-info' },
            { type: 'selector', value: '.rewards-info' }
        ],
        handler: handlers.handleCommission
    },

    // 提现活动
    'withdraw': {
        id: 'withdraw',
        name: '提现活动',
        identifiers: [
            { type: 'url', value: '/withdraw' },
            { type: 'text', value: 'Withdraw' },
            { type: 'selector', value: '.withdraw-page' },
            { type: 'selector', value: '.withdraw-amount' }
        ],
        handler: handlers.handleWithdraw
    }
};

/**
 * 根据活动 ID 获取活动配置
 */
export function getActivityById(activityId) {
    return ACTIVITY_REGISTRY[activityId] || null;
}

/**
 * 获取所有活动列表
 */
export function getAllActivities() {
    return Object.values(ACTIVITY_REGISTRY);
}

/**
 * 根据当前页面状态识别活动
 * @param {Object} page - Playwright page 对象
 * @param {string} currentUrl - 当前页面 URL
 * @returns {Promise<Object|null>} 匹配到的活动配置
 */
export async function identifyActivity(page, currentUrl) {
    console.log(`      🔍 识别当前活动...`);
    console.log(`      📍 当前 URL: ${currentUrl}`);

    const activities = getAllActivities();

    for (const activity of activities) {
        // 尝试每个识别器
        for (const identifier of activity.identifiers) {
            let matched = false;

            try {
                switch (identifier.type) {
                    case 'url':
                        if (currentUrl.includes(identifier.value)) {
                            matched = true;
                            console.log(`      ✅ 通过 URL "${identifier.value}" 识别为: ${activity.name}`);
                        }
                        break;

                    case 'text':
                        const hasText = await page.getByText(identifier.value, { exact: false })
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);
                        if (hasText) {
                            matched = true;
                            console.log(`      ✅ 通过文本 "${identifier.value}" 识别为: ${activity.name}`);
                        }
                        break;

                    case 'selector':
                        const hasSelector = await page.locator(identifier.value)
                            .first()
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);
                        if (hasSelector) {
                            matched = true;
                            console.log(`      ✅ 通过选择器 "${identifier.value}" 识别为: ${activity.name}`);
                        }
                        break;

                    case 'image':
                        const hasImage = await page.locator(`img[src*="${identifier.value}"]`)
                            .first()
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);
                        if (hasImage) {
                            matched = true;
                            console.log(`      ✅ 通过图片 "${identifier.value}" 识别为: ${activity.name}`);
                        }
                        break;
                }

                if (matched) {
                    return activity;
                }

            } catch (error) {
                continue;
            }
        }
    }

    console.log(`      ❌ 未识别到任何活动`);
    return null;
}

/**
 * 执行活动处理器
 * @param {string} activityId - 活动 ID
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function executeActivity(activityId, page, test) {
    const activity = getActivityById(activityId);

    if (!activity) {
        return {
            success: false,
            error: `未找到活动: ${activityId}`
        };
    }

    if (!activity.handler || typeof activity.handler !== 'function') {
        return {
            success: false,
            error: `活动 ${activity.name} 没有处理器`
        };
    }

    try {
        const result = await activity.handler(page, test);
        return {
            ...result,
            activityId: activity.id,
            activityName: activity.name
        };
    } catch (error) {
        return {
            success: false,
            activityId: activity.id,
            activityName: activity.name,
            error: error.message
        };
    }
}

/**
 * 自动识别并执行活动
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function identifyAndExecuteActivity(page, test) {
    const currentUrl = page.url();
    const activity = await identifyActivity(page, currentUrl);

    if (!activity) {
        return {
            success: false,
            error: '未识别到活动'
        };
    }

    console.log(`      🎯 执行活动: ${activity.name}`);
    return await executeActivity(activity.id, page, test);
}

/**
 * 获取活动统计信息
 */
export function getActivityStats() {
    const activities = getAllActivities();
    return {
        total: activities.length,
        activities: activities.map(a => ({
            id: a.id,
            name: a.name,
            identifiersCount: a.identifiers.length
        }))
    };
}
