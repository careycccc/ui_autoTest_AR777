import { handleFailure } from '../utils.js';
import { getApiResponseData, getApiResponses } from '../utils.js';

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
 * @param {string} options.position - 点击位置：'bottom'(底部), 'top'(顶部), 'left'(左侧), 'right'(右侧), 'center'(中心)
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
 * @param {string} options.position - 点击位置，默认 'bottom'
 * @param {number} options.angle - 自定义角度（度数，0-360）
 * @param {boolean} options.checkRemainCount - 是否检查剩余次数，默认 true
 * @param {number} options.animationWait - 旋转动画等待时间（毫秒），默认 3000
 * @returns {Promise<Object>} 返回结果对象
 * 
 * @example
 * const result = await rotateTurntable(page, test, {
 *     canvasSelector: '#turntable_canvas canvas',
 *     ratio: 0.86,
 *     position: 'bottom',
 *     checkRemainCount: true,
 *     animationWait: 3000
 * });
 */
export async function rotateTurntable(page, test, options = {}) {
    const {
        canvasSelector = '#turntable_canvas canvas',
        ratio = 0.86,
        position = 'bottom',
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
            req.url.includes('/api/Activity/DoInvitedWheel')
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
            }
        } else {
            console.log(`        ⚠️ 未找到旋转结果接口`);
        }

        // 7. 获取旋转后的剩余次数
        if (checkRemainCount) {
            // 等待一下，确保转盘信息接口已更新
            await page.waitForTimeout(500);

            const afterCountResult = getWheelRemainCount(test);
            if (afterCountResult.success) {
                result.afterRemainCount = afterCountResult.remainCount;
                console.log(`        ℹ️ 旋转后剩余次数: ${result.afterRemainCount}`);

                // 验证次数是否正确减少
                if (result.beforeRemainCount !== null && result.afterRemainCount !== null) {
                    const expectedCount = result.beforeRemainCount - 1;
                    if (result.afterRemainCount === expectedCount) {
                        console.log(`        ✅ 次数正确减少 (${result.beforeRemainCount} -> ${result.afterRemainCount})`);
                    } else {
                        console.log(`        ⚠️ 次数变化异常 (期望: ${expectedCount}, 实际: ${result.afterRemainCount})`);
                    }
                }
            }
        }

        // 8. 检查页面上的奖励弹窗（可选）
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
