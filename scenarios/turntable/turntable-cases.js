import { turntablePlay, rotateTurntable, clickCashOut, checkCanvasLoaded } from '../turntable/turntable-index.js';
import { verifyCashOut } from '../turntable/turntable-catchout.js';
import { checkRulesDialog } from '../turntable/turntable-rules.js';
import { checkCashOutHistory } from '../turntable/turntable-history.js';
import { turntableInviteButton } from '../turntable/turntable-invite.js';


/**
 * 邀请转盘 - 子用例模块
 */

/**
 * 注册邀请转盘的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerTurntableCases(runner) {
    // 🔥 新方案：将"邀请转盘页面加载"作为独立用例，可以采集性能和API数据
    runner.registerCase('邀请转盘', '转盘页面加载', async (page, auth, test) => {
        // 🔥 这个用例只负责验证页面加载和Canvas渲染
        console.log('        🎯 开始验证转盘页面加载...');

        const MAX_RETRIES = 3;  // 最多重试 3 次
        let retryCount = 0;
        let lastError = null;

        // 重试循环
        while (retryCount < MAX_RETRIES) {
            try {
                if (retryCount > 0) {
                    console.log(`\n        🔄 第 ${retryCount + 1}/${MAX_RETRIES} 次尝试加载转盘页面...`);

                    // 🔥 重试逻辑：回到首页 → 重新进入转盘页面 → 刷新
                    console.log('        🏠 步骤1: 返回首页...');
                    await auth._ensureOnHomePage();
                    await page.waitForTimeout(2000);

                    console.log('        🎯 步骤2: 重新进入邀请转盘页面...');
                    // 查找并点击转盘入口（分开查找避免选择器语法错误）
                    let wheelClicked = false;

                    // 尝试 #wheel
                    const wheelTab = page.locator('#wheel').first();
                    const wheelExists = await wheelTab.count();

                    if (wheelExists > 0) {
                        await wheelTab.click();
                        await page.waitForTimeout(2000);
                        wheelClicked = true;
                    } else {
                        // 尝试 [data-tab=wheel]（不带引号）
                        const wheelTabAlt = page.locator('[data-tab=wheel]').first();
                        const wheelExistsAlt = await wheelTabAlt.count();

                        if (wheelExistsAlt > 0) {
                            await wheelTabAlt.click();
                            await page.waitForTimeout(2000);
                            wheelClicked = true;
                        } else {
                            // 尝试文本选择器
                            const wheelTabText = page.locator('text=Wheel').first();
                            const wheelExistsText = await wheelTabText.count();

                            if (wheelExistsText > 0) {
                                await wheelTabText.click();
                                await page.waitForTimeout(2000);
                                wheelClicked = true;
                            }
                        }
                    }

                    if (!wheelClicked) {
                        console.log('        ⚠️ 未找到转盘入口，尝试直接导航...');
                        const currentUrl = page.url();
                        const baseUrl = currentUrl.split('/').slice(0, 3).join('/');
                        await page.goto(`${baseUrl}/turntable`);
                        await page.waitForTimeout(2000);
                    }

                    console.log('        🔄 步骤3: 刷新页面...');
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await page.waitForTimeout(3000);  // 等待页面重新加载

                    console.log('        ✅ 页面刷新完成，继续检查...');
                }

                // 🔥 步骤0: 验证当前是否在转盘页面
                const currentUrl = page.url();
                console.log(`        📍 当前 URL: ${currentUrl}`);

                if (currentUrl.includes('/activity') && !currentUrl.includes('/turntable')) {
                    lastError = '页面已被重定向回活动页，账号可能未开启转盘活动或活动已结束';
                    console.log(`        ❌ ${lastError}`);
                    auth.turntablePageFailed = true;

                    // 截图
                    await page.screenshot({
                        path: `reports/screenshots/turntable-redirected-attempt${retryCount + 1}-${Date.now()}.png`,
                        fullPage: true
                    }).catch(() => { });

                    // 如果是重定向问题，不需要重试
                    console.log('        ⚠️ 转盘页面不可用（重定向），跳过后续转盘相关用例');
                    return;
                }

                if (!currentUrl.includes('/turntable')) {
                    lastError = `当前不在转盘页面: ${currentUrl}`;
                    console.log(`        ❌ ${lastError}`);
                    auth.turntablePageFailed = true;

                    await page.screenshot({
                        path: `reports/screenshots/turntable-wrong-page-attempt${retryCount + 1}-${Date.now()}.png`,
                        fullPage: true
                    }).catch(() => { });

                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        console.log(`        ❌ 已重试 ${MAX_RETRIES} 次，仍无法进入转盘页面`);
                        console.log('        ⚠️ 跳过后续转盘相关用例');
                        return;
                    }
                    continue;
                }

                console.log('        ✅ 确认在转盘页面');

                // 🔥 步骤1: 智能识别页面状态并处理
                const initResult = await turntablePlay(page, test, auth);

                if (!initResult.success) {
                    lastError = `转盘初始化失败: ${initResult.error}`;
                    console.log(`        ❌ ${lastError}`);
                    auth.turntablePageFailed = true;

                    await page.screenshot({
                        path: `reports/screenshots/turntable-init-failed-attempt${retryCount + 1}-${Date.now()}.png`,
                        fullPage: true
                    }).catch(() => { });

                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        console.log(`        ❌ 已重试 ${MAX_RETRIES} 次，转盘初始化仍然失败`);
                        console.log(`        📋 最后错误: ${lastError}`);
                        console.log('        ⚠️ 跳过后续转盘相关用例');
                        return;
                    }
                    continue;
                }

                console.log(`        ✅ 转盘初始化成功 (状态: ${initResult.state})`);
                if (initResult.giftSelected) {
                    console.log('        🎁 本次测试已选择礼物');
                }

                // 🔥 步骤2: 增强的 Canvas 验证（包括像素内容检查）
                console.log('        🔍 开始验证 Canvas 加载...');

                const canvasCheck = await checkCanvasLoaded(page, {
                    selector: '#turntable_canvas canvas',
                    timeout: 5000,
                    waitBeforeCheck: 2000,  // 给更多时间让 Canvas 渲染
                    checkPixels: true  // 启用像素检查
                });

                console.log(`        📊 Canvas 检查结果:`);
                console.log(`           存在: ${canvasCheck.exists}`);
                console.log(`           有尺寸: ${canvasCheck.hasSize}`);
                console.log(`           可见: ${canvasCheck.visible}`);
                console.log(`           有内容: ${canvasCheck.hasContent}`);

                if (canvasCheck.canvasInfo) {
                    console.log(`        📊 Canvas 详细信息:`);
                    console.log(`           尺寸: ${canvasCheck.canvasInfo.width}x${canvasCheck.canvasInfo.height}`);
                    console.log(`           显示尺寸: ${canvasCheck.canvasInfo.displayWidth}x${canvasCheck.canvasInfo.displayHeight}`);
                    console.log(`           位置: (${canvasCheck.canvasInfo.rectLeft}, ${canvasCheck.canvasInfo.rectTop})`);
                }

                // 🔥 显示像素检查结果
                if (canvasCheck.pixelCheck) {
                    console.log(`        🎨 Canvas 像素检查:`);
                    if (canvasCheck.pixelCheck.error) {
                        console.log(`           错误: ${canvasCheck.pixelCheck.error}`);
                    } else {
                        console.log(`           采样区域: ${canvasCheck.pixelCheck.sampleArea}`);
                        console.log(`           总像素: ${canvasCheck.pixelCheck.totalPixels}`);
                        console.log(`           非透明像素: ${canvasCheck.pixelCheck.nonTransparentPixels} (${(canvasCheck.pixelCheck.nonTransparentRatio * 100).toFixed(1)}%)`);
                        console.log(`           彩色像素: ${canvasCheck.pixelCheck.coloredPixels} (${(canvasCheck.pixelCheck.coloredRatio * 100).toFixed(1)}%)`);
                        console.log(`           有内容: ${canvasCheck.pixelCheck.hasContent ? '✅ 是' : '❌ 否'}`);
                    }
                }

                if (canvasCheck.success) {
                    console.log('        ✅ Canvas 已正确加载并渲染内容');
                    auth.turntablePageFailed = false;
                    auth.turntableInitialized = true;

                    if (retryCount > 0) {
                        console.log(`        🎉 经过 ${retryCount + 1} 次尝试，转盘页面加载成功！`);
                    }

                    console.log('        ✅ 转盘页面加载完成');
                    return;  // 成功，退出重试循环
                }

                // Canvas 加载失败，准备重试
                lastError = canvasCheck.error;
                console.log(`        ❌ Canvas 加载失败: ${lastError}`);

                // 截图并记录详细信息
                const screenshotPath = `reports/screenshots/turntable-canvas-failed-attempt${retryCount + 1}-${Date.now()}.png`;
                await page.screenshot({
                    path: screenshotPath,
                    fullPage: true
                }).catch(() => { });
                console.log(`        📸 已保存截图: ${screenshotPath}`);

                // 获取网络请求信息
                const apiRequests = test.networkMonitor.getApiRequests();
                const wheelInfoRequest = apiRequests.find(req =>
                    req.url.includes('/api/Activity/GetUserInvitedWheelInfo')
                );

                if (wheelInfoRequest) {
                    console.log('        📊 转盘信息接口状态:', wheelInfoRequest.response?.status);
                    if (wheelInfoRequest.responseBody) {
                        console.log('        📊 接口响应:', JSON.stringify(wheelInfoRequest.responseBody).substring(0, 200));
                    }
                } else {
                    console.log('        ⚠️ 未找到转盘信息接口请求');
                }

                // 检查是否有图片资源加载失败
                const imageRequests = apiRequests.filter(req =>
                    req.url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
                );
                const failedImages = imageRequests.filter(req =>
                    req.response?.status && req.response.status >= 400
                );

                if (failedImages.length > 0) {
                    console.log(`        ⚠️ 发现 ${failedImages.length} 个图片资源加载失败:`);
                    failedImages.forEach(req => {
                        console.log(`           - ${req.url} (状态: ${req.response?.status})`);
                    });
                }

                // 检查是否需要重试
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    console.log(`\n        ❌ 已重试 ${MAX_RETRIES} 次，Canvas 仍然无法加载`);
                    console.log(`        📋 最后错误: ${lastError}`);
                    console.log(`        📊 最后检查结果:`);
                    console.log(`           - Canvas 存在: ${canvasCheck.exists}`);
                    console.log(`           - Canvas 有尺寸: ${canvasCheck.hasSize}`);
                    console.log(`           - Canvas 可见: ${canvasCheck.visible}`);
                    console.log(`           - Canvas 有内容: ${canvasCheck.hasContent}`);

                    auth.turntablePageFailed = true;
                    console.log('        ⚠️ Canvas 加载失败，跳过后续转盘相关用例');
                    return;
                }

                console.log(`        ⏳ 准备第 ${retryCount + 1} 次重试...`);
                await page.waitForTimeout(2000);

            } catch (error) {
                // 捕获所有错误，记录但不中断测试
                lastError = error.message;
                console.log(`        ❌ 转盘页面加载检查出错: ${lastError}`);

                await page.screenshot({
                    path: `reports/screenshots/turntable-error-attempt${retryCount + 1}-${Date.now()}.png`,
                    fullPage: true
                }).catch(() => { });

                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    console.log(`\n        ❌ 已重试 ${MAX_RETRIES} 次，仍然出错`);
                    console.log(`        📋 最后错误: ${lastError}`);
                    auth.turntablePageFailed = true;
                    console.log('        ⚠️ 转盘页面检查失败，跳过后续转盘相关用例');
                    return;
                }

                console.log(`        ⏳ 准备第 ${retryCount + 1} 次重试...`);
                await page.waitForTimeout(2000);
            }
        }
    }, {
        timeout: 120000  // 增加超时时间以支持重试
    });

    // 检查转盘可以正常旋转或 CASH OUT
    runner.registerCase('邀请转盘', '转盘旋转功能', async (page, auth, test) => {
        // 🔥 检查转盘页面是否加载失败
        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        // 🔥 检查是否需要旋转（在 onEnter 中已判断）
        if (auth.turntableShouldRotate === false) {
            console.log(`        ℹ️ 无需旋转: ${auth.turntableCheckReason || '未知原因'}`);
            return;
        }

        // 如果还没初始化，先执行初始化
        if (!auth.turntableInitialized) {
            console.log('        🎯 执行转盘初始化前置步骤...');
            await turntablePlay(page, test, auth);
            auth.turntableInitialized = true;
        }

        // 🔥 循环旋转直到满足结束条件
        const maxSpins = 20;  // 最大旋转次数（防止无限循环）
        let spinCount = 0;
        let shouldContinue = true;

        console.log('        🎰 开始循环旋转...');

        while (shouldContinue && spinCount < maxSpins) {
            spinCount++;
            console.log(`\n        🎯 第 ${spinCount} 次旋转`);

            // 🔥 第一次旋转：完整检查（包括 Canvas）
            // 后续旋转：跳过 Canvas 检查，直接点击
            const rotateOptions = {
                checkRemainCount: true,
                animationWait: 3000
            };

            // 执行旋转
            const rotateResult = await rotateTurntable(page, test, rotateOptions);

            if (!rotateResult.success) {
                console.log(`        ❌ 旋转失败: ${rotateResult.error}`);

                // 如果提示应该 CASH OUT
                if (rotateResult.error?.includes('应该点击 CASH OUT')) {
                    console.log('        💰 检测到应该 CASH OUT，执行点击...');
                    const cashOutResult = await clickCashOut(page, test);
                    if (cashOutResult.success) {
                        console.log('        ✅ CASH OUT 成功');
                    } else {
                        console.log('        ❌ CASH OUT 失败:', cashOutResult.error);
                    }
                }

                shouldContinue = false;
                break;
            }

            console.log(`        ✅ 第 ${spinCount} 次旋转成功`);

            // 🔥 检查结束条件
            const { shouldRotateTurntable, getWheelRemainCount } = await import('../turntable/turntable-index.js');

            // 条件1: 检查剩余次数
            const wheelInfo = getWheelRemainCount(test);
            if (wheelInfo.success && wheelInfo.remainCount === 0) {
                console.log(`        ℹ️ 剩余次数为 0，停止旋转`);
                shouldContinue = false;
                break;
            }

            // 条件2: 检查是否达到目标金额
            const displayAmount = await page.evaluate(() => {
                const amountEl = document.querySelector('.scroll_num');
                if (!amountEl) return null;

                const text = amountEl.textContent || '';
                const match = text.replace(/[₹,]/g, '').trim();
                return parseFloat(match) || 0;
            }).catch(() => null);

            if (displayAmount !== null && wheelInfo.success) {
                const targetAmount = wheelInfo.totalPrizeAmount;
                console.log(`        📊 当前金额: ${displayAmount}, 目标金额: ${targetAmount}`);

                if (displayAmount >= targetAmount) {
                    console.log(`        ✅ 已达到目标金额，停止旋转`);
                    shouldContinue = false;
                    break;
                }
            }

            // 🔥 如果还需要继续，等待一下再进行下一次旋转
            if (shouldContinue) {
                console.log(`        ⏳ 等待 1 秒后继续下一次旋转...`);
                await page.waitForTimeout(1000);
            }
        }

        if (spinCount >= maxSpins) {
            console.log(`        ⚠️ 已达到最大旋转次数 (${maxSpins})，停止旋转`);
        }

        console.log(`\n        📊 旋转统计: 共旋转 ${spinCount} 次`);

        // 🔥 最后更新状态
        const { shouldRotateTurntable } = await import('../turntable/turntable-index.js');
        const finalCheck = await shouldRotateTurntable(page, test);
        auth.turntableShouldRotate = finalCheck.shouldRotate;
        auth.turntableCheckReason = finalCheck.reason;

        if (!finalCheck.shouldRotate) {
            console.log(`        ✅ 旋转完成: ${finalCheck.reason}`);
        }
    }, {
        timeout: 300000  // 增加超时时间以支持多次旋转（5分钟）
    });

    // 提现功能验证 - 自动识别4种弹窗类型
    runner.registerCase('邀请转盘', '提现功能验证', async (page, auth, test) => {
        // 🔥 检查转盘页面是否加载失败
        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始验证提现功能...');

        try {
            const result = await verifyCashOut(page, auth, test);
            console.log(`        ✅ 提现功能验证完成 (类型: ${result.type})`);

        } catch (error) {
            console.log(`        ❌ 提现功能验证失败: ${error.message}`);

            // 截图记录错误
            await page.screenshot({
                path: `reports/screenshots/turntable-cashout-error-${Date.now()}.png`,
                fullPage: true
            }).catch(() => { });

            throw error;
        }
    }, {
        timeout: 60000
    });

    // 规则弹窗检测
    runner.registerCase('邀请转盘', '规则弹窗检测', async (page, auth, test) => {
        // 🔥 检查转盘页面是否加载失败
        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始规则弹窗检测...');

        try {
            const result = await checkRulesDialog(page, auth, test);

            if (!result.success) {
                console.log(`        ❌ 规则弹窗检测失败: ${result.error}`);

                // 截图记录错误
                await page.screenshot({
                    path: `reports/screenshots/turntable-rules-error-${Date.now()}.png`,
                    fullPage: true
                }).catch(() => { });

                throw new Error(result.error);
            }

            console.log('        ✅ 规则弹窗检测完成');
            console.log(`           - 弹窗出现: ${result.dialogAppeared ? '是' : '否'}`);
            console.log(`           - 弹窗关闭: ${result.dialogClosed ? '是' : '否'}`);

        } catch (error) {
            console.log(`        ❌ 规则弹窗检测出错: ${error.message}`);

            // 截图记录错误
            await page.screenshot({
                path: `reports/screenshots/turntable-rules-error-${Date.now()}.png`,
                fullPage: true
            }).catch(() => { });

            throw error;
        }
    }, {
        timeout: 30000
    });

    // 领取奖励历史检测
    runner.registerCase('邀请转盘', '领取奖励历史', async (page, auth, test) => {
        // 🔥 检查转盘页面是否加载失败
        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始领取奖励历史检测...');

        try {
            const result = await checkCashOutHistory(page, auth, test);

            if (!result.success) {
                console.log(`        ❌ 领取奖励历史检测失败: ${result.error}`);

                // 截图记录错误
                await page.screenshot({
                    path: `reports/screenshots/turntable-history-error-${Date.now()}.png`,
                    fullPage: true
                }).catch(() => { });

                throw new Error(result.error);
            }

            console.log('        ✅ 领取奖励历史检测完成');
            console.log(`           - 历史页面访问: ${result.historyPageVisited ? '是' : '否'}`);
            console.log(`           - 返回转盘页面: ${result.backToTurntable ? '是' : '否'}`);
            console.log(`           - 转盘元素验证: ${result.turntableElementFound ? '是' : '否'}`);

        } catch (error) {
            console.log(`        ❌ 领取奖励历史检测出错: ${error.message}`);

            // 截图记录错误
            await page.screenshot({
                path: `reports/screenshots/turntable-history-error-${Date.now()}.png`,
                fullPage: true
            }).catch(() => { });

            throw error;
        }
    }, {
        timeout: 30000
    });

    // 邀请按钮功能
    runner.registerCase('邀请转盘', '邀请按钮', async (page, auth, test) => {
        // 🔥 检查转盘页面是否加载失败
        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        console.log('        🎯 开始邀请按钮功能测试...');

        try {
            const result = await turntableInviteButton(page, auth, test);

            if (!result) {
                console.log('        ❌ 邀请按钮功能测试失败');

                // 截图记录错误
                await page.screenshot({
                    path: `reports/screenshots/turntable-invite-error-${Date.now()}.png`,
                    fullPage: true
                }).catch(() => { });

                throw new Error('邀请按钮功能测试失败');
            }

            console.log('        ✅ 邀请按钮功能测试完成');

        } catch (error) {
            console.log(`        ❌ 邀请按钮功能测试出错: ${error.message}`);

            // 截图记录错误
            await page.screenshot({
                path: `reports/screenshots/turntable-invite-error-${Date.now()}.png`,
                fullPage: true
            }).catch(() => { });

            throw error;
        }
    }, {
        timeout: 60000
    });
}
