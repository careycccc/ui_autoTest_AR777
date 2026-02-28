import { turntablePlay, rotateTurntable, clickCashOut, checkCanvasLoaded } from '../turntable/turntable-index.js';
import { verifyCashOut } from '../turntable/turntable-catchout.js';
import { checkRulesDialog } from '../turntable/turntable-rules.js';
import { checkCashOutHistory } from '../turntable/turntable-history.js';
import { turntableInviteButton } from '../turntable/turntable-invite.js';


/**
 * 邀请转盘 - 子用例模块
 * 
 * 🔥 测试用例执行顺序说明：
 * 1. 转盘页面加载 - 验证页面和 Canvas 加载
 * 2. 规则弹窗检测 - 测试规则功能
 * 3. 领取奖励历史 - 测试历史记录功能
 * 4. 邀请按钮 - 测试邀请功能
 * 5. 转盘旋转功能 - 执行旋转和 CASH OUT（放在最后，因为会进入下一轮活动）
 */

/**
 * 注册邀请转盘的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerTurntableCases(runner) {
    // 🔥 用例 1: 转盘页面加载
    runner.registerCase('邀请转盘', '转盘页面加载', async (page, auth, test) => {
        // ... (保持原有代码不变)
        console.log('        🎯 开始验证转盘页面加载...');

        const MAX_RETRIES = 3;
        let retryCount = 0;
        let lastError = null;

        while (retryCount < MAX_RETRIES) {
            try {
                if (retryCount > 0) {
                    console.log(`\n        🔄 第 ${retryCount + 1}/${MAX_RETRIES} 次尝试加载转盘页面...`);
                    await auth._ensureOnHomePage();
                    await page.waitForTimeout(2000);

                    const wheelTab = page.locator('#wheel').first();
                    const wheelExists = await wheelTab.count();

                    if (wheelExists > 0) {
                        await wheelTab.click();
                        await page.waitForTimeout(2000);
                    }

                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await page.waitForTimeout(3000);
                }

                const currentUrl = page.url();
                console.log(`        📍 当前 URL: ${currentUrl}`);

                if (currentUrl.includes('/activity') && !currentUrl.includes('/turntable')) {
                    lastError = '页面已被重定向回活动页，账号可能未开启转盘活动或活动已结束';
                    console.log(`        ❌ ${lastError}`);
                    auth.turntablePageFailed = true;
                    return;
                }

                if (!currentUrl.includes('/turntable')) {
                    lastError = `当前不在转盘页面: ${currentUrl}`;
                    console.log(`        ❌ ${lastError}`);
                    auth.turntablePageFailed = true;
                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        return;
                    }
                    continue;
                }

                const initResult = await turntablePlay(page, test, auth);

                if (!initResult.success) {
                    lastError = `转盘初始化失败: ${initResult.error}`;
                    console.log(`        ❌ ${lastError}`);
                    auth.turntablePageFailed = true;
                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        return;
                    }
                    continue;
                }

                console.log(`        ✅ 转盘初始化成功 (状态: ${initResult.state})`);

                // 🔥 检查是否已经完成 CASH OUT 并进入下一轮
                if (initResult.cashOutClicked && initResult.skipCanvasCheck) {
                    console.log('        🎊 检测到已完成 CASH OUT 并进入下一轮活动');
                    console.log('        ✅ 邀请转盘父用例已完成，跳过所有后续子用例');

                    // 🔥 标记父用例已完成，所有子用例都应该跳过
                    auth.turntableParentCaseCompleted = true;
                    auth.turntablePageFailed = false;
                    auth.turntableInitialized = true;

                    // 直接返回，不执行后续的 Canvas 检查
                    return;
                }

                // 🔥 如果是正常转盘页面，标记需要先执行其他子用例
                if (initResult.state === 'wheel_active' || initResult.state === 'gift_selection') {
                    console.log('        ℹ️ 检测到正常转盘页面，将先执行其他子用例（规则、历史、邀请）');
                    auth.turntableShouldExecuteOtherCasesFirst = true;
                }

                const canvasCheck = await checkCanvasLoaded(page, {
                    selector: '#turntable_canvas canvas',
                    timeout: 5000,
                    waitBeforeCheck: 2000,
                    checkPixels: true
                });

                if (canvasCheck.success) {
                    console.log('        ✅ Canvas 已正确加载并渲染内容');
                    auth.turntablePageFailed = false;
                    auth.turntableInitialized = true;
                    return;
                }

                lastError = canvasCheck.error;
                console.log(`        ❌ Canvas 加载失败: ${lastError}`);
                retryCount++;

                if (retryCount >= MAX_RETRIES) {
                    auth.turntablePageFailed = true;
                    return;
                }

            } catch (error) {
                lastError = error.message;
                console.log(`        ❌ 转盘页面加载检查出错: ${lastError}`);
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    auth.turntablePageFailed = true;
                    return;
                }
            }
        }
    }, {
        timeout: 120000
    });

    // 🔥 用例 2: 规则弹窗检测（放在旋转之前）
    runner.registerCase('邀请转盘', '规则弹窗检测', async (page, auth, test) => {
        // 🔥 检查父用例是否已完成
        if (auth.turntableParentCaseCompleted) {
            console.log('        ℹ️ 父用例已完成（已进入下一轮），跳过当前用例');
            return;
        }

        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始规则弹窗检测...');

        try {
            const result = await checkRulesDialog(page, auth, test);

            if (!result.success) {
                console.log(`        ❌ 规则弹窗检测失败: ${result.error}`);
                throw new Error(result.error);
            }

            console.log('        ✅ 规则弹窗检测完成');
            console.log(`           - 弹窗出现: ${result.dialogAppeared ? '是' : '否'}`);
            console.log(`           - 弹窗关闭: ${result.dialogClosed ? '是' : '否'}`);

        } catch (error) {
            console.log(`        ❌ 规则弹窗检测出错: ${error.message}`);
            throw error;
        }
    }, {
        timeout: 30000
    });

    // 🔥 用例 3: 领取奖励历史（放在旋转之前）
    runner.registerCase('邀请转盘', '领取奖励历史', async (page, auth, test) => {
        // 🔥 检查父用例是否已完成
        if (auth.turntableParentCaseCompleted) {
            console.log('        ℹ️ 父用例已完成（已进入下一轮），跳过当前用例');
            return;
        }

        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始领取奖励历史检测...');

        try {
            const result = await checkCashOutHistory(page, auth, test);

            if (!result.success) {
                console.log(`        ❌ 领取奖励历史检测失败: ${result.error}`);
                throw new Error(result.error);
            }

            console.log('        ✅ 领取奖励历史检测完成');
            console.log(`           - 历史页面访问: ${result.historyPageVisited ? '是' : '否'}`);
            console.log(`           - 返回转盘页面: ${result.backToTurntable ? '是' : '否'}`);

        } catch (error) {
            console.log(`        ❌ 领取奖励历史检测出错: ${error.message}`);
            throw error;
        }
    }, {
        timeout: 30000
    });

    // 🔥 用例 4: 邀请按钮功能（放在旋转之前）
    runner.registerCase('邀请转盘', '邀请按钮', async (page, auth, test) => {
        // 🔥 检查父用例是否已完成
        if (auth.turntableParentCaseCompleted) {
            console.log('        ℹ️ 父用例已完成（已进入下一轮），跳过当前用例');
            return;
        }

        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始邀请按钮功能测试...');

        try {
            const result = await turntableInviteButton(page, auth, test);

            if (!result) {
                console.log('        ❌ 邀请按钮功能测试失败');
                throw new Error('邀请按钮功能测试失败');
            }

            console.log('        ✅ 邀请按钮功能测试完成');

        } catch (error) {
            console.log(`        ❌ 邀请按钮功能测试出错: ${error.message}`);
            throw error;
        }
    }, {
        timeout: 60000
    });

    // 🔥 用例 5: 转盘旋转功能（放在最后，因为会进入下一轮活动）
    runner.registerCase('邀请转盘', '转盘旋转功能', async (page, auth, test) => {
        // 🔥 检查父用例是否已完成
        if (auth.turntableParentCaseCompleted) {
            console.log('        ℹ️ 父用例已完成（已进入下一轮），跳过当前用例');
            return;
        }

        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        if (auth.turntableShouldRotate === false) {
            console.log(`        ℹ️ 无需旋转: ${auth.turntableCheckReason || '未知原因'}`);
            return;
        }

        if (!auth.turntableInitialized) {
            console.log('        🎯 执行转盘初始化前置步骤...');
            await turntablePlay(page, test, auth);
            auth.turntableInitialized = true;
        }

        const maxSpins = 20;
        let spinCount = 0;
        let shouldContinue = true;

        console.log('        🎰 开始循环旋转...');

        while (shouldContinue && spinCount < maxSpins) {
            spinCount++;
            console.log(`\n        🎯 第 ${spinCount} 次旋转`);

            const rotateOptions = {
                checkRemainCount: true,
                animationWait: 3000
            };

            const rotateResult = await rotateTurntable(page, test, rotateOptions);

            if (!rotateResult.success) {
                console.log(`        ❌ 旋转失败: ${rotateResult.error}`);

                if (rotateResult.error?.includes('应该点击 CASH OUT')) {
                    console.log('        💰 检测到应该 CASH OUT，执行点击...');
                    const cashOutResult = await clickCashOut(page, test);
                    if (cashOutResult.success) {
                        console.log('        ✅ CASH OUT 成功');
                    }
                }

                shouldContinue = false;
                break;
            }

            console.log(`        ✅ 第 ${spinCount} 次旋转成功`);

            // 🔥 检查是否跳转到了 CASH OUT 页面
            if (rotateResult.reachedCashOutPage) {
                console.log('        🎉 已跳转到奖励页面（Congratulations）');

                if (rotateResult.cashOutClicked) {
                    console.log('        ✅ CASH OUT 按钮已点击');

                    // 🔥 按钮已经在 rotateTurntable() 中点击过了
                    // 直接处理已经出现的弹窗，不要再次点击按钮
                    try {
                        const { handleCashOutDialog } = await import('../turntable/turntable-catchout.js');
                        const cashOutResult = await handleCashOutDialog(page, auth, test);
                        console.log(`        ✅ CASH OUT 弹窗处理完成 (类型: ${cashOutResult.type})`);

                        // 🔥 如果成功处理了 Confirm → Success → OK 流程，说明已进入下一轮
                        if (cashOutResult.successHandled) {
                            console.log('        🎊 已完成 CASH OUT 并进入下一轮活动');
                            console.log('        ✅ 邀请转盘测试用例全部完成');
                        }
                    } catch (error) {
                        console.log(`        ⚠️ CASH OUT 弹窗处理失败: ${error.message}`);
                    }
                }

                shouldContinue = false;
                break;
            }

            // 检查结束条件
            const { getWheelRemainCount } = await import('../turntable/turntable-index.js');
            const wheelInfo = getWheelRemainCount(test);

            if (wheelInfo.success && wheelInfo.remainCount === 0) {
                console.log(`        ℹ️ 剩余次数为 0，停止旋转`);
                shouldContinue = false;
                break;
            }

            const displayAmount = await page.evaluate(() => {
                const amountEl = document.querySelector('.scroll_num');
                if (!amountEl) return null;
                const text = amountEl.textContent || '';
                const match = text.replace(/[₹,]/g, '').trim();
                return parseFloat(match) || 0;
            }).catch(() => null);

            if (displayAmount !== null && wheelInfo.success) {
                const targetAmount = wheelInfo.totalPrizeAmount;
                if (displayAmount >= targetAmount) {
                    console.log(`        ✅ 已达到目标金额，停止旋转`);
                    shouldContinue = false;
                    break;
                }
            }

            if (shouldContinue) {
                console.log(`        ⏳ 等待 3 秒后继续下一次旋转...`);
                await page.waitForTimeout(3000);
            }
        }

        if (spinCount >= maxSpins) {
            console.log(`        ⚠️ 已达到最大旋转次数 (${maxSpins})，停止旋转`);
        }

        console.log(`\n        📊 旋转统计: 共旋转 ${spinCount} 次`);
    }, {
        timeout: 300000
    });
}
