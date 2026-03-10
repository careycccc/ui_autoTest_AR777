/**
 * handleActivityClick 函数实际使用示例
 * 这个文件展示了如何在实际项目中使用 handleActivityClick 函数
 */

import { handleActivityClick } from './promo.js';

/**
 * 示例 1: 验证单个活动（最简单）
 */
export async function verifySingleActivity(page, auth, test) {
    console.log('验证单个活动...');

    // 点击第一个活动
    await handleActivityClick({
        page,
        test,
        index: 0,  // 第一个活动
        targetPage: {
            name: '活动详情页',
            waitForSelector: '.activity-detail',
            waitTime: 1000
        }
    });

    console.log('✅ 活动验证完成');
}

/**
 * 示例 2: 验证有弹窗的活动
 */
export async function verifyActivityWithPopup(page, auth, test) {
    console.log('验证带弹窗的活动...');

    await handleActivityClick({
        page,
        test,
        index: 1,  // 第二个活动
        popup: {
            containerSelector: '.popup-container',  // 弹窗容器
            clickSelector: '.confirm-btn',          // 弹窗中的确认按钮
            timeout: 3000                           // 等待弹窗 3 秒
        },
        targetPage: {
            name: '充值页',
            waitForSelector: '.recharge-page',
            waitForUrl: '/recharge',  // 也可以通过 URL 判断
            waitTime: 1000
        }
    });

    console.log('✅ 带弹窗的活动验证完成');
}

/**
 * 示例 3: 批量验证所有活动（推荐方式）
 */
export async function verifyAllPromotionActivities(page, auth, test) {
    console.log('开始批量验证所有活动...');

    // 1. 获取活动总数
    const activityCount = await page.locator('.activeList .activeItem').count();
    console.log(`📊 发现 ${activityCount} 个活动`);

    // 2. 定义每个活动的配置
    const activityConfigs = [
        // 活动 0: 每日签到
        {
            name: '每日签到',
            targetPage: {
                name: '每日签到页',
                waitForSelector: '.daily-signin',
                waitTime: 1000
            },
            popup: null  // 无弹窗
        },

        // 活动 1: 首充优惠（有弹窗）
        {
            name: '首充优惠',
            targetPage: {
                name: '充值页',
                waitForSelector: '.recharge-page',
                waitForUrl: '/recharge',
                waitTime: 1000
            },
            popup: {
                containerSelector: '.popup-container',
                clickSelector: '.confirm-btn',
                timeout: 3000
            }
        },

        // 活动 2: VIP 特权
        {
            name: 'VIP特权',
            targetPage: {
                name: 'VIP页',
                waitForSelector: '.vip-level',
                waitTime: 1000
            },
            popup: null
        },

        // 活动 3: 邀请好友
        {
            name: '邀请好友',
            targetPage: {
                name: '邀请页',
                waitForSelector: '.invite-code',
                waitTime: 1000
            },
            popup: {
                containerSelector: '.modal',
                clickSelector: '.modal-confirm',
                timeout: 2000
            }
        },

        // 活动 4: 转盘抽奖
        {
            name: '转盘抽奖',
            targetPage: {
                name: '转盘页',
                waitForSelector: '.turntable-container',
                waitForUrl: '/turntable',
                waitTime: 1500
            },
            popup: null
        },

        // 活动 5: 救援金
        {
            name: '救援金',
            targetPage: {
                name: '救援金页',
                waitForSelector: '.rescue-amount',
                waitTime: 1000
            },
            popup: {
                containerSelector: '.rescue-popup',
                clickSelector: '.claim-btn',
                timeout: 2000
            }
        }
    ];

    // 3. 遍历所有活动
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < activityCount; i++) {
        try {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📌 验证活动 ${i + 1}/${activityCount}`);

            // 获取配置（如果没有配置则使用默认）
            const config = activityConfigs[i] || {
                name: `活动-${i}`,
                targetPage: {
                    name: `活动详情页-${i}`,
                    waitForSelector: '.activity-detail, .activity-content',
                    waitTime: 1000
                },
                popup: {
                    containerSelector: '.popup-container, .modal',
                    clickSelector: '.confirm-btn, button',
                    timeout: 2000
                }
            };

            console.log(`🎯 活动名称: ${config.name}`);

            // 调用 handleActivityClick
            await handleActivityClick({
                page,
                test,
                index: i,
                targetPage: config.targetPage,
                popup: config.popup
            });

            successCount++;
            console.log(`✅ 活动 ${i + 1} 验证成功`);

        } catch (error) {
            failCount++;
            console.error(`❌ 活动 ${i + 1} 验证失败: ${error.message}`);
            // 继续处理下一个活动，不中断流程
        }
    }

    // 4. 输出统计结果
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 验证完成: 成功 ${successCount}/${activityCount}, 失败 ${failCount}/${activityCount}`);

    if (failCount > 0) {
        console.log(`⚠️ 有 ${failCount} 个活动验证失败，请查看截图`);
    }
}

/**
 * 示例 4: 验证特定的几个活动
 */
export async function verifySpecificActivities(page, auth, test) {
    console.log('验证特定的几个活动...');

    // 只验证第 0、2、4 个活动
    const indicesToVerify = [0, 2, 4];

    for (const index of indicesToVerify) {
        try {
            console.log(`\n验证活动 #${index}...`);

            await handleActivityClick({
                page,
                test,
                index,
                targetPage: {
                    name: `活动详情页-${index}`,
                    waitForSelector: '.activity-detail',
                    waitTime: 1000
                },
                popup: {
                    containerSelector: '.popup-container',
                    clickSelector: 'button',
                    timeout: 2000
                }
            });

            console.log(`✅ 活动 #${index} 验证成功`);

        } catch (error) {
            console.error(`❌ 活动 #${index} 验证失败: ${error.message}`);
        }
    }
}

/**
 * 示例 5: 自定义活动选择器
 */
export async function verifyCustomSelectorActivities(page, auth, test) {
    console.log('验证自定义选择器的活动...');

    // 如果活动元素不是默认的 '.activeList .activeItem'
    await handleActivityClick({
        page,
        test,
        index: 0,
        activitySelector: '.promo-list .promo-item',  // 自定义选择器
        targetPage: {
            name: '促销详情页',
            waitForSelector: '.promo-detail',
            waitTime: 1000
        }
    });

    console.log('✅ 自定义选择器活动验证完成');
}

/**
 * 示例 6: 带错误重试的活动验证
 */
export async function verifyActivityWithRetry(page, auth, test) {
    console.log('验证活动（带重试）...');

    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
        attempt++;
        console.log(`第 ${attempt} 次尝试...`);

        try {
            await handleActivityClick({
                page,
                test,
                index: 0,
                targetPage: {
                    name: '活动详情页',
                    waitForSelector: '.activity-detail',
                    waitTime: 1000
                }
            });

            success = true;
            console.log('✅ 验证成功');

        } catch (error) {
            console.error(`❌ 第 ${attempt} 次尝试失败: ${error.message}`);

            if (attempt < maxRetries) {
                console.log('等待 2 秒后重试...');
                await page.waitForTimeout(2000);
            } else {
                console.error('已达最大重试次数，验证失败');
                throw error;
            }
        }
    }
}

/**
 * 示例 7: 验证活动并在目标页面执行额外操作
 */
export async function verifyActivityWithExtraActions(page, auth, test) {
    console.log('验证活动并执行额外操作...');

    // 先点击进入活动页面
    await handleActivityClick({
        page,
        test,
        index: 0,
        targetPage: {
            name: '充值页',
            waitForSelector: '.recharge-page',
            waitTime: 1000
        }
    });

    // handleActivityClick 会自动返回，所以这里的代码会在返回后执行
    console.log('✅ 已返回活动列表页');

    // 如果需要在目标页面执行额外操作，需要修改 handleActivityClick
    // 或者在点击后手动处理，不使用 handleActivityClick 的自动返回功能
}

/**
 * 示例 8: 完整的测试用例
 */
export async function completeActivityTest(page, auth, test) {
    console.log('🚀 开始完整的活动测试...\n');

    // 步骤 1: 检查活动列表是否存在
    const hasActivityList = await page.locator('.activeList').isVisible();
    if (!hasActivityList) {
        throw new Error('活动列表不存在');
    }
    console.log('✅ 活动列表存在');

    // 步骤 2: 获取活动数量
    const activityCount = await page.locator('.activeList .activeItem').count();
    console.log(`📊 发现 ${activityCount} 个活动\n`);

    // 步骤 3: 验证前 5 个活动
    const maxActivitiesToTest = Math.min(activityCount, 5);

    for (let i = 0; i < maxActivitiesToTest; i++) {
        try {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`测试活动 ${i + 1}/${maxActivitiesToTest}`);

            await handleActivityClick({
                page,
                test,
                index: i,
                targetPage: {
                    name: `活动详情页-${i}`,
                    waitForSelector: '.activity-detail, .activity-content, .page-content',
                    waitTime: 1000
                },
                popup: {
                    containerSelector: '.popup-container, .modal',
                    clickSelector: '.confirm-btn, button',
                    timeout: 2000
                }
            });

            console.log(`✅ 活动 ${i + 1} 测试通过\n`);

        } catch (error) {
            console.error(`❌ 活动 ${i + 1} 测试失败: ${error.message}\n`);
        }
    }

    console.log('🎉 活动测试完成！');
}
