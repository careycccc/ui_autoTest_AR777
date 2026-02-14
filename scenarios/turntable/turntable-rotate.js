import { handleFailure } from '../utils.js';
import { getApiResponseData, getApiResponses } from '../utils.js';

/**
 * 检查是否需要执行转盘旋转
 * @param {Page} page - Playwright page 对象
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回检查结果
 */
export async function shouldRotateTurntable(page, test) {
    const result = {
        shouldRotate: false,
        reason: '',
        currentAmount: 0,
        targetAmount: 0,
        remainCount: 0
    };

    try {
        // 1. 获取接口数据
        const wheelInfo = getWheelRemainCount(test);

        if (!wheelInfo.success) {
            result.reason = '无法获取转盘信息接口';
            console.log(`        ⚠️ ${result.reason}`);
            return result;
        }

        result.remainCount = wheelInfo.remainCount;
        result.currentAmount = wheelInfo.currentAmount;
        result.targetAmount = wheelInfo.totalPrizeAmount;

        // 2. 检查剩余次数
        if (wheelInfo.remainCount === 0) {
            result.reason = '剩余次数为 0';
            console.log(`        ℹ️ ${result.reason}，无需旋转`);
            return result;
        }

        // 3. 获取页面显示的金额
        const displayAmount = await page.evaluate(() => {
            const amountEl = document.querySelector('.scroll_num');
            if (!amountEl) return null;

            const text = amountEl.textContent || '';
            // 移除货币符号和逗号，提取数字
            const match = text.replace(/[₹,]/g, '').trim();
            return parseFloat(match) || 0;
        }).catch(() => null);

        if (displayAmount === null) {
            console.log('        ⚠️ 无法读取页面显示金额，继续检查接口数据');
        } else {
            console.log(`        📊 页面显示金额: ${displayAmount}`);

            // 4. 对比页面金额和目标金额
            if (displayAmount >= wheelInfo.totalPrizeAmount) {
                result.reason = `页面显示金额 (${displayAmount}) 已达到目标金额 (${wheelInfo.totalPrizeAmount})`;
                console.log(`        ℹ️ ${result.reason}，无需旋转`);
                return result;
            }
        }

        // 5. 对比接口金额和目标金额
        if (wheelInfo.currentAmount >= wheelInfo.totalPrizeAmount) {
            result.reason = `当前金额 (${wheelInfo.currentAmount}) 已达到目标金额 (${wheelInfo.totalPrizeAmount})`;
            console.log(`        ℹ️ ${result.reason}，无需旋转`);
            return result;
        }

        // 6. 可以旋转
        result.shouldRotate = true;
        result.reason = '满足旋转条件';
        console.log(`        ✅ ${result.reason}`);
        console.log(`           剩余次数: ${result.remainCount}`);
        console.log(`           当前金额: ${result.currentAmount}`);
        console.log(`           目标金额: ${result.targetAmount}`);

        return result;

    } catch (error) {
        result.reason = `检查失败: ${error.message}`;
        console.log(`        ❌ ${result.reason}`);
        return result;
    }
}

/**
 * 获取转盘剩余次数（从已请求的接口中获取）
 * 
 * @param {TestCase} test - TestCase 实例
 * @returns {Object} 返回结果对象
 * 
 * @example
 * const result = getWheelRemainCount(test);
 * console.log('剩余次数:', result.remainCount);
 * console.log('是否应该 CASH OUT:', result.shouldCashOut);
 */
export function getWheelRemainCount(test) {
    const result = {
        success: false,
        remainCount: 0,
        currentAmount: 0,
        totalPrizeAmount: 0,
        shouldCashOut: false,
        data: null,
        error: null
    };

    try {
        // 使用通用函数获取转盘信息接口的数据
        const data = getApiResponseData(test, [
            '/api/Activity/GetUserInvitedWheelInfo'
        ]);

        const wheelInfo = data['/api/Activity/GetUserInvitedWheelInfo'];

        if (!wheelInfo) {
            result.error = '未找到转盘信息接口';
            console.log('        ⚠️', result.error);
            return result;
        }

        result.success = true;
        result.data = wheelInfo;

        // 提取真正的旋转次数：userInvitedWheelCount
        result.remainCount = wheelInfo.data?.userInvitedWheelCount || 0;

        // 提取当前金额和总奖金金额
        result.currentAmount = wheelInfo.data?.userInvitedWheelAmount || 0;
        result.totalPrizeAmount = wheelInfo.data?.invitedWheelTotalPrizeAmount || 0;

        // 判断是否应该 CASH OUT（当前金额 >= 总奖金金额）
        result.shouldCashOut = result.currentAmount >= result.totalPrizeAmount;

        console.log('        ✅ 转盘信息:');
        console.log(`           剩余次数: ${result.remainCount}`);
        console.log(`           当前金额: ${result.currentAmount}`);
        console.log(`           总奖金: ${result.totalPrizeAmount}`);
        console.log(`           应该 CASH OUT: ${result.shouldCashOut ? '是' : '否'}`);

        return result;

    } catch (error) {
        result.error = error.message;
        console.log('        ❌ 获取剩余次数失败:', error.message);
        return result;
    }
}

/**
 * 点击 CASH OUT 按钮
 * 
 * @param {Page} page - Playwright page 对象
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回结果对象
 */
export async function clickCashOut(page, test) {
    const result = {
        success: false,
        error: null
    };

    try {
        console.log('        💰 准备点击 CASH OUT...');

        // 查找 CASH OUT 按钮
        const cashOutBtn = page.locator('.cash_btn.btn_main_style', { hasText: 'CASH OUT' });
        const isVisible = await cashOutBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVisible) {
            result.error = 'CASH OUT 按钮不可见';
            console.log(`        ❌ ${result.error}`);
            return result;
        }

        // 点击按钮
        await cashOutBtn.click();
        console.log('        ✅ 已点击 CASH OUT 按钮');

        // 等待可能的弹窗或页面跳转
        await page.waitForTimeout(2000);

        result.success = true;
        return result;

    } catch (error) {
        result.error = error.message;
        console.log(`        ❌ 点击 CASH OUT 失败: ${error.message}`);
        return result;
    }
}

/**
 * 点击 Canvas 转盘的特定区域
 * 
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {string} options.canvasSelector - Canvas 选择器，默认 '#turntable_canvas canvas'
 * @param {number} options.ratio - 点击位置比例（0-1），默认 0.86
 * @param {string} options.position - 点击位置：'x2'(转盘中心剩余次数区域), 'center'(中心), 'bottom'(底部), 'top'(顶部), 'left'(左侧), 'right'(右侧)
 * @param {number} options.angle - 自定义角度（度数，0-360），0度为右侧，90度为底部
 * @returns {Promise<Object>} 返回结果对象
 */
export async function clickCanvasArea(page, options = {}) {
    const {
        canvasSelector = '#turntable_canvas canvas',
        ratio = 0.86,
        position = 'bottom',
        angle = null
    } = options;

    const result = {
        success: false,
        clickX: 0,
        clickY: 0,
        absoluteX: 0,
        absoluteY: 0,
        error: null
    };

    try {
        console.log(`        🎯 准备点击 Canvas 区域 (${position})...`);

        // 🔥 优先使用精确的选择器
        const possibleSelectors = [
            '#turntable_canvas canvas',  // 最精确的选择器
            '#turntable_canvas',         // 容器本身
            '.turntable_all canvas',     // 通过父容器查找
            'div[id="turntable_canvas"] canvas'  // 更严格的选择器
        ];

        let canvas = null;
        let usedSelector = null;

        for (const selector of possibleSelectors) {
            const testCanvas = page.locator(selector).first();
            const count = await testCanvas.count();

            if (count > 0) {
                const isVisible = await testCanvas.isVisible({ timeout: 1000 }).catch(() => false);

                if (isVisible) {
                    // 🔥 验证 Canvas 尺寸是否合理（转盘 Canvas 应该是正方形或接近正方形）
                    const box = await testCanvas.boundingBox();
                    if (box) {
                        const aspectRatio = box.width / box.height;
                        console.log(`        🔍 检查 Canvas: ${selector}, 尺寸: ${Math.round(box.width)}x${Math.round(box.height)}, 宽高比: ${aspectRatio.toFixed(2)}`);

                        // 转盘 Canvas 的宽高比应该在 0.5 到 2 之间（不是整个页面）
                        if (aspectRatio > 0.5 && aspectRatio < 2 && box.width < 600) {
                            canvas = testCanvas;
                            usedSelector = selector;
                            console.log(`        ✅ 找到合适的 Canvas: ${selector}`);
                            break;
                        } else {
                            console.log(`        ⚠️ Canvas 尺寸不合理，跳过: ${selector}`);
                        }
                    }
                }
            }
        }

        if (!canvas) {
            result.error = '未找到合适的转盘 Canvas 元素';
            console.log(`        ❌ ${result.error}`);
            console.log(`        🔍 尝试过的选择器: ${possibleSelectors.join(', ')}`);
            return result;
        }

        // 获取 Canvas 的位置和尺寸
        const boundingBox = await canvas.boundingBox();
        if (!boundingBox) {
            result.error = 'Canvas boundingBox 获取失败';
            console.log(`        ❌ ${result.error}`);
            return result;
        }

        console.log(`        📐 Canvas 尺寸: ${Math.round(boundingBox.width)}x${Math.round(boundingBox.height)}`);

        // 计算圆心
        const centerX = boundingBox.width / 2;
        const centerY = boundingBox.height / 2;
        const radius = Math.min(boundingBox.width, boundingBox.height) / 2;

        // 计算点击位置（相对于 Canvas）
        let clickX, clickY;

        if (angle !== null) {
            // 使用自定义角度
            const radian = (angle * Math.PI) / 180;
            clickX = centerX + radius * ratio * Math.cos(radian);
            clickY = centerY + radius * ratio * Math.sin(radian);
        } else {
            // 使用预设位置
            switch (position) {
                case 'x2':
                case 'X2':
                    // 点击转盘中心的剩余次数区域（显示 X2、X3、X5 等）
                    // 这个区域位置固定在转盘中心偏下位置
                    // X 坐标：Canvas 宽度的 50%（中心）
                    // Y 坐标：Canvas 高度的 64%（中心偏下）
                    // 根据实际 Canvas 尺寸动态计算
                    clickX = boundingBox.width * 0.50;
                    clickY = boundingBox.height * 0.64;
                    console.log(`        🎯 目标: 转盘中心剩余次数区域 (相对坐标: ${Math.round(clickX)}, ${Math.round(clickY)})`);
                    break;
                case 'bottom':
                    clickX = centerX;
                    clickY = centerY + radius * ratio;
                    break;
                case 'top':
                    clickX = centerX;
                    clickY = centerY - radius * ratio;
                    break;
                case 'left':
                    clickX = centerX - radius * ratio;
                    clickY = centerY;
                    break;
                case 'right':
                    clickX = centerX + radius * ratio;
                    clickY = centerY;
                    break;
                case 'center':
                    clickX = centerX;
                    clickY = centerY;
                    break;
                default:
                    clickX = centerX;
                    clickY = centerY + radius * ratio;
            }
        }

        // 计算页面绝对坐标
        const absoluteX = boundingBox.x + clickX;
        const absoluteY = boundingBox.y + clickY;

        result.clickX = Math.round(clickX);
        result.clickY = Math.round(clickY);
        result.absoluteX = Math.round(absoluteX);
        result.absoluteY = Math.round(absoluteY);

        console.log(`        ✓ 计算点击位置: 相对(${result.clickX}, ${result.clickY}), 绝对(${result.absoluteX}, ${result.absoluteY})`);

        // 执行点击
        await page.mouse.click(absoluteX, absoluteY);
        console.log(`        ✅ 已点击 Canvas 区域`);

        result.success = true;
        return result;

    } catch (error) {
        result.error = error.message;
        console.log(`        ❌ 点击 Canvas 失败: ${error.message}`);
        return result;
    }
}

/**
 * 转盘旋转（完整流程）
 * 
 * @param {Page} page - Playwright page 对象
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @param {string} options.canvasSelector - Canvas 选择器，默认 '#turntable_canvas canvas'
 * @param {number} options.ratio - 点击位置比例，默认 0.86
 * @param {string} options.position - 点击位置，可选值: 'x2'(转盘中心剩余次数区域), 'center', 'bottom', 'top', 'left', 'right'，默认 'x2'
 * @param {number} options.angle - 自定义角度（度数，0-360）
 * @param {boolean} options.checkRemainCount - 是否检查剩余次数，默认 true
 * @param {number} options.animationWait - 旋转动画等待时间（毫秒），默认 3000
 * @returns {Promise<Object>} 返回结果对象
 * 
 * @example
 * const result = await rotateTurntable(page, test, {
 *     canvasSelector: '#turntable_canvas canvas',
 *     ratio: 0.86,
 *     position: 'x2',  // 点击转盘中心的剩余次数区域
 *     checkRemainCount: true,
 *     animationWait: 3000
 * });
 */
export async function rotateTurntable(page, test, options = {}) {
    const {
        canvasSelector = '#turntable_canvas canvas',
        ratio = 0.86,
        position = 'x2',  // 默认点击 X2 红色圆圈中心区域
        angle = null,
        checkRemainCount = true,
        animationWait = 3000
    } = options;

    const result = {
        success: false,
        clicked: false,
        beforeRemainCount: null,
        afterRemainCount: null,
        spinResult: null,
        reward: null,
        clickPosition: null,
        error: null
    };

    try {
        console.log('        🎰 开始转盘旋转...');

        // 1. 检查剩余次数（如果需要）
        if (checkRemainCount) {
            const countResult = getWheelRemainCount(test);

            result.beforeRemainCount = countResult.remainCount;

            if (!countResult.success) {
                result.error = '无法获取剩余次数';
                console.log(`        ⚠️ ${result.error}`);
                return result;
            }

            // 检查是否应该 CASH OUT
            if (countResult.shouldCashOut) {
                result.error = '已达到总奖金金额，应该点击 CASH OUT';
                console.log(`        💰 ${result.error}`);
                console.log(`           当前金额: ${countResult.currentAmount} >= 总奖金: ${countResult.totalPrizeAmount}`);
                return result;
            }

            if (countResult.remainCount <= 0) {
                result.error = '剩余次数不足';
                console.log(`        ⚠️ ${result.error}，跳过旋转`);
                return result;
            }

            console.log(`        ✅ 剩余次数充足: ${countResult.remainCount}`);
        }

        // 2. 记录旋转前的请求数量（用于后续获取新的 API 响应）
        const beforeRequestCount = test.networkMonitor.getApiRequests().length;

        // 🔥 2.5. 刷新页面后，等待 Canvas 渲染
        console.log('        🔍 等待 Canvas 渲染...');

        // 等待足够时间确保 Canvas 已渲染
        await page.waitForTimeout(3000);

        // 3. 点击 Canvas 区域执行旋转
        const clickResult = await clickCanvasArea(page, {
            canvasSelector,
            ratio,
            position,
            angle
        });

        if (!clickResult.success) {
            result.error = clickResult.error;
            return await handleFailure(test, `点击 Canvas 失败: ${clickResult.error}`, { throwError: false });
        }

        result.clicked = true;
        result.clickPosition = {
            x: clickResult.absoluteX,
            y: clickResult.absoluteY
        };

        // 4. 等待旋转动画完成
        console.log(`        ⏳ 等待旋转动画 (${animationWait}ms)...`);
        await page.waitForTimeout(animationWait);

        // 5. 获取旋转后的新请求
        const allRequests = test.networkMonitor.getApiRequests();
        const newRequests = allRequests.slice(beforeRequestCount);

        console.log(`        📊 旋转过程中发起了 ${newRequests.length} 个新请求`);

        // 6. 查找旋转结果接口
        const spinRequest = newRequests.find(req =>
            req.url.includes('/api/Activity/SpinInvitedWheel')
        );

        if (spinRequest) {
            result.spinResult = {
                url: spinRequest.url,
                status: spinRequest.response?.status,
                data: spinRequest.responseBody,
                duration: Math.round(spinRequest.duration)
            };

            console.log(`        ✅ 获取到旋转结果 API:`);
            console.log(`           URL: ${spinRequest.url}`);
            console.log(`           状态: ${spinRequest.response?.status}`);
            console.log(`           耗时: ${result.spinResult.duration}ms`);

            // 提取奖励信息
            if (spinRequest.responseBody) {
                result.reward = extractRewardInfo(spinRequest.responseBody);
                if (result.reward) {
                    console.log(`        🎁 获得奖励:`, result.reward);
                }

                // 🔥 提取 prizeAmount
                const prizeAmount = spinRequest.responseBody?.data?.prizeAmount;
                if (prizeAmount !== undefined) {
                    console.log(`        💰 本次奖励金额: ${prizeAmount}`);
                    result.prizeAmount = prizeAmount;
                }
            }
        } else {
            // 🔥 未找到旋转接口 - 报错并截图
            console.log(`        ❌ 未找到旋转结果接口 /api/Activity/SpinInvitedWheel`);
            result.error = '未找到旋转结果接口';

            // 截图
            if (test && test.captureErrorScreenshot) {
                await test.captureErrorScreenshot('spin-api-not-found', '旋转后未找到 SpinInvitedWheel 接口');
                console.log('        📸 已截图保存错误现场');
            }

            // 标记测试失败
            if (test && test.markPageTestFailed) {
                test.markPageTestFailed('旋转后未找到 SpinInvitedWheel 接口');
                console.log('        📝 已记录错误到测试报告');
            }

            return result;
        }

        // 7. 读取页面显示的金额并验证
        const displayAmount = await page.evaluate(() => {
            const amountEl = document.querySelector('.scroll_num');
            if (!amountEl) return null;

            const text = amountEl.textContent || '';
            const match = text.replace(/[₹,]/g, '').trim();
            return parseFloat(match) || 0;
        }).catch(() => null);

        if (displayAmount !== null) {
            console.log(`        📊 页面显示金额: ${displayAmount}`);
            result.displayAmount = displayAmount;

            // 对比目标金额
            const afterCountResult = getWheelRemainCount(test);
            if (afterCountResult.success) {
                const targetAmount = afterCountResult.totalPrizeAmount;
                if (displayAmount >= targetAmount) {
                    console.log(`        💰 页面显示金额已达到目标 (${displayAmount} >= ${targetAmount})`);
                    result.reachedTarget = true;
                }
            }
        }

        // 8. 获取旋转后的剩余次数
        if (checkRemainCount) {
            // 等待一下，确保转盘信息接口已更新
            await page.waitForTimeout(500);

            const afterCountResult = getWheelRemainCount(test);
            if (afterCountResult.success) {
                result.afterRemainCount = afterCountResult.remainCount;
                console.log(`        ℹ️ 旋转后剩余次数: ${result.afterRemainCount}`);
            }
        }

        // 9. 检查页面上的奖励弹窗（可选）
        const rewardPopup = page.locator('.reward-popup, .prize-popup, [class*="reward"], [class*="prize"]');
        const popupVisible = await rewardPopup.first().isVisible({ timeout: 2000 }).catch(() => false);

        if (popupVisible) {
            const rewardText = await rewardPopup.first().innerText().catch(() => '');
            console.log(`        🎁 奖励弹窗显示: ${rewardText.substring(0, 100)}`);

            if (!result.reward) {
                result.reward = { displayText: rewardText };
            }
        }

        result.success = true;
        console.log('        ✅ 转盘旋转完成');
        return result;

    } catch (error) {
        result.error = error.message;
        console.log(`        ❌ 转盘旋转失败: ${error.message}`);
        return await handleFailure(test, `转盘旋转失败: ${error.message}`, { throwError: false });
    }
}

/**
 * 从 API 响应中提取奖励信息
 * 根据实际 API 结构调整此函数
 */
function extractRewardInfo(responseData) {
    // 常见的 API 响应结构
    if (responseData.data) {
        const data = responseData.data;

        // 结构 1: { data: { reward: {...}, prize: {...} } }
        if (data.reward) return data.reward;
        if (data.prize) return data.prize;

        // 结构 2: { data: { rewardType, rewardAmount, rewardName } }
        if (data.rewardType || data.rewardAmount || data.rewardName) {
            return {
                type: data.rewardType,
                amount: data.rewardAmount,
                name: data.rewardName
            };
        }

        // 结构 3: { data: { type, value, name } }
        if (data.type || data.value || data.name) {
            return {
                type: data.type,
                value: data.value,
                name: data.name
            };
        }
    }

    // 结构 4: { reward: {...} } 直接在根级别
    if (responseData.reward) return responseData.reward;
    if (responseData.prize) return responseData.prize;

    return null;
}

/**
 * 循环旋转转盘直到次数用完
 * 
 * @param {Page} page - Playwright page 对象
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @param {number} options.maxSpins - 最大旋转次数（防止无限循环），默认 10
 * @param {number} options.delayBetweenSpins - 每次旋转之间的延迟（毫秒），默认 1000
 * @returns {Promise<Object>} 返回结果对象
 * 
 * @example
 * const result = await spinUntilEmpty(page, test, {
 *     maxSpins: 10,
 *     delayBetweenSpins: 1000
 * });
 * console.log('总共旋转:', result.totalSpins, '次');
 */
export async function spinUntilEmpty(page, test, options = {}) {
    const {
        maxSpins = 10,
        delayBetweenSpins = 1000,
        ...rotateOptions
    } = options;

    const result = {
        success: false,
        totalSpins: 0,
        rewards: [],
        error: null
    };

    try {
        console.log('        🔄 开始循环旋转...');

        for (let i = 0; i < maxSpins; i++) {
            // 检查剩余次数
            const countResult = getWheelRemainCount(test);

            if (!countResult.success || countResult.remainCount <= 0) {
                console.log(`        ✅ 完成 ${result.totalSpins} 次旋转，次数已用完`);
                result.success = true;
                break;
            }

            console.log(`\n        🎰 第 ${i + 1} 次旋转 (剩余次数: ${countResult.remainCount})...`);

            // 执行旋转
            const spinResult = await rotateTurntable(page, test, {
                ...rotateOptions,
                checkRemainCount: true
            });

            if (!spinResult.success) {
                if (spinResult.error === '剩余次数不足') {
                    console.log(`        ✅ 完成 ${result.totalSpins} 次旋转，次数已用完`);
                    result.success = true;
                    break;
                } else {
                    result.error = spinResult.error;
                    console.log(`        ❌ 旋转失败: ${spinResult.error}`);
                    break;
                }
            }

            result.totalSpins++;

            if (spinResult.reward) {
                result.rewards.push(spinResult.reward);
                console.log(`        🎁 第 ${result.totalSpins} 次奖励:`, spinResult.reward);
            }

            // 等待一下再继续
            if (i < maxSpins - 1 && delayBetweenSpins > 0) {
                await page.waitForTimeout(delayBetweenSpins);
            }
        }

        if (result.totalSpins >= maxSpins) {
            console.log(`        ⚠️ 达到最大旋转次数限制 (${maxSpins})`);
        }

        console.log(`\n        📊 旋转统计:`);
        console.log(`           总次数: ${result.totalSpins}`);
        console.log(`           获得奖励: ${result.rewards.length} 个`);

        return result;

    } catch (error) {
        result.error = error.message;
        console.log(`        ❌ 循环旋转失败: ${error.message}`);
        return result;
    }
}

/**
 * 打印转盘信息摘要
 * 
 * @param {TestCase} test - TestCase 实例
 */
export function printWheelSummary(test) {
    console.log('\n        🎰 转盘信息摘要:');
    console.log('        ' + '='.repeat(50));

    // 获取剩余次数
    const countResult = getWheelRemainCount(test);
    if (countResult.success) {
        console.log(`        � 剩余次数: ${countResult.remainCount}`);
    } else {
        console.log(`        ⚠️ 无法获取剩余次数`);
    }

    // 获取所有转盘相关的 API
    const responses = getApiResponses(test, [
        '/api/Activity/GetUserInvitedWheelInfo',
        '/api/Activity/DoInvitedWheel'
    ]);

    const infoResp = responses['/api/Activity/GetUserInvitedWheelInfo'];
    const spinResp = responses['/api/Activity/DoInvitedWheel'];

    if (infoResp) {
        console.log(`        ✅ 转盘信息 API: ${infoResp.status} (${infoResp.duration}ms)`);
    }

    if (spinResp) {
        console.log(`        ✅ 旋转结果 API: ${spinResp.status} (${spinResp.duration}ms)`);
        if (spinResp.data) {
            const reward = extractRewardInfo(spinResp.data);
            if (reward) {
                console.log(`        🎁 最近奖励:`, reward);
            }
        }
    }

    console.log('        ' + '='.repeat(50));
}
