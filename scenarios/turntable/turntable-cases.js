import { turntablePlay, rotateTurntable, clickCashOut, checkCanvasLoaded } from '../turntable/turntable-index.js';


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

        // 如果还没初始化，先执行初始化
        if (!auth.turntableInitialized) {
            console.log('        🎯 执行转盘初始化前置步骤...');
            await turntablePlay(page, test, auth);
            auth.turntableInitialized = true;
        }

        // 尝试旋转
        const rotateResult = await rotateTurntable(page, test);

        // 如果提示应该 CASH OUT，则点击 CASH OUT
        if (!rotateResult.success && rotateResult.error?.includes('应该点击 CASH OUT')) {
            console.log('        💰 检测到应该 CASH OUT，执行点击...');
            const cashOutResult = await clickCashOut(page, test);
            if (cashOutResult.success) {
                console.log('        ✅ CASH OUT 成功');
            } else {
                console.log('        ❌ CASH OUT 失败:', cashOutResult.error);
            }
        } else if (rotateResult.success) {
            console.log('        ✅ 转盘旋转成功');
        } else {
            console.log('        ⚠️ 转盘操作:', rotateResult.error);
        }
    }, {
        timeout: 60000
    });
}
