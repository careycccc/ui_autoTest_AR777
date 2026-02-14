import { handleFailure } from '../utils.js';

/**
 * 检查 Canvas 是否正确加载
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 返回检查结果
 */
export async function checkCanvasLoaded(page, options = {}) {
    const {
        selector = '#turntable_canvas canvas',
        timeout = 5000,
        waitBeforeCheck = 1000,
        checkPixels = true  // 🔥 默认启用像素检查
    } = options;

    const result = {
        success: false,
        exists: false,
        visible: false,
        hasSize: false,
        hasContent: false,  // 新增：是否有实际内容
        canvasInfo: null,
        pixelCheck: null,
        error: null
    };

    try {
        // 等待一下让 Canvas 有时间渲染
        if (waitBeforeCheck > 0) {
            await page.waitForTimeout(waitBeforeCheck);
        }

        // 检查 Canvas 是否存在
        const canvasCount = await page.locator(selector).count();
        result.exists = canvasCount > 0;

        if (!result.exists) {
            result.error = 'Canvas 元素不存在于 DOM';
            return result;
        }

        // 检查 Canvas 的详细信息
        result.canvasInfo = await page.evaluate((sel) => {
            const canvas = document.querySelector(sel);
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            const parent = canvas.parentElement;
            const parentStyle = parent ? window.getComputedStyle(parent) : null;

            return {
                width: canvas.width,
                height: canvas.height,
                displayWidth: rect.width,
                displayHeight: rect.height,
                rectTop: rect.top,
                rectLeft: rect.left,
                isInViewport: rect.width > 0 && rect.height > 0,
                hasParent: !!parent,
                parentDisplay: parentStyle ? parentStyle.display : null,
                parentVisibility: parentStyle ? parentStyle.visibility : null,
                parentOpacity: parentStyle ? parentStyle.opacity : null
            };
        }, selector).catch(() => null);

        if (result.canvasInfo) {
            result.hasSize = result.canvasInfo.width > 0 && result.canvasInfo.height > 0;
            result.visible = result.canvasInfo.isInViewport;
        }

        // 🔥 关键检查：验证 Canvas 是否有实际渲染内容（像素检查）
        if (checkPixels && result.hasSize) {
            result.pixelCheck = await page.evaluate((sel) => {
                return new Promise((resolve) => {
                    const canvas = document.querySelector(sel);
                    if (!canvas) {
                        resolve({ hasContent: false, error: 'Canvas not found' });
                        return;
                    }

                    try {
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve({ hasContent: false, error: 'Cannot get 2D context' });
                            return;
                        }

                        // 🔥 等待一下，确保 Canvas 已经渲染
                        setTimeout(() => {
                            try {
                                // 🔥 多点采样：检查多个区域，提高检测准确性
                                const samplePoints = [
                                    { x: 0.5, y: 0.5 },  // 中心
                                    { x: 0.3, y: 0.3 },  // 左上
                                    { x: 0.7, y: 0.3 },  // 右上
                                    { x: 0.3, y: 0.7 },  // 左下
                                    { x: 0.7, y: 0.7 },  // 右下
                                ];

                                let totalNonTransparent = 0;
                                let totalColored = 0;
                                let totalSampled = 0;
                                const sampleSize = 30; // 每个采样点的区域大小

                                for (const point of samplePoints) {
                                    const centerX = Math.floor(canvas.width * point.x);
                                    const centerY = Math.floor(canvas.height * point.y);

                                    const x = Math.max(0, centerX - sampleSize / 2);
                                    const y = Math.max(0, centerY - sampleSize / 2);
                                    const w = Math.min(sampleSize, canvas.width - x);
                                    const h = Math.min(sampleSize, canvas.height - y);

                                    if (w <= 0 || h <= 0) continue;

                                    const imageData = ctx.getImageData(x, y, w, h);
                                    const pixels = imageData.data;

                                    for (let i = 0; i < pixels.length; i += 4) {
                                        const r = pixels[i];
                                        const g = pixels[i + 1];
                                        const b = pixels[i + 2];
                                        const a = pixels[i + 3];

                                        totalSampled++;

                                        // 非透明像素
                                        if (a > 10) {
                                            totalNonTransparent++;
                                        }

                                        // 有颜色的像素（排除纯黑、纯白、接近透明）
                                        if (a > 50 && (r > 20 || g > 20 || b > 20)) {
                                            totalColored++;
                                        }
                                    }
                                }

                                const nonTransparentRatio = totalSampled > 0 ? totalNonTransparent / totalSampled : 0;
                                const coloredRatio = totalSampled > 0 ? totalColored / totalSampled : 0;

                                // 🔥 降低阈值：只要有 5% 的非透明像素或 2% 的有色像素就认为有内容
                                const hasContent = nonTransparentRatio > 0.05 || coloredRatio > 0.02;

                                resolve({
                                    hasContent,
                                    nonTransparentPixels: totalNonTransparent,
                                    coloredPixels: totalColored,
                                    totalPixels: totalSampled,
                                    nonTransparentRatio: Math.round(nonTransparentRatio * 1000) / 1000,
                                    coloredRatio: Math.round(coloredRatio * 1000) / 1000,
                                    samplePoints: samplePoints.length
                                });
                            } catch (error) {
                                resolve({
                                    hasContent: false,
                                    error: error.message
                                });
                            }
                        }, 500);  // 等待 500ms 让 Canvas 渲染
                    } catch (error) {
                        resolve({
                            hasContent: false,
                            error: error.message
                        });
                    }
                });
            }, selector).catch((error) => ({
                hasContent: false,
                error: error.message
            }));

            result.hasContent = result.pixelCheck.hasContent;
        }

        // 尝试等待可见性
        if (!result.visible) {
            const canvas = page.locator(selector);
            result.visible = await canvas.isVisible({ timeout }).catch(() => false);
        }

        // 判断是否成功：必须存在、有尺寸、可见、且有内容
        result.success = result.exists && result.hasSize && result.visible;

        if (!result.success) {
            if (!result.hasSize) {
                result.error = 'Canvas 存在但尺寸为 0';
            } else if (!result.visible) {
                result.error = 'Canvas 存在但不可见';
            }
        }

        return result;

    } catch (error) {
        result.error = error.message;
        return result;
    }
}

/**
 * 识别转盘页面状态
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回状态信息
 */
async function detectTurntableState(page) {
    console.log('        🔍 开始识别转盘页面状态...');

    // 等待页面稳定
    await page.waitForLoadState('domcontentloaded').catch(() => { });
    await page.waitForTimeout(1500);

    // 🔥 状态1检测：Cash everyday + 礼物盒（首次进入/新一轮）
    const cashEverydayVisible = await page.locator('text=Cash everyday')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

    const chooseRewardVisible = await page.locator('text=Choose your reward')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

    if (cashEverydayVisible || chooseRewardVisible) {
        console.log('        ✅ 检测到状态1: Cash everyday 礼物选择界面');

        // 检查礼物盒数量
        const giftItems = page.locator('.gift_item');
        const giftCount = await giftItems.count().catch(() => 0);

        return {
            state: 'gift_selection',
            description: 'Cash everyday 礼物选择',
            giftCount,
            needsGiftSelection: giftCount > 0
        };
    }

    // 🔥 状态2检测：Invitation Wheel（活动已开启）
    const invitationWheelVisible = await page.locator('text=Invitation Wheel')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

    const cashOutVisible = await page.locator('text=CASH OUT')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

    const inviteFriendsVisible = await page.locator('text=INVITE FRIENDS FOR REWARDS')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

    if (invitationWheelVisible || cashOutVisible || inviteFriendsVisible) {
        console.log('        ✅ 检测到状态2: Invitation Wheel 转盘界面');

        return {
            state: 'wheel_active',
            description: 'Invitation Wheel 转盘界面',
            needsGiftSelection: false
        };
    }

    // 未识别状态
    console.log('        ⚠️ 未能识别转盘页面状态');
    return {
        state: 'unknown',
        description: '未知状态',
        needsGiftSelection: false
    };
}

/**
 * 处理礼物选择（状态1）
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - auth 对象
 * @returns {Promise<boolean>} 是否成功
 */
async function handleGiftSelection(page, auth) {
    console.log('        🎁 开始处理礼物选择...');

    // 查找礼物列表
    const giftList = page.locator('.gift_list');
    const giftListVisible = await giftList.isVisible({ timeout: 3000 }).catch(() => false);

    if (!giftListVisible) {
        console.log('        ⚠️ 未找到 .gift_list');
        return false;
    }

    // 获取所有礼物盒
    const giftItems = giftList.locator('.gift_item');
    const itemCount = await giftItems.count();

    if (itemCount === 0) {
        console.log('        ⚠️ gift_list 中没有找到 gift_item');
        return false;
    }

    console.log(`        📦 找到 ${itemCount} 个礼物盒`);

    // 🔥 随机点击一个礼物盒（最多前4个）
    const randomIndex = Math.floor(Math.random() * Math.min(itemCount, 4));

    try {
        await giftItems.nth(randomIndex).click({ timeout: 5000 });
        console.log(`        ✅ 已点击第 ${randomIndex + 1} 个礼物盒`);

        // 🔥 标记本次测试已经选择过礼物
        auth.turntableGiftSelected = true;

        // 等待动画和页面切换
        await page.waitForTimeout(2000);

        // 🔥 等待转盘界面出现
        const wheelAppeared = await page.locator('text=Invitation Wheel')
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (wheelAppeared) {
            console.log('        ✅ 礼物选择后，转盘界面已出现');
            return true;
        } else {
            console.log('        ⚠️ 礼物选择后，未检测到转盘界面');
            return false;
        }

    } catch (error) {
        console.log(`        ❌ 点击礼物盒失败: ${error.message}`);
        return false;
    }
}

/**
 * 邀请转盘的初始化 - 前置条件
 * 智能识别页面状态并处理
 * 
 * @param {Page} page - Playwright page 对象
 * @param {TestCase} test - TestCase 实例
 * @param {Object} auth - auth 对象
 * @param {Object} options - 配置选项
 * @param {string} options.actionName - 操作名称，用于错误日志
 * @returns {Promise<Object>} 返回初始化结果
 */
export async function turntablePlay(page, test, auth, options = {}) {
    const { actionName = '转盘初始化' } = options;

    try {
        console.log(`        🎯 开始${actionName}...`);

        // 🔥 步骤1: 识别页面状态
        const state = await detectTurntableState(page);
        console.log(`        📊 当前状态: ${state.description}`);

        // 🔥 步骤2: 根据状态处理
        if (state.state === 'gift_selection' && state.needsGiftSelection) {
            // 状态1: 需要选择礼物
            console.log('        🎁 检测到礼物选择界面，开始处理...');

            const giftSuccess = await handleGiftSelection(page, auth);

            if (!giftSuccess) {
                console.log('        ⚠️ 礼物选择处理失败，但继续执行');
            }

        } else if (state.state === 'wheel_active') {
            // 状态2: 转盘已激活
            console.log('        ✅ 转盘已激活，无需礼物选择');

        } else {
            // 未知状态
            console.log('        ⚠️ 未识别状态，尝试继续执行');
        }

        // 🔥 步骤3: 等待并验证转盘界面
        await page.waitForTimeout(1000);

        console.log('        🔍 验证转盘界面元素...');

        // 检查关键元素
        const invitationWheel = await page.locator('text=Invitation Wheel')
            .isVisible({ timeout: 3000 })
            .catch(() => false);

        const cashOut = await page.locator('text=CASH OUT')
            .isVisible({ timeout: 3000 })
            .catch(() => false);

        const inviteFriends = await page.locator('text=INVITE FRIENDS FOR REWARDS')
            .isVisible({ timeout: 3000 })
            .catch(() => false);

        console.log(`        📊 转盘元素检测: Invitation Wheel=${invitationWheel}, CASH OUT=${cashOut}, INVITE FRIENDS=${inviteFriends}`);

        if (invitationWheel || cashOut || inviteFriends) {
            console.log('        ✅ 转盘界面验证成功');
        } else {
            console.log('        ⚠️ 未找到转盘特征元素');
        }

        // 🔥 步骤4: 等待 Canvas 渲染
        console.log('        ⏳ 等待转盘 Canvas 渲染...');

        // 🔥 增加等待时间，给 Canvas 更多时间加载和渲染
        await page.waitForTimeout(5000);

        // 检查 Canvas 是否存在并已渲染
        const canvasCheck = await checkCanvasLoaded(page, {
            selector: '#turntable_canvas canvas',
            timeout: 5000,
            waitBeforeCheck: 1000,
            checkPixels: true  // 🔥 启用像素检查
        });

        console.log(`        📊 Canvas 检查结果:`);
        console.log(`           存在: ${canvasCheck.exists}`);
        console.log(`           有尺寸: ${canvasCheck.hasSize}`);
        console.log(`           可见: ${canvasCheck.visible}`);
        console.log(`           有内容: ${canvasCheck.hasContent}`);

        if (canvasCheck.canvasInfo) {
            console.log(`        📊 Canvas 详细信息:`);
            console.log(`           尺寸: ${canvasCheck.canvasInfo.width}x${canvasCheck.canvasInfo.height}`);
            console.log(`           显示尺寸: ${Math.round(canvasCheck.canvasInfo.displayWidth)}x${Math.round(canvasCheck.canvasInfo.displayHeight)}`);
            console.log(`           位置: (${canvasCheck.canvasInfo.rectLeft}, ${canvasCheck.canvasInfo.rectTop})`);
        }

        if (canvasCheck.pixelCheck) {
            console.log(`        🎨 Canvas 像素检查:`);
            if (canvasCheck.pixelCheck.error) {
                console.log(`           错误: ${canvasCheck.pixelCheck.error}`);
            } else {
                console.log(`           采样点: ${canvasCheck.pixelCheck.samplePoints} 个区域`);
                console.log(`           非透明像素: ${canvasCheck.pixelCheck.nonTransparentPixels}/${canvasCheck.pixelCheck.totalPixels} (${(canvasCheck.pixelCheck.nonTransparentRatio * 100).toFixed(1)}%)`);
                console.log(`           有色像素: ${canvasCheck.pixelCheck.coloredPixels}/${canvasCheck.pixelCheck.totalPixels} (${(canvasCheck.pixelCheck.coloredRatio * 100).toFixed(1)}%)`);
            }
        }

        // 🔥 如果基本检查失败或内容检查失败，先截图报错，再重试
        if (!canvasCheck.success || !canvasCheck.hasContent) {
            const errorMsg = !canvasCheck.success
                ? `Canvas 基本检查失败: ${canvasCheck.error}`
                : 'Canvas 存在但没有渲染内容（空白）';

            console.log(`        ❌ ${errorMsg}`);

            // 🔥 1. 先截图
            if (test && test.captureErrorScreenshot) {
                await test.captureErrorScreenshot('canvas-load-failed');
                console.log('        📸 已截图保存错误现场');
            }

            // 🔥 2. 标记测试失败（统计错误）
            if (test && test.markPageTestFailed) {
                test.markPageTestFailed(errorMsg);
                console.log('        📝 已记录错误到测试报告');
            }

            // 🔥 3. 尝试刷新页面重新加载 Canvas
            console.log('        🔄 尝试刷新页面重新加载 Canvas...');
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);

            // 🔥 4. 再次检查
            const retryCheck = await checkCanvasLoaded(page, {
                selector: '#turntable_canvas canvas',
                timeout: 5000,
                waitBeforeCheck: 2000,
                checkPixels: true
            });

            if (retryCheck.success && retryCheck.hasContent) {
                console.log('        ✅ 刷新后 Canvas 加载成功');
            } else {
                const retryError = !retryCheck.success
                    ? `Canvas 基本检查失败: ${retryCheck.error}`
                    : 'Canvas 仍然没有渲染内容';
                console.log(`        ⚠️ 刷新后 Canvas 仍未加载: ${retryError}`);

                // 🔥 再次截图和记录错误
                if (test && test.captureErrorScreenshot) {
                    await test.captureErrorScreenshot('canvas-load-failed-retry');
                }
                if (test && test.markPageTestFailed) {
                    test.markPageTestFailed(`刷新后${retryError}`);
                }
            }
        } else {
            console.log('        ✅ Canvas 已成功加载（基本检查和内容检查都通过）');
        }

        console.log(`        ✅ ${actionName}完成`);

        return {
            success: true,
            state: state.state,
            giftSelected: auth.turntableGiftSelected || false
        };

    } catch (error) {
        console.log(`        ❌ ${actionName}失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
