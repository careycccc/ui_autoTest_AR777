/**
 * 活动处理器 - 定义每个活动的具体处理逻辑
 * 这些处理器可以在项目的任何地方复用
 */

/**
 * 每日签到活动处理器
 */
export async function handleDailySignIn(page, test) {
    console.log('      🎯 处理每日签到活动...');

    try {
        // 检查是否在每日签到页面
        const isOnPage = await page.locator('.daily-signin, .daily-deposit').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在每日签到页面' };
        }

        // 这里添加每日签到的具体处理逻辑
        // 例如：检查签到状态、点击签到按钮等
        console.log('      ✅ 每日签到页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '每日签到' };

    } catch (error) {
        console.log(`      ❌ 每日签到处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 充值活动处理器
 */
export async function handleRecharge(page, test) {
    console.log('      🎯 处理充值活动...');

    try {
        const isOnPage = await page.locator('.recharge-page, .deposit-page').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在充值页面' };
        }

        // 充值页面的具体处理逻辑
        console.log('      ✅ 充值页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '充值活动' };

    } catch (error) {
        console.log(`      ❌ 充值活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * VIP 特权活动处理器
 */
export async function handleVIP(page, test) {
    console.log('      🎯 处理 VIP 特权活动...');

    try {
        const isOnPage = await page.locator('.vip-level, .vip-benefits').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在 VIP 页面' };
        }

        console.log('      ✅ VIP 页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: 'VIP特权' };

    } catch (error) {
        console.log(`      ❌ VIP 活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 邀请好友活动处理器
 */
export async function handleInvite(page, test) {
    console.log('      🎯 处理邀请好友活动...');

    try {
        const isOnPage = await page.locator('.invite-code, .invitation-link').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在邀请页面' };
        }

        console.log('      ✅ 邀请页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '邀请好友' };

    } catch (error) {
        console.log(`      ❌ 邀请活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 转盘抽奖活动处理器
 */
export async function handleTurntable(page, test) {
    console.log('      🎯 处理转盘抽奖活动...');

    try {
        const isOnPage = await page.locator('.turntable-container, .wheel-container').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在转盘页面' };
        }

        console.log('      ✅ 转盘页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '转盘抽奖' };

    } catch (error) {
        console.log(`      ❌ 转盘活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 救援金活动处理器
 */
export async function handleRescue(page, test) {
    console.log('      🎯 处理救援金活动...');

    try {
        const isOnPage = await page.locator('.rescue-amount, .rescue-info').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在救援金页面' };
        }

        console.log('      ✅ 救援金页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '救援金' };

    } catch (error) {
        console.log(`      ❌ 救援金活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 优惠券活动处理器
 */
export async function handleCoupon(page, test) {
    console.log('      🎯 处理优惠券活动...');

    try {
        const isOnPage = await page.locator('.coupon-list, .coupon-item').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在优惠券页面' };
        }

        console.log('      ✅ 优惠券页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '优惠券' };

    } catch (error) {
        console.log(`      ❌ 优惠券活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 返水活动处理器
 */
export async function handleRebate(page, test) {
    console.log('      🎯 处理返水活动...');

    try {
        const isOnPage = await page.locator('.rebate-amount, .rebate-info').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在返水页面' };
        }

        console.log('      ✅ 返水页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '返水活动' };

    } catch (error) {
        console.log(`      ❌ 返水活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 任务中心活动处理器
 */
export async function handleTask(page, test) {
    console.log('      🎯 处理任务中心活动...');

    try {
        const isOnPage = await page.locator('.task-list, .task-item').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在任务页面' };
        }

        console.log('      ✅ 任务页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '任务中心' };

    } catch (error) {
        console.log(`      ❌ 任务活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 锦标赛活动处理器
 */
export async function handleChampionship(page, test) {
    console.log('      🎯 处理锦标赛活动...');

    try {
        const isOnPage = await page.locator('.championship-info, .tournament-info').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在锦标赛页面' };
        }

        console.log('      ✅ 锦标赛页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '锦标赛' };

    } catch (error) {
        console.log(`      ❌ 锦标赛活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 超级大奖活动处理器
 */
export async function handleJackpot(page, test) {
    console.log('      🎯 处理超级大奖活动...');

    try {
        const isOnPage = await page.locator('.jackpot-amount, .jackpot-info').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在超级大奖页面' };
        }

        console.log('      ✅ 超级大奖页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '超级大奖' };

    } catch (error) {
        console.log(`      ❌ 超级大奖活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 周卡月卡活动处理器
 */
export async function handleMembershipCard(page, test) {
    console.log('      🎯 处理周卡月卡活动...');

    try {
        const isOnPage = await page.locator('.card-info, .membership-info').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在周卡月卡页面' };
        }

        console.log('      ✅ 周卡月卡页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '周卡月卡' };

    } catch (error) {
        console.log(`      ❌ 周卡月卡活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 站内信活动处理器
 */
export async function handleNotification(page, test) {
    console.log('      🎯 处理站内信活动...');

    try {
        // 🔥 检查是否在站内信页面（通过标题 "Notifications"）
        const hasTitle = await page.locator('.head-title .route-name')
            .filter({ hasText: 'Notifications' })
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!hasTitle) {
            return { success: false, reason: '不在站内信页面（未找到 Notifications 标题）' };
        }

        console.log('      ✅ 确认在站内信页面');

        // 🔥 检查 "Read all" 按钮是否存在
        const readAllBtn = page.locator('.btns .readAll').filter({ hasText: 'Read all' });
        const hasReadAllBtn = await readAllBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasReadAllBtn) {
            console.log('      📬 发现 "Read all" 按钮');
        } else {
            console.log('      ℹ️ 未发现 "Read all" 按钮（可能没有未读消息）');
        }

        // 🔥 检查消息列表容器是否存在
        const listContainer = page.locator('.van-list.list-container');
        const hasListContainer = await listContainer.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasListContainer) {
            console.log('      ℹ️ 未发现消息列表容器');
            console.log('      ✅ 站内信页面验证完成（无消息）');
            await page.waitForTimeout(1000);
            return { success: true, activityName: '站内信' };
        }

        // 🔥 检查是否有消息项并记录初始数量
        const messageItems = listContainer.locator('.item');
        const initialMessageCount = await messageItems.count();

        if (initialMessageCount === 0) {
            console.log('      ℹ️ 消息列表为空（没有消息）');
            console.log('      ✅ 站内信页面验证完成（无消息）');
            await page.waitForTimeout(1000);
            return { success: true, activityName: '站内信' };
        }

        console.log(`      📨 发现 ${initialMessageCount} 条消息`);

        // 🔥 点击第一条消息
        console.log('      👆 点击第一条消息...');
        const firstMessage = messageItems.first();
        await firstMessage.click();
        await page.waitForTimeout(1000);

        // 🔥 验证是否进入消息详情页（通过标题 "Messages Detail"）
        const detailTitle = page.locator('.head-title .route-name')
            .filter({ hasText: 'Messages Detail' });
        const hasDetailTitle = await detailTitle.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasDetailTitle) {
            console.log('      ❌ 未进入消息详情页（未找到 Messages Detail 标题）');
            await test.captureScreenshot('notification-detail-failed');
            return { success: false, reason: '未能进入消息详情页' };
        }

        console.log('      ✅ 成功进入消息详情页');
        await page.waitForTimeout(1000);

        // 🔥 处理奖励领取区域
        const rewardResult = await handleRewardClaims(page, test);

        // 🔥 处理消息操作按钮区域（跳转活动）
        const activityResult = await handleMessageActions(page, test);

        // 🔥 智能返回到消息详情页
        console.log('      ↩️ 智能返回到消息详情页...');
        const returnToDetailResult = await smartReturnToPage(page, 'Messages Detail');

        if (!returnToDetailResult.success) {
            console.log('      ⚠️ 返回消息详情页失败');
        }

        // 🔥 处理删除消息逻辑
        const deleteResult = await handleDeleteMessage(page, test, rewardResult.claimedCount);

        // 🔥 验证删除后的消息数量
        if (deleteResult.success && deleteResult.deleted) {
            console.log('      📊 验证删除后的消息数量...');

            // 等待页面稳定
            await page.waitForTimeout(1500);

            // 检查是否在消息列表页
            const backToList = await page.locator('.head-title .route-name')
                .filter({ hasText: 'Notifications' })
                .isVisible({ timeout: 3000 })
                .catch(() => false);

            if (backToList) {
                // 重新获取消息数量
                const currentMessageItems = page.locator('.van-list.list-container .item');
                const currentMessageCount = await currentMessageItems.count();

                console.log(`      📊 删除前消息数: ${initialMessageCount}`);
                console.log(`      📊 删除后消息数: ${currentMessageCount}`);

                if (currentMessageCount === initialMessageCount - 1) {
                    console.log('      ✅ 消息数量验证成功（减少了1条）');
                } else {
                    console.log(`      ⚠️ 消息数量验证异常（预期: ${initialMessageCount - 1}, 实际: ${currentMessageCount}）`);
                }
            }
        }

        console.log('      ✅ 站内信页面验证完成');

        await page.waitForTimeout(500);

        return {
            success: true,
            activityName: '站内信',
            initialMessageCount: initialMessageCount,
            rewardResult: rewardResult,
            activityResult: activityResult,
            deleteResult: deleteResult
        };

    } catch (error) {
        console.log(`      ❌ 站内信活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 🔥 处理奖励领取区域（站内信辅助方法）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 返回领取结果
 */
async function handleRewardClaims(page, test) {
    console.log('      🎁 检查奖励领取区域...');

    let claimedCount = 0;

    // 查找所有奖励区域 (.wa)
    const rewardAreas = page.locator('.wa');
    const rewardCount = await rewardAreas.count();

    if (rewardCount === 0) {
        console.log('      ℹ️ 未发现奖励区域 (.wa)');
        return { success: true, claimedCount: 0 };
    }

    console.log(`      🎁 发现 ${rewardCount} 个奖励区域`);

    // 处理每个奖励区域
    for (let i = 0; i < rewardCount; i++) {
        const rewardArea = rewardAreas.nth(i);

        // 检查奖励类型和状态
        const titleElement = rewardArea.locator('.t1');
        const statusElement = rewardArea.locator('.t2');

        const title = await titleElement.textContent().catch(() => '');
        const status = await statusElement.textContent().catch(() => '');

        console.log(`      🎁 奖励 ${i + 1}: ${title} - ${status}`);

        // 🔥 检查是否有 Free Reward Available 的组合
        if (title.includes('Free Reward') && status.includes('Available')) {
            console.log(`      ✨ 发现免费奖励可领取 (奖励 ${i + 1})`);
        }

        // 检查是否有 Claim 按钮
        const claimBtn = rewardArea.locator('.claim');
        const hasClaimBtn = await claimBtn.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasClaimBtn) {
            const claimBtnText = await claimBtn.textContent().catch(() => '');
            console.log(`      👆 点击 Claim 按钮 (奖励 ${i + 1}): "${claimBtnText.trim()}"...`);
            await claimBtn.click();
            await page.waitForTimeout(1500);
            console.log(`      ✅ 已领取奖励 ${i + 1}`);
            claimedCount++;
        } else {
            console.log(`      ℹ️ 奖励 ${i + 1} 无 Claim 按钮（可能已领取或不可领取）`);
        }
    }

    console.log(`      ✅ 奖励领取区域处理完成（共领取 ${claimedCount} 个奖励）`);

    return {
        success: true,
        totalRewards: rewardCount,
        claimedCount: claimedCount
    };
}

/**
 * 🔥 处理消息操作按钮区域（站内信辅助方法）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 活动处理结果
 */
async function handleMessageActions(page, test) {
    console.log('      🔘 检查消息操作按钮区域...');

    // 查找消息操作区域 (.message-actions .btns)
    const messageActions = page.locator('.message-actions .btns');
    const hasMessageActions = await messageActions.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasMessageActions) {
        console.log('      ℹ️ 未发现消息操作按钮区域 (.message-actions .btns)');
        return { success: true, reason: '无消息操作按钮' };
    }

    // 查找所有按钮（包括 .delRead 和 .readAll）
    const buttons = messageActions.locator('div');
    const buttonCount = await buttons.count();

    if (buttonCount === 0) {
        console.log('      ℹ️ 消息操作区域无按钮');
        return { success: true, reason: '无操作按钮' };
    }

    console.log(`      🔘 发现 ${buttonCount} 个操作按钮`);

    // 获取所有按钮的文本和类名
    const buttonInfo = [];
    for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const buttonText = await button.textContent().catch(() => '');
        const buttonClass = await button.getAttribute('class').catch(() => '');
        buttonInfo.push({
            index: i,
            text: buttonText.trim(),
            className: buttonClass
        });
        console.log(`      🔘 按钮 ${i + 1}: "${buttonText.trim()}" (class: ${buttonClass})`);
    }

    // 🔥 点击第二个按钮（如果存在）
    if (buttonCount >= 2) {
        const secondButton = buttons.nth(1);
        const secondButtonInfo = buttonInfo[1];

        console.log(`      👆 点击第二个按钮: "${secondButtonInfo.text}" (${secondButtonInfo.className})...`);

        // 记录点击前的 URL
        const beforeUrl = page.url();
        console.log(`      📍 点击前 URL: ${beforeUrl}`);

        await secondButton.click();
        await page.waitForTimeout(2000);

        // 记录点击后的 URL
        const afterUrl = page.url();
        console.log(`      📍 点击后 URL: ${afterUrl}`);

        // 检查是否发生了页面跳转
        if (afterUrl !== beforeUrl) {
            console.log(`      🔄 检测到页面跳转，使用智能识别处理活动...`);

            // 🔥 使用智能活动识别系统
            const { identifyAndExecuteActivity } = await import('./activity-registry.js');
            const activityResult = await identifyAndExecuteActivity(page, test);

            if (activityResult.success) {
                console.log(`      ✅ 智能识别并处理了活动: ${activityResult.activityName || '未知活动'}`);

                // 返回消息详情页
                console.log('      ↩️ 返回消息详情页...');
                await page.goBack();
                await page.waitForTimeout(1500);

                // 验证是否返回成功
                const backToDetail = await page.locator('.head-title .route-name')
                    .filter({ hasText: 'Messages Detail' })
                    .isVisible({ timeout: 3000 })
                    .catch(() => false);

                if (backToDetail) {
                    console.log('      ✅ 已返回消息详情页');
                } else {
                    console.log('      ⚠️ 返回消息详情页失败，尝试再次返回...');
                    await page.goBack();
                    await page.waitForTimeout(1000);
                }

                return {
                    success: true,
                    activityName: activityResult.activityName || '未知活动',
                    activityId: activityResult.activityId,
                    buttonText: secondButtonInfo.text,
                    jumpedActivity: true
                };
            } else {
                console.log(`      ❌ 智能识别活动失败: ${activityResult.error}`);
                await test.captureScreenshot('notification-activity-failed');

                // 尝试返回
                console.log('      ↩️ 尝试返回消息详情页...');
                await page.goBack();
                await page.waitForTimeout(1500);

                return {
                    success: false,
                    error: `活动处理失败: ${activityResult.error}`,
                    buttonText: secondButtonInfo.text,
                    jumpedActivity: true
                };
            }
        } else {
            console.log('      ℹ️ 点击按钮后未发生页面跳转（可能是弹窗或其他交互）');
            return {
                success: true,
                reason: '按钮点击未跳转',
                buttonText: secondButtonInfo.text,
                jumpedActivity: false
            };
        }
    } else {
        console.log('      ℹ️ 只有一个按钮，跳过第二个按钮的处理');
        return {
            success: true,
            reason: '只有一个按钮',
            buttonCount: buttonCount,
            buttons: buttonInfo
        };
    }
}

/**
 * 充值转盘活动处理器
 */
export async function handleDepositWheel(page, test) {
    console.log('      🎯 处理充值转盘活动...');

    try {
        const isOnPage = await page.locator('.deposit-wheel, .wheel-container').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在充值转盘页面' };
        }

        console.log('      ✅ 充值转盘页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '充值转盘' };

    } catch (error) {
        console.log(`      ❌ 充值转盘活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 新版返佣活动处理器
 */
export async function handleCommission(page, test) {
    console.log('      🎯 处理新版返佣活动...');

    try {
        const isOnPage = await page.locator('.commission-info, .rewards-info').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在返佣页面' };
        }

        console.log('      ✅ 返佣页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '新版返佣' };

    } catch (error) {
        console.log(`      ❌ 返佣活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 提现活动处理器
 */
export async function handleWithdraw(page, test) {
    console.log('      🎯 处理提现活动...');

    try {
        const isOnPage = await page.locator('.withdraw-page, .withdraw-amount').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在提现页面' };
        }

        console.log('      ✅ 提现页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '提现活动' };

    } catch (error) {
        console.log(`      ❌ 提现活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 🔥 智能返回到指定页面
 * 先尝试点击左上角返回按钮，如果失败则使用路由返回
 * @param {Object} page - Playwright page 对象
 * @param {string} targetPageTitle - 目标页面标题
 * @returns {Promise<Object>} 返回结果
 */
async function smartReturnToPage(page, targetPageTitle) {
    console.log(`      ↩️ 智能返回到 "${targetPageTitle}" 页面...`);

    try {
        // 方法1: 尝试点击左上角返回按钮
        const backButton = page.locator('.head-title .back-icon, .head-title .van-icon-arrow-left, .head-title [class*="back"]').first();
        const hasBackButton = await backButton.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasBackButton) {
            console.log('      👆 点击左上角返回按钮...');
            await backButton.click();
            await page.waitForTimeout(1500);

            // 验证是否返回成功
            const isOnTargetPage = await page.locator('.head-title .route-name')
                .filter({ hasText: targetPageTitle })
                .isVisible({ timeout: 2000 })
                .catch(() => false);

            if (isOnTargetPage) {
                console.log(`      ✅ 通过返回按钮成功返回到 "${targetPageTitle}"`);
                return { success: true, method: 'backButton' };
            } else {
                console.log('      ⚠️ 点击返回按钮后未到达目标页面，尝试路由返回...');
            }
        } else {
            console.log('      ℹ️ 未找到返回按钮，尝试路由返回...');
        }

        // 方法2: 使用浏览器返回
        console.log('      ↩️ 使用浏览器返回...');
        await page.goBack();
        await page.waitForTimeout(1500);

        // 验证是否返回成功
        const isOnTargetPage = await page.locator('.head-title .route-name')
            .filter({ hasText: targetPageTitle })
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (isOnTargetPage) {
            console.log(`      ✅ 通过路由返回成功返回到 "${targetPageTitle}"`);
            return { success: true, method: 'goBack' };
        } else {
            console.log(`      ⚠️ 路由返回后未到达目标页面`);
            return { success: false, reason: '返回失败' };
        }

    } catch (error) {
        console.log(`      ❌ 智能返回失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 🔥 处理删除消息逻辑
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {number} claimedCount - 已领取的奖励数量
 * @returns {Promise<Object>} 删除结果
 */
async function handleDeleteMessage(page, test, claimedCount) {
    console.log('      🗑️ 处理删除消息逻辑...');

    try {
        // 查找删除按钮
        const deleteButton = page.locator('.delRead').filter({ hasText: 'Delete Message' });
        const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasDeleteButton) {
            console.log('      ℹ️ 未找到删除按钮');
            return { success: true, deleted: false, reason: '无删除按钮' };
        }

        console.log('      👆 点击删除按钮...');

        // 设置接口监听
        let deleteApiResponse = null;
        page.on('response', async (response) => {
            if (response.url().includes('/api/User/DeleteUserInmail')) {
                try {
                    deleteApiResponse = await response.json();
                    console.log(`      📡 捕获删除接口响应: code=${deleteApiResponse.code}, msg="${deleteApiResponse.msg}"`);
                } catch (e) {
                    console.log('      ⚠️ 解析删除接口响应失败');
                }
            }
        });

        await deleteButton.click();
        await page.waitForTimeout(1500);

        // 检查是否出现删除确认弹窗
        const dialogContainer = page.locator('.dialog-container');
        const hasDialog = await dialogContainer.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasDialog) {
            console.log('      ℹ️ 未出现删除确认弹窗');
            return { success: true, deleted: false, reason: '无确认弹窗' };
        }

        // 验证弹窗标题
        const dialogTitle = await dialogContainer.locator('.dialogTitle').textContent().catch(() => '');
        console.log(`      📋 弹窗标题: "${dialogTitle}"`);

        // 验证弹窗内容
        const dialogContent = await dialogContainer.locator('.dialog-content').textContent().catch(() => '');
        if (dialogContent.includes('Are you sure you want to delete this message')) {
            console.log('      ✅ 确认删除弹窗内容正确');
        }

        // 查找 Confirm 按钮
        const confirmButton = dialogContainer.locator('button').filter({ hasText: 'Confirm' });
        const hasConfirmButton = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);

        if (!hasConfirmButton) {
            console.log('      ❌ 未找到 Confirm 按钮');
            return { success: false, reason: '未找到确认按钮' };
        }

        console.log('      👆 点击 Confirm 按钮确认删除...');
        await confirmButton.click();
        await page.waitForTimeout(2000);

        // 等待接口响应
        let waitCount = 0;
        while (!deleteApiResponse && waitCount < 10) {
            await page.waitForTimeout(500);
            waitCount++;
        }

        if (!deleteApiResponse) {
            console.log('      ⚠️ 未捕获到删除接口响应');
            return { success: false, reason: '未捕获接口响应' };
        }

        // 分析接口响应
        console.log('      📊 分析删除结果...');

        if (deleteApiResponse.code === 0) {
            console.log('      ✅ 删除成功 (code: 0)');
            console.log(`      📝 响应消息: "${deleteApiResponse.msg}"`);

            // 验证是否符合预期（所有奖励都已领取）
            if (claimedCount > 0) {
                console.log(`      ✅ 符合预期：已领取 ${claimedCount} 个奖励，删除成功`);
            }

            return {
                success: true,
                deleted: true,
                code: deleteApiResponse.code,
                message: deleteApiResponse.msg,
                expectedResult: true
            };

        } else if (deleteApiResponse.code === 11 && deleteApiResponse.msg === 'There are unclaimed rewards') {
            console.log('      ℹ️ 删除失败：存在未领取的奖励 (code: 11)');
            console.log(`      📝 响应消息: "${deleteApiResponse.msg}"`);
            console.log(`      📝 msgCode: ${deleteApiResponse.msgCode}`);

            // 验证是否符合预期（有未领取的奖励）
            if (claimedCount === 0) {
                console.log('      ✅ 符合预期：未领取任何奖励，删除失败');
            } else {
                console.log(`      ⚠️ 部分符合预期：已领取 ${claimedCount} 个奖励，但仍有未领取的`);
            }

            return {
                success: true,
                deleted: false,
                code: deleteApiResponse.code,
                message: deleteApiResponse.msg,
                msgCode: deleteApiResponse.msgCode,
                expectedResult: true,
                reason: '存在未领取的奖励'
            };

        } else {
            console.log(`      ⚠️ 删除返回异常状态码: ${deleteApiResponse.code}`);
            console.log(`      📝 响应消息: "${deleteApiResponse.msg}"`);

            return {
                success: false,
                deleted: false,
                code: deleteApiResponse.code,
                message: deleteApiResponse.msg,
                expectedResult: false,
                reason: '异常状态码'
            };
        }

    } catch (error) {
        console.log(`      ❌ 删除消息处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}
