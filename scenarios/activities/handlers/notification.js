/**
 * 站内信活动处理器
 * 包含站内信的所有处理逻辑
 */

/**
 * 站内信活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
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
 * 🔥 处理奖励领取区域
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
 * 🔥 处理消息操作按钮区域
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
            console.log(`      🔄 检测到页面跳转，验证跳转页面...`);

            // 🔥 使用验证映射来验证页面（不执行活动逻辑）
            const { findValidationConfig, validateActivityPage } = await import('../activity-validation-map.js');

            // 查找验证配置
            const validationConfig = findValidationConfig(secondButtonInfo.text);

            if (validationConfig) {
                console.log(`      🎯 找到验证配置: ${validationConfig.activityName}`);

                // 验证页面
                const validationResult = await validateActivityPage(page, validationConfig);

                // 🔥 处理跳转失败的情况（项目自动跳回首页）
                if (validationResult.needScreenshot) {
                    console.log(`      ⚠️ 跳转失败，项目自动跳回首页`);
                    await test.captureScreenshot('notification-jump-failed-to-home');

                    // 记录警告信息
                    const warningMessage = `站内信跳转失败: 按钮"${secondButtonInfo.text}"跳转到"${validationResult.activityName}"失败，项目自动跳回首页`;
                    console.log(`      ⚠️ ${warningMessage}`);

                    // 🔥 强制跳转回活动资讯页面
                    if (validationResult.needReturnToActivity) {
                        console.log(`      🔄 强制跳转回活动资讯页面...`);
                        await forceNavigateToActivityPage(page, test);
                    }

                    return {
                        success: false,
                        activityName: validationResult.activityName,
                        buttonText: secondButtonInfo.text,
                        jumpedActivity: true,
                        validationOnly: true,
                        jumpFailed: true,
                        warning: warningMessage,
                        validationResult: validationResult
                    };
                }

                if (validationResult.success) {
                    console.log(`      ✅ 页面验证成功: ${validationResult.activityName}`);
                } else {
                    console.log(`      ❌ 页面验证失败: ${validationResult.reason || validationResult.error}`);
                    await test.captureScreenshot('notification-validation-failed');
                }

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
                    success: validationResult.success,
                    activityName: validationResult.activityName,
                    buttonText: secondButtonInfo.text,
                    jumpedActivity: true,
                    validationOnly: true,
                    validationResult: validationResult
                };
            } else {
                console.log(`      ⚠️ 未找到验证配置，按钮文本: "${secondButtonInfo.text}"`);
                console.log(`      ℹ️ 仅验证跳转成功，不执行活动逻辑`);

                // 尝试返回
                console.log('      ↩️ 返回消息详情页...');
                await page.goBack();
                await page.waitForTimeout(1500);

                return {
                    success: true,
                    reason: '跳转成功但无验证配置',
                    buttonText: secondButtonInfo.text,
                    jumpedActivity: true,
                    validationOnly: true
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

/**
 * 🔥 强制跳转到活动资讯页面
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function forceNavigateToActivityPage(page, test) {
    console.log('      🔄 强制跳转到活动资讯页面...');

    try {
        // 方法1: 尝试点击底部菜单的活动按钮
        const activityMenuButton = page.locator('.tabbar-item, .menu-item, .tab-item').filter({ hasText: /Activity|活动|Promo|资讯/i }).first();
        const hasActivityButton = await activityMenuButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasActivityButton) {
            console.log('      👆 点击底部菜单活动按钮...');
            await activityMenuButton.click();
            await page.waitForTimeout(2000);

            // 验证是否跳转成功
            const currentUrl = page.url();
            if (currentUrl.includes('/activity') || currentUrl.includes('/promo')) {
                console.log('      ✅ 已通过菜单跳转到活动页面');
                return { success: true, method: 'menu' };
            }
        }

        // 方法2: 尝试直接导航
        console.log('      🔄 尝试直接导航到活动页面...');
        const baseUrl = page.url().split('/').slice(0, 3).join('/');
        await page.goto(`${baseUrl}/activity`);
        await page.waitForTimeout(2000);

        console.log('      ✅ 已直接导航到活动页面');
        return { success: true, method: 'navigate' };

    } catch (error) {
        console.log(`      ❌ 强制跳转失败: ${error.message}`);
        await test.captureScreenshot('force-navigate-to-activity-failed');
        return { success: false, error: error.message };
    }
}
