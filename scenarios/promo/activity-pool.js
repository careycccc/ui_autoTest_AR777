/**
 * 活动资讯 - 活动配置池
 * 定义所有可能的活动类型及其识别方式和处理逻辑
 */

/**
 * 活动配置池
 * 每个活动包含：
 * - name: 活动名称
 * - identifiers: 识别方式数组（支持多种识别方式）
 *   - type: 识别类型 (url/selector/text/image)
 *   - value: 识别值
 * - hasPopup: 是否有弹窗
 * - popupConfig: 弹窗配置（如果有弹窗）
 * - targetPageConfig: 目标页面配置
 * - handler: 自定义处理函数（可选）
 */
export const ACTIVITY_POOL = [
    // 活动 1: 每日签到
    {
        name: '每日签到',
        identifiers: [
            { type: 'url', value: '/daily' },
            { type: 'text', value: 'Daily deposit rewards' },
            { type: 'selector', value: '.daily-signin' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '每日签到页',
            waitForSelector: '.daily-signin',
            waitTime: 1000
        }
    },

    // 活动 2: 充值活动
    {
        name: '充值活动',
        identifiers: [
            { type: 'url', value: '/recharge' },
            { type: 'url', value: '/deposit' },
            { type: 'text', value: 'Deposit' },
            { type: 'selector', value: '.recharge-page' }
        ],
        hasPopup: true,
        popupConfig: {
            containerSelector: '.popup-container, .modal',
            clickSelector: '.confirm-btn, .popup-confirm, button',
            timeout: 3000
        },
        targetPageConfig: {
            name: '充值页',
            waitForSelector: '.recharge-page, .deposit-page',
            waitTime: 1000
        }
    },

    // 活动 3: VIP 特权
    {
        name: 'VIP特权',
        identifiers: [
            { type: 'url', value: '/vip' },
            { type: 'text', value: 'VIP' },
            { type: 'selector', value: '.vip-level' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: 'VIP页',
            waitForSelector: '.vip-level, .vip-benefits',
            waitTime: 1000
        }
    },

    // 活动 4: 邀请好友
    {
        name: '邀请好友',
        identifiers: [
            { type: 'url', value: '/invite' },
            { type: 'text', value: 'Invite' },
            { type: 'text', value: 'Invitation' },
            { type: 'selector', value: '.invite-code' }
        ],
        hasPopup: true,
        popupConfig: {
            containerSelector: '.modal, .popup-container',
            clickSelector: '.modal-confirm, button',
            timeout: 2000
        },
        targetPageConfig: {
            name: '邀请页',
            waitForSelector: '.invite-code, .invitation-link',
            waitTime: 1000
        }
    },

    // 活动 5: 转盘抽奖
    {
        name: '转盘抽奖',
        identifiers: [
            { type: 'url', value: '/turntable' },
            { type: 'url', value: '/wheel' },
            { type: 'text', value: 'Turntable' },
            { type: 'text', value: 'Wheel' },
            { type: 'selector', value: '.turntable-container' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '转盘页',
            waitForSelector: '.turntable-container, .wheel-container',
            waitTime: 1500
        }
    },

    // 活动 6: 救援金
    {
        name: '救援金',
        identifiers: [
            { type: 'url', value: '/rescue' },
            { type: 'text', value: 'Rescue' },
            { type: 'text', value: 'Loss Rebate' },
            { type: 'selector', value: '.rescue-amount' }
        ],
        hasPopup: true,
        popupConfig: {
            containerSelector: '.rescue-popup, .modal',
            clickSelector: '.claim-btn, button',
            timeout: 2000
        },
        targetPageConfig: {
            name: '救援金页',
            waitForSelector: '.rescue-amount, .rescue-info',
            waitTime: 1000
        }
    },

    // 活动 7: 优惠券
    {
        name: '优惠券',
        identifiers: [
            { type: 'url', value: '/coupon' },
            { type: 'text', value: 'Coupon' },
            { type: 'selector', value: '.coupon-list' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '优惠券页',
            waitForSelector: '.coupon-list, .coupon-item',
            waitTime: 1000
        }
    },

    // 活动 8: 返水活动
    {
        name: '返水活动',
        identifiers: [
            { type: 'url', value: '/rebate' },
            { type: 'text', value: 'Rebate' },
            { type: 'selector', value: '.rebate-amount' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '返水页',
            waitForSelector: '.rebate-amount, .rebate-info',
            waitTime: 1000
        }
    },

    // 活动 9: 任务中心
    {
        name: '任务中心',
        identifiers: [
            { type: 'url', value: '/task' },
            { type: 'text', value: 'Task' },
            { type: 'text', value: 'Mission' },
            { type: 'selector', value: '.task-list' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '任务页',
            waitForSelector: '.task-list, .task-item',
            waitTime: 1000
        }
    },

    // 活动 10: 锦标赛
    {
        name: '锦标赛',
        identifiers: [
            { type: 'url', value: '/championship' },
            { type: 'url', value: '/tournament' },
            { type: 'text', value: 'Championship' },
            { type: 'text', value: 'Tournament' },
            { type: 'selector', value: '.championship-info' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '锦标赛页',
            waitForSelector: '.championship-info, .tournament-info',
            waitTime: 1000
        }
    },

    // 活动 11: 超级大奖
    {
        name: '超级大奖',
        identifiers: [
            { type: 'url', value: '/jackpot' },
            { type: 'text', value: 'Super Jackpot' },
            { type: 'text', value: 'Jackpot' },
            { type: 'selector', value: '.jackpot-amount' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '超级大奖页',
            waitForSelector: '.jackpot-amount, .jackpot-info',
            waitTime: 1000
        }
    },

    // 活动 12: 周卡月卡
    {
        name: '周卡月卡',
        identifiers: [
            { type: 'url', value: '/card' },
            { type: 'url', value: '/membership' },
            { type: 'text', value: 'Weekly Card' },
            { type: 'text', value: 'Monthly Card' },
            { type: 'selector', value: '.card-info' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '周卡月卡页',
            waitForSelector: '.card-info, .membership-info',
            waitTime: 1000
        }
    },

    // 活动 13: 站内信
    {
        name: '站内信',
        identifiers: [
            { type: 'url', value: '/notification' },
            { type: 'url', value: '/message' },
            { type: 'text', value: 'Notification' },
            { type: 'text', value: 'Message' },
            { type: 'selector', value: '.notification-list' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '站内信页',
            waitForSelector: '.notification-list, .message-list',
            waitTime: 1000
        }
    },

    // 活动 14: 充值转盘
    {
        name: '充值转盘',
        identifiers: [
            { type: 'url', value: '/deposit-wheel' },
            { type: 'text', value: 'Deposit Wheel' },
            { type: 'selector', value: '.deposit-wheel' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '充值转盘页',
            waitForSelector: '.deposit-wheel, .wheel-container',
            waitTime: 1000
        }
    },

    // 活动 15: 新版返佣
    {
        name: '新版返佣',
        identifiers: [
            { type: 'url', value: '/commission' },
            { type: 'url', value: '/rewards' },
            { type: 'text', value: 'My Rewards' },
            { type: 'text', value: 'Commission' },
            { type: 'selector', value: '.commission-info' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '返佣页',
            waitForSelector: '.commission-info, .rewards-info',
            waitTime: 1000
        }
    },

    // 活动 16: 提现活动
    {
        name: '提现活动',
        identifiers: [
            { type: 'url', value: '/withdraw' },
            { type: 'text', value: 'Withdraw' },
            { type: 'selector', value: '.withdraw-page' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '提现页',
            waitForSelector: '.withdraw-page, .withdraw-amount',
            waitTime: 1000
        }
    }
];

/**
 * 根据当前页面状态匹配活动配置
 * @param {Object} page - Playwright page 对象
 * @param {string} currentUrl - 当前页面 URL
 * @returns {Promise<Object|null>} 匹配到的活动配置，未匹配返回 null
 */
export async function matchActivity(page, currentUrl) {
    console.log(`      🔍 开始匹配活动...`);
    console.log(`      📍 当前 URL: ${currentUrl}`);

    for (const activity of ACTIVITY_POOL) {
        // 尝试每个识别器
        for (const identifier of activity.identifiers) {
            let matched = false;

            try {
                switch (identifier.type) {
                    case 'url':
                        // URL 匹配
                        if (currentUrl.includes(identifier.value)) {
                            matched = true;
                            console.log(`      ✅ 通过 URL "${identifier.value}" 匹配到活动: ${activity.name}`);
                        }
                        break;

                    case 'text':
                        // 文本匹配
                        const hasText = await page.getByText(identifier.value, { exact: false })
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);
                        if (hasText) {
                            matched = true;
                            console.log(`      ✅ 通过文本 "${identifier.value}" 匹配到活动: ${activity.name}`);
                        }
                        break;

                    case 'selector':
                        // 选择器匹配
                        const hasSelector = await page.locator(identifier.value)
                            .first()
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);
                        if (hasSelector) {
                            matched = true;
                            console.log(`      ✅ 通过选择器 "${identifier.value}" 匹配到活动: ${activity.name}`);
                        }
                        break;

                    case 'image':
                        // 图片匹配（通过 src 属性）
                        const hasImage = await page.locator(`img[src*="${identifier.value}"]`)
                            .first()
                            .isVisible({ timeout: 2000 })
                            .catch(() => false);
                        if (hasImage) {
                            matched = true;
                            console.log(`      ✅ 通过图片 "${identifier.value}" 匹配到活动: ${activity.name}`);
                        }
                        break;
                }

                if (matched) {
                    return activity;
                }

            } catch (error) {
                // 继续尝试下一个识别器
                continue;
            }
        }
    }

    console.log(`      ❌ 未匹配到任何活动`);
    return null;
}

/**
 * 获取活动配置池的统计信息
 */
export function getActivityPoolStats() {
    return {
        total: ACTIVITY_POOL.length,
        withPopup: ACTIVITY_POOL.filter(a => a.hasPopup).length,
        withoutPopup: ACTIVITY_POOL.filter(a => !a.hasPopup).length,
        activities: ACTIVITY_POOL.map(a => a.name)
    };
}
