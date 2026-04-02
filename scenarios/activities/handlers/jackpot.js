/**
 * 超级大奖活动处理器
 * 包含超级大奖活动的所有处理逻辑
 */

/**
 * 超级大奖活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handleJackpot(page, test) {
    console.log('      🎯 处理超级大奖活动...');

    try {
        // 🔥 验证是否在超级大奖页面
        const routeName = page.locator('.route-name').filter({ hasText: 'Super Jackpot' });
        const hasRouteName = await routeName.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasRouteName) {
            console.log('      ❌ 未找到超级大奖页面标识');
            return { success: false, reason: '未找到超级大奖页面' };
        }

        console.log('      ✅ 确认在超级大奖页面');

        // 🔥 步骤1: 处理右上角的两个按钮
        console.log('      📋 步骤1: 处理右上角按钮');
        const buttonResults = await handleTopRightButtons(page, test);

        if (!buttonResults.success) {
            console.log('      ⚠️ 右上角按钮处理失败，但继续执行其他逻辑');
        }

        // 🔥 步骤2: 检查并处理奖励（仅在超级大奖页面，不在Competition rules页面）
        console.log('      📋 步骤2: 检查并处理奖励（仅在超级大奖页面）');

        // 确认当前在超级大奖页面
        const stillInJackpotPage = await page.locator('.route-name').filter({ hasText: 'Super Jackpot' })
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!stillInJackpotPage) {
            console.log('      ⚠️ 当前不在超级大奖页面，跳过奖励处理');
            return {
                success: true,
                activityName: '超级大奖',
                buttonResults: buttonResults,
                rewardResult: { success: false, reason: '不在超级大奖页面' }
            };
        }

        const rewardResult = await handleRewardProcess(page, test);

        if (rewardResult.success) {
            console.log(`      ✅ 奖励处理成功: ${rewardResult.message}`);
        } else {
            console.log(`      ℹ️ 奖励处理结果: ${rewardResult.message || rewardResult.reason}`);
        }

        console.log('      ✅ 超级大奖活动处理完成');

        return {
            success: true,
            activityName: '超级大奖',
            buttonResults: buttonResults,
            rewardResult: rewardResult
        };

    } catch (error) {
        console.log(`      ❌ 超级大奖活动处理失败: ${error.message}`);
        await test.captureScreenshot('jackpot-error');

        return { success: false, error: error.message };
    }
}

/**
 * 处理右上角的两个按钮
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleTopRightButtons(page, test) {
    console.log('      🔘 处理右上角按钮...');

    try {
        // 🔥 查找右上角按钮容器
        const extraContainer = page.locator('.extra');
        const hasExtraContainer = await extraContainer.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasExtraContainer) {
            console.log('      ⚠️ 未找到右上角按钮容器');
            return { success: false, reason: '未找到按钮容器' };
        }

        // 🔥 获取所有按钮
        const buttons = extraContainer.locator('.ar_icon.icon');
        const buttonCount = await buttons.count();

        console.log(`      📊 找到 ${buttonCount} 个右上角按钮`);

        if (buttonCount < 2) {
            console.log('      ⚠️ 按钮数量不足2个');
            return { success: false, reason: '按钮数量不足' };
        }

        const results = [];

        // 🔥 处理第一个按钮 (Winning star)
        console.log('      🔘 处理第1个按钮 (Winning star)...');
        const button1Result = await handleSingleButton(page, test, buttons.nth(0), 1, 'Winning star');
        results.push(button1Result);

        // 🔥 处理第二个按钮 (Competition rules)
        console.log('      🔘 处理第2个按钮 (Competition rules)...');
        const button2Result = await handleSingleButton(page, test, buttons.nth(1), 2, 'Competition rules');
        results.push(button2Result);

        const successCount = results.filter(r => r.success).length;
        console.log(`      📊 按钮处理结果: ${successCount}/2 成功`);

        return {
            success: successCount === 2,
            total: 2,
            successful: successCount,
            results: results
        };

    } catch (error) {
        console.log(`      ❌ 右上角按钮处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 处理单个按钮
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {Object} button - 按钮元素
 * @param {number} index - 按钮索引
 * @param {string} expectedPage - 期望跳转的页面标题
 * @returns {Promise<Object>} 处理结果
 */
async function handleSingleButton(page, test, button, index, expectedPage) {
    try {
        // 记录点击前的 URL
        const beforeUrl = page.url();
        console.log(`      📍 点击前 URL: ${beforeUrl}`);

        // 🔥 点击按钮
        console.log(`      👆 点击第 ${index} 个按钮...`);
        await button.click();
        await page.waitForTimeout(1000);

        // 🔥 使用 switchToPage 进行页面切换（统计性能数据）
        const pageName = `超级大奖-${expectedPage}页面`;
        console.log(`      🔄 使用 switchToPage 切换到: ${pageName}`);

        const switchSuccess = await test.switchToPage(pageName, {
            waitForSelector: '.route-name',
            waitTime: 2000,
            collectPreviousPage: true
        });

        if (!switchSuccess) {
            console.log(`      ❌ 第 ${index} 个按钮页面切换失败`);
            return { success: false, reason: '页面切换失败' };
        }

        // 🔥 验证跳转页面
        const routeNameElement = page.locator('.route-name');
        const actualPageTitle = await routeNameElement.textContent({ timeout: 3000 }).catch(() => '');

        console.log(`      📋 期望页面标题: "${expectedPage}"`);
        console.log(`      📋 实际页面标题: "${actualPageTitle}"`);

        const isCorrectPage = actualPageTitle.includes(expectedPage);

        if (!isCorrectPage) {
            console.log(`      ⚠️ 第 ${index} 个按钮未跳转到正确页面`);
            await test.captureScreenshot(`jackpot-button-${index}-wrong-page`);
        } else {
            console.log(`      ✅ 第 ${index} 个按钮成功跳转到 ${expectedPage} 页面`);
        }

        // 🔥 等待2秒
        console.log(`      ⏳ 等待 2 秒...`);
        await page.waitForTimeout(2000);

        // 🔥 智能返回逻辑（不使用 switchToPage，直接使用返回按钮）
        console.log(`      ↩️ 执行智能返回逻辑...`);

        // 尝试多种可能的左上角返回按钮选择器
        const backButtonSelectors = [
            '.header .back',           // 头部返回按钮
            '.nav-back',               // 导航返回按钮
            '.back-btn',               // 返回按钮
            '.ar_icon[class*="back"]', // 带有back类的图标
            '.header .ar_icon',        // 头部图标（通常是返回）
            'button[class*="back"]',   // 包含back的按钮
            '.return',                 // 返回按钮
            '.go-back'                 // 返回按钮
        ];

        let backButtonFound = false;

        for (const selector of backButtonSelectors) {
            const backButton = page.locator(selector).first();
            const hasBackButton = await backButton.isVisible({ timeout: 1000 }).catch(() => false);

            if (hasBackButton) {
                console.log(`      👆 找到返回按钮: ${selector}`);
                await backButton.click();
                await page.waitForTimeout(1000);
                backButtonFound = true;
                break;
            }
        }

        if (!backButtonFound) {
            // 如果找不到返回按钮，尝试使用浏览器返回
            console.log(`      ⚠️ 未找到页面返回按钮，使用浏览器返回`);
            await page.goBack();
            await page.waitForTimeout(1000);
        }

        console.log(`      ✅ 第 ${index} 个按钮处理完成`);

        // 验证是否返回到超级大奖页面
        const backToJackpot = await page.locator('.route-name').filter({ hasText: 'Super Jackpot' })
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!backToJackpot) {
            console.log(`      ⚠️ 第 ${index} 个按钮处理后未返回超级大奖页面`);
        }

        return {
            success: true,
            index: index,
            expectedPage: expectedPage,
            actualPage: actualPageTitle,
            reachedCorrectPage: isCorrectPage,
            returnedToJackpot: backToJackpot
        };

    } catch (error) {
        console.log(`      ❌ 第 ${index} 个按钮处理失败: ${error.message}`);
        await test.captureScreenshot(`jackpot-button-${index}-error`);

        return {
            success: false,
            index: index,
            error: error.message
        };
    }
}

/**
 * 处理奖励流程（在超级大奖页面）
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleRewardProcess(page, test) {
    console.log('      🎁 检查奖励状态...');

    try {
        // 🔥 检查是否有 Claim 按钮
        const claimButtons = page.locator('button, .btn').filter({ hasText: 'Claim' });
        const claimCount = await claimButtons.count();

        console.log(`      📊 找到 ${claimCount} 个 Claim 按钮`);

        if (claimCount === 0) {
            console.log('      ℹ️ 没有 Claim 按钮，检查是否有 Bet Now 按钮');
            return await handleBetNowButton(page, test);
        }

        // 🔥 根据 Claim 按钮数量执行不同逻辑
        if (claimCount === 1) {
            console.log('      📋 只有1个 Claim 按钮，直接点击 Claim in batches');
            await handleClaimInBatches(page, test);
        } else if (claimCount >= 2) {
            console.log('      📋 有多个 Claim 按钮，先点击第一个，再点击 Claim in batches');

            // 点击第一个 Claim 按钮
            console.log('      👆 点击第一个 Claim 按钮...');
            await claimButtons.first().click();
            await page.waitForTimeout(1000);

            // 🔥 处理第一个 Claim 按钮的弹窗
            await handleClaimDialog(page, test, '第一个 Claim');

            // 然后点击 Claim in batches
            await handleClaimInBatches(page, test);
        }

        // 🔥 最后点击 Bet Now 按钮
        console.log('      📋 处理 Bet Now 按钮');
        const betNowResult = await handleBetNowButton(page, test);

        return {
            success: true,
            message: `成功处理 ${claimCount} 个 Claim 按钮和 Bet Now 按钮`,
            claimCount: claimCount,
            betNowResult: betNowResult
        };

    } catch (error) {
        console.log(`      ❌ 奖励处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 处理 Claim in batches 按钮
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 */
async function handleClaimInBatches(page, test) {
    console.log('      👆 点击 Claim in batches 按钮...');

    try {
        const claimInBatchesButton = page.locator('.btn1').filter({ hasText: 'Claim in batches' });
        const hasClaimInBatchesButton = await claimInBatchesButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasClaimInBatchesButton) {
            await claimInBatchesButton.click();
            await page.waitForTimeout(1000);
            console.log('      ✅ 成功点击 Claim in batches 按钮');

            // 🔥 处理 Claim in batches 按钮的弹窗
            await handleClaimDialog(page, test, 'Claim in batches');
        } else {
            console.log('      ⚠️ 未找到 Claim in batches 按钮');
        }
    } catch (error) {
        console.log(`      ❌ 点击 Claim in batches 按钮失败: ${error.message}`);
    }
}

/**
 * 处理 Bet Now 按钮
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleBetNowButton(page, test) {
    console.log('      👆 点击 Bet Now 按钮...');

    try {
        const betNowButton = page.locator('.go-bet-btn.btn_main_style').filter({ hasText: 'Bet Now' });
        const hasBetNowButton = await betNowButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (!hasBetNowButton) {
            console.log('      ⚠️ 未找到 Bet Now 按钮');
            return { success: false, reason: '未找到 Bet Now 按钮' };
        }

        // 记录点击前的 URL
        const beforeUrl = page.url();
        console.log(`      📍 点击前 URL: ${beforeUrl}`);

        await betNowButton.click();
        await page.waitForTimeout(2000);

        // 检查是否跳转到首页
        const afterUrl = page.url();
        console.log(`      📍 点击后 URL: ${afterUrl}`);

        const isHomePage = afterUrl.includes('arplatsaassit4.club') &&
            (afterUrl.endsWith('/') || afterUrl.split('/').filter(s => s).length <= 3);

        if (isHomePage) {
            console.log('      ✅ 成功跳转到首页');

            // 🔥 跳转到活动资讯页面
            console.log('      ↩️ 跳转到活动资讯页面...');
            await page.goto('https://arplatsaassit4.club/activity');
            await page.waitForTimeout(2000);

            // 验证是否成功跳转到活动资讯
            const activityUrl = page.url();
            const isActivityPage = activityUrl.includes('/activity');

            if (isActivityPage) {
                console.log('      ✅ 成功跳转到活动资讯页面');
                return {
                    success: true,
                    message: '成功完成 Bet Now 流程并跳转到活动资讯',
                    finalUrl: activityUrl
                };
            } else {
                console.log('      ⚠️ 跳转到活动资讯失败');
                return {
                    success: false,
                    reason: '跳转到活动资讯失败',
                    finalUrl: activityUrl
                };
            }
        } else {
            console.log('      ⚠️ 未跳转到首页');
            return {
                success: false,
                reason: '未跳转到首页',
                actualUrl: afterUrl
            };
        }

    } catch (error) {
        console.log(`      ❌ Bet Now 按钮处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 处理 Claim 按钮点击后的弹窗
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @param {string} buttonName - 按钮名称（用于日志）
 * @returns {Promise<Object>} 处理结果
 */
async function handleClaimDialog(page, test, buttonName) {
    console.log(`      🔔 处理 ${buttonName} 按钮的弹窗...`);

    try {
        // 🔥 检查是否出现奖励弹窗
        const dialogContent = page.locator('.dialog-content');
        const hasDialog = await dialogContent.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasDialog) {
            console.log(`      ⚠️ ${buttonName} 按钮点击后未出现弹窗`);
            return { success: false, reason: '未出现弹窗' };
        }

        console.log(`      ✅ ${buttonName} 按钮弹窗已出现`);

        // 🔥 获取奖励信息
        const rewardTitle = await dialogContent.locator('.rebate-tip-title').textContent().catch(() => '');
        const rewardAmount = await dialogContent.locator('.rebate-tip-cont').textContent().catch(() => '');

        console.log(`      📋 奖励标题: "${rewardTitle}"`);
        console.log(`      💰 奖励金额: "${rewardAmount}"`);

        // 🔥 点击 Confirm 按钮关闭弹窗
        const confirmButton = dialogContent.locator('.dialog-footer .subBtn.btn_main_style').filter({ hasText: 'Confirm' });
        const hasConfirmButton = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasConfirmButton) {
            console.log(`      👆 点击 Confirm 按钮关闭弹窗...`);
            await confirmButton.click();
            await page.waitForTimeout(1000);

            // 验证弹窗是否已关闭
            const dialogStillVisible = await dialogContent.isVisible({ timeout: 1000 }).catch(() => false);

            if (!dialogStillVisible) {
                console.log(`      ✅ ${buttonName} 弹窗已成功关闭`);
                return {
                    success: true,
                    rewardTitle: rewardTitle,
                    rewardAmount: rewardAmount,
                    message: `成功处理 ${buttonName} 弹窗`
                };
            } else {
                console.log(`      ⚠️ ${buttonName} 弹窗未完全关闭`);
                return { success: false, reason: '弹窗未完全关闭' };
            }
        } else {
            console.log(`      ⚠️ 未找到 Confirm 按钮，尝试点击关闭按钮`);

            // 尝试点击右上角关闭按钮
            const closeButton = dialogContent.locator('.close');
            const hasCloseButton = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);

            if (hasCloseButton) {
                console.log(`      👆 点击关闭按钮...`);
                await closeButton.click();
                await page.waitForTimeout(1000);
                console.log(`      ✅ 通过关闭按钮关闭了 ${buttonName} 弹窗`);

                return {
                    success: true,
                    rewardTitle: rewardTitle,
                    rewardAmount: rewardAmount,
                    message: `通过关闭按钮处理 ${buttonName} 弹窗`
                };
            } else {
                console.log(`      ❌ 未找到任何关闭弹窗的按钮`);
                await test.captureScreenshot(`jackpot-${buttonName.replace(/\s+/g, '-')}-dialog-error`);
                return { success: false, reason: '未找到关闭按钮' };
            }
        }

    } catch (error) {
        console.log(`      ❌ 处理 ${buttonName} 弹窗失败: ${error.message}`);
        await test.captureScreenshot(`jackpot-${buttonName.replace(/\s+/g, '-')}-dialog-error`);
        return { success: false, error: error.message };
    }
}