/**
 * 活动验证映射配置
 * 用于验证跳转后的页面是否正确，不执行活动逻辑
 */

/**
 * 活动验证映射表
 * key: 按钮文本关键词（支持正则匹配）
 * value: 验证配置
 */
export const ACTIVITY_VALIDATION_MAP = {
    // 每日签到
    '每日签到|Daily|Sign': {
        activityName: '每日签到',
        validation: {
            type: 'element',
            selector: '.daily-name',
            expectedText: 'Daily deposit rewards'
        },
        route: '/daily'
    },

    // 超级大奖
    '超级大奖|Jackpot|Super Jackpot': {
        activityName: '超级大奖',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'Super Jackpot'
        },
        route: '/superJackpot'
    },

    // 邀请转盘（父用例，有3个界面）
    '邀请|转盘|Invite|Turntable': {
        activityName: '邀请转盘',
        validation: {
            type: 'route',
            expectedRoute: '/turntable'
        },
        route: '/turntable'
    },

    // 站内信
    '站内信|通知|Notification|Message': {
        activityName: '站内信',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'Notifications'
        },
        route: '/notifications/index'
    },

    // 我的
    '我的|Mine|Profile|UID': {
        activityName: '我的',
        validation: {
            type: 'element',
            selector: '.mine-header--name',
            expectedText: 'UID'
        },
        route: '/main'
    },

    // 锦标赛
    '锦标赛|Championship': {
        activityName: '锦标赛',
        validation: {
            type: 'element',
            selector: '.activity-name',
            expectedText: 'Championship'
        },
        route: '/championship'
    },

    // VIP
    'VIP': {
        activityName: 'VIP',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'VIP'
        },
        route: '/vip/index'
    },

    // 充值转盘
    '充值转盘|Deposit Wheel': {
        activityName: '充值转盘',
        validation: {
            type: 'element',
            selector: '.title',
            expectedText: 'Deposit Wheel'
        },
        route: '/rechargeTurntable'
    },

    // 排行榜
    '排行榜|Ranking|Leaderboard': {
        activityName: '排行榜',
        validation: {
            type: 'multi',
            selectors: [
                { selector: '.tab-list .tab-item', expectedText: 'Daily' },
                { selector: '.tab-list .tab-item', expectedText: 'Weekly' },
                { selector: '.tab-list .tab-item', expectedText: 'Monthly' }
            ]
        },
        route: '/ranking'
    },

    // 周卡月卡
    '周卡|月卡|会员卡|Membership|Card': {
        activityName: '周卡月卡',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'Promotions'
        },
        route: '/activity'
    },

    // 每日每周任务
    '每日|每周|任务|Task|Daily|Weekly': {
        activityName: '每日每周任务',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'Tasks'
        },
        route: '/activity/dayWeekTask'
    },

    // 亏损救援金
    '亏损|救援|Rescue|Loss|Rebate': {
        activityName: '亏损救援金',
        validation: {
            type: 'element',
            selector: '.loss-rebate-header',
            expectedText: 'Loss Rebate'
        },
        route: '/rescue'
    },

    // 礼品码
    '礼品码|Gift|Reward|Redemption': {
        activityName: '礼品码',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'Reward Redemption Code'
        },
        route: '/gift'
    },

    // 洗码
    '洗码|Rebate': {
        activityName: '洗码',
        validation: {
            type: 'title',
            selector: '.route-name',
            expectedText: 'Rebate'
        },
        route: '/rebate'
    },

    // 新版返佣
    '返佣|佣金|Commission|Rewards': {
        activityName: '新版返佣',
        validation: {
            type: 'element',
            selector: 'span',
            expectedText: 'My Rewards'
        },
        route: '/earn'
    },

    // 优惠券
    '优惠券|Coupon|Ticket': {
        activityName: '优惠券',
        validation: {
            type: 'element',
            selector: '.ticket-wrapper-font',
            expectedText: 'Coupons'
        },
        route: '/ticket'
    },

    // 提现
    '提现|Withdraw': {
        activityName: '提现',
        validation: {
            type: 'route',
            expectedRoute: '/wallet/withdraw'
        },
        route: '/wallet/withdraw'
    },

    // 充值
    '充值|Deposit|Recharge': {
        activityName: '充值',
        validation: {
            type: 'multi-option',  // 多选一验证
            options: [
                {
                    type: 'element',
                    selector: '.dialogTitle',
                    expectedText: 'Deposit Tutorial Video'
                },
                {
                    type: 'title',
                    selector: '.route-name',
                    expectedText: 'Deposit'
                }
            ]
        },
        route: '/wallet/recharge'
    }
};

/**
 * 根据按钮文本查找验证配置
 * @param {string} buttonText - 按钮文本
 * @returns {Object|null} 验证配置
 */
export function findValidationConfig(buttonText) {
    for (const [pattern, config] of Object.entries(ACTIVITY_VALIDATION_MAP)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(buttonText)) {
            return config;
        }
    }
    return null;
}

/**
 * 验证页面是否匹配预期
 * @param {Object} page - Playwright page 对象
 * @param {Object} validationConfig - 验证配置
 * @returns {Promise<Object>} 验证结果
 */
export async function validateActivityPage(page, validationConfig) {
    console.log(`      🔍 验证页面: ${validationConfig.activityName}`);

    try {
        const { type } = validationConfig.validation;

        // 🔥 首先检查是否跳转失败回到首页
        const currentUrl = page.url();
        const isHomePage = await checkIfHomePage(page, currentUrl);

        if (isHomePage) {
            console.log(`      ⚠️ 检测到跳转失败，已回到首页`);
            return {
                success: false,
                activityName: validationConfig.activityName,
                validationType: 'jump-failed',
                reason: '跳转失败，回到首页',
                needScreenshot: true,
                needReturnToActivity: true
            };
        }

        // 类型1: 路由验证（宽松模式，包含即可）
        if (type === 'route') {
            const { expectedRoute } = validationConfig.validation;

            console.log(`      📍 当前 URL: ${currentUrl}`);
            console.log(`      📍 期望包含路由: ${expectedRoute}`);

            if (currentUrl.includes(expectedRoute)) {
                console.log(`      ✅ 路由验证成功: ${validationConfig.activityName}`);
                return {
                    success: true,
                    activityName: validationConfig.activityName,
                    validationType: 'route',
                    actualUrl: currentUrl,
                    expectedRoute: expectedRoute
                };
            } else {
                console.log(`      ❌ 路由验证失败: URL 不包含期望路由`);
                return {
                    success: false,
                    activityName: validationConfig.activityName,
                    validationType: 'route',
                    actualUrl: currentUrl,
                    expectedRoute: expectedRoute,
                    reason: 'URL不包含期望路由'
                };
            }
        }

        // 类型2: 标题验证
        if (type === 'title') {
            const { selector, expectedText } = validationConfig.validation;
            const titleElement = page.locator(selector);
            const titleText = await titleElement.textContent({ timeout: 3000 }).catch(() => '');

            console.log(`      📋 页面标题: "${titleText.trim()}"`);
            console.log(`      📋 期望包含: "${expectedText}"`);

            if (titleText.includes(expectedText)) {
                console.log(`      ✅ 标题验证成功: ${validationConfig.activityName}`);
                return {
                    success: true,
                    activityName: validationConfig.activityName,
                    validationType: 'title',
                    actualTitle: titleText.trim(),
                    expectedTitle: expectedText
                };
            } else {
                console.log(`      ❌ 标题验证失败: 标题不匹配`);
                return {
                    success: false,
                    activityName: validationConfig.activityName,
                    validationType: 'title',
                    actualTitle: titleText.trim(),
                    expectedTitle: expectedText,
                    reason: '标题不匹配'
                };
            }
        }

        // 类型3: 元素验证
        if (type === 'element') {
            const { selector, expectedText } = validationConfig.validation;
            const element = page.locator(selector);
            const elementText = await element.textContent({ timeout: 3000 }).catch(() => '');

            console.log(`      📋 元素内容: "${elementText.trim()}"`);
            console.log(`      📋 期望包含: "${expectedText}"`);

            if (elementText.includes(expectedText)) {
                console.log(`      ✅ 元素验证成功: ${validationConfig.activityName}`);
                return {
                    success: true,
                    activityName: validationConfig.activityName,
                    validationType: 'element',
                    actualText: elementText.trim(),
                    expectedText: expectedText
                };
            } else {
                console.log(`      ❌ 元素验证失败: 元素内容不匹配`);
                return {
                    success: false,
                    activityName: validationConfig.activityName,
                    validationType: 'element',
                    actualText: elementText.trim(),
                    expectedText: expectedText,
                    reason: '元素内容不匹配'
                };
            }
        }

        // 类型4: 多元素验证（如排行榜的三个tab）
        if (type === 'multi') {
            const { selectors } = validationConfig.validation;
            const results = [];

            for (const { selector, expectedText } of selectors) {
                const elements = page.locator(selector);
                const count = await elements.count();
                let found = false;

                for (let i = 0; i < count; i++) {
                    const text = await elements.nth(i).textContent().catch(() => '');
                    if (text.includes(expectedText)) {
                        found = true;
                        console.log(`      ✅ 找到元素: "${expectedText}"`);
                        break;
                    }
                }

                results.push({
                    expectedText: expectedText,
                    found: found
                });

                if (!found) {
                    console.log(`      ❌ 未找到元素: "${expectedText}"`);
                }
            }

            const allFound = results.every(r => r.found);

            if (allFound) {
                console.log(`      ✅ 多元素验证成功: ${validationConfig.activityName}`);
                return {
                    success: true,
                    activityName: validationConfig.activityName,
                    validationType: 'multi',
                    results: results
                };
            } else {
                console.log(`      ❌ 多元素验证失败: 部分元素未找到`);
                return {
                    success: false,
                    activityName: validationConfig.activityName,
                    validationType: 'multi',
                    results: results,
                    reason: '部分元素未找到'
                };
            }
        }

        // 🔥 类型5: 多选一验证（如充值的弹窗或页面标题）
        if (type === 'multi-option') {
            const { options } = validationConfig.validation;
            console.log(`      🔍 多选一验证（${options.length} 个选项）`);

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                console.log(`      🔍 尝试选项 ${i + 1}: ${option.type}`);

                if (option.type === 'element') {
                    const element = page.locator(option.selector);
                    const elementText = await element.textContent({ timeout: 2000 }).catch(() => '');

                    console.log(`      📋 元素内容: "${elementText.trim()}"`);
                    console.log(`      📋 期望包含: "${option.expectedText}"`);

                    if (elementText.includes(option.expectedText)) {
                        console.log(`      ✅ 选项 ${i + 1} 验证成功: ${validationConfig.activityName}`);
                        return {
                            success: true,
                            activityName: validationConfig.activityName,
                            validationType: 'multi-option',
                            matchedOption: i + 1,
                            actualText: elementText.trim(),
                            expectedText: option.expectedText
                        };
                    }
                } else if (option.type === 'title') {
                    const titleElement = page.locator(option.selector);
                    const titleText = await titleElement.textContent({ timeout: 2000 }).catch(() => '');

                    console.log(`      📋 标题内容: "${titleText.trim()}"`);
                    console.log(`      📋 期望包含: "${option.expectedText}"`);

                    if (titleText.includes(option.expectedText)) {
                        console.log(`      ✅ 选项 ${i + 1} 验证成功: ${validationConfig.activityName}`);
                        return {
                            success: true,
                            activityName: validationConfig.activityName,
                            validationType: 'multi-option',
                            matchedOption: i + 1,
                            actualTitle: titleText.trim(),
                            expectedTitle: option.expectedText
                        };
                    }
                }

                console.log(`      ℹ️ 选项 ${i + 1} 不匹配，尝试下一个...`);
            }

            console.log(`      ❌ 多选一验证失败: 所有选项都不匹配`);
            return {
                success: false,
                activityName: validationConfig.activityName,
                validationType: 'multi-option',
                reason: '所有选项都不匹配'
            };
        }

        return {
            success: false,
            reason: '未知的验证类型'
        };

    } catch (error) {
        console.log(`      ❌ 页面验证失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 🔥 检查是否在首页
 * @param {Object} page - Playwright page 对象
 * @param {string} currentUrl - 当前 URL
 * @returns {Promise<boolean>} 是否在首页
 */
async function checkIfHomePage(page, currentUrl) {
    // 检查 URL 是否是首页
    const isHomeUrl = currentUrl.endsWith('/') ||
        currentUrl.includes('/home') ||
        currentUrl.includes('/main') ||
        currentUrl.split('/').filter(s => s).length <= 3;

    if (!isHomeUrl) {
        return false;
    }

    // 进一步验证是否有首页特征元素
    const homeIndicators = [
        '.home-container',
        '.home-page',
        '.tabbar',
        '.bottom-nav',
        '[class*="home"]'
    ];

    for (const selector of homeIndicators) {
        const hasElement = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false);
        if (hasElement) {
            return true;
        }
    }

    return isHomeUrl;
}

