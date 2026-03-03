/**
 * 红包雨活动处理模块
 * Red Pack Rain Activity Handler
 * 
 * 红包雨是一个特殊的首页弹窗活动，需要等待活动结束
 */

/**
 * 检测红包雨是否正在进行
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Object>} 返回检测结果
 */
export async function detectRedPackRain(page) {
    try {
        // 检查红包雨容器是否存在
        const container = page.locator('.red-pack-canvas-container');
        const exists = await container.count() > 0;

        if (!exists) {
            return {
                isActive: false,
                reason: '红包雨容器不存在'
            };
        }

        // 检查容器是否可见（display 不是 none）
        const isVisible = await page.evaluate(() => {
            const el = document.querySelector('.red-pack-canvas-container');
            if (!el) return false;

            const style = window.getComputedStyle(el);
            return style.display !== 'none';
        }).catch(() => false);

        if (!isVisible) {
            return {
                isActive: false,
                reason: '红包雨容器存在但不可见'
            };
        }

        // 检查倒计时文本
        const countdownText = await page.locator('.countdown_text')
            .textContent({ timeout: 2000 })
            .catch(() => '');

        // 提取剩余秒数
        const match = countdownText.match(/(\d+)s/);
        const remainingSeconds = match ? parseInt(match[1], 10) : 0;

        return {
            isActive: true,
            remainingSeconds,
            countdownText
        };

    } catch (error) {
        return {
            isActive: false,
            error: error.message
        };
    }
}

/**
 * 等待红包雨活动结束
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 配置选项
 * @param {number} options.maxWaitTime - 最大等待时间（毫秒），默认 10000ms (10秒)
 * @param {number} options.checkInterval - 检查间隔（毫秒），默认 1000ms
 * @returns {Promise<Object>} 返回等待结果
 */
export async function waitForRedPackRainEnd(page, options = {}) {
    const {
        maxWaitTime = 10000,
        checkInterval = 1000
    } = options;

    console.log('        🌧️ 检测到红包雨活动，等待活动结束...');

    const startTime = Date.now();
    let checkCount = 0;

    while (Date.now() - startTime < maxWaitTime) {
        checkCount++;

        // 检查红包雨是否还在进行
        const detection = await detectRedPackRain(page);

        if (!detection.isActive) {
            const elapsed = Date.now() - startTime;
            console.log(`        ✅ 红包雨活动已结束 (等待了 ${elapsed}ms, 检查了 ${checkCount} 次)`);
            return {
                success: true,
                waitTime: elapsed,
                checkCount,
                reason: detection.reason || '活动已结束'
            };
        }

        // 显示剩余时间
        if (detection.remainingSeconds !== undefined) {
            console.log(`        ⏳ 红包雨倒计时: ${detection.remainingSeconds}s (第 ${checkCount} 次检查)`);
        } else {
            console.log(`        ⏳ 等待红包雨结束... (第 ${checkCount} 次检查)`);
        }

        // 等待一段时间后再次检查
        await page.waitForTimeout(checkInterval);
    }

    // 超时
    const elapsed = Date.now() - startTime;
    console.log(`        ⚠️ 红包雨等待超时 (${elapsed}ms)，继续执行`);
    return {
        success: false,
        timeout: true,
        waitTime: elapsed,
        checkCount,
        reason: '等待超时'
    };
}

/**
 * 处理红包雨弹窗（首页弹窗处理函数）
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - auth 对象
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回处理结果
 */
export async function handleRedPackRainPopup(page, auth, test) {
    console.log('        🎯 处理红包雨弹窗...');

    try {
        // 检测红包雨
        const detection = await detectRedPackRain(page);

        if (!detection.isActive) {
            console.log(`        ℹ️ 红包雨未激活: ${detection.reason || '未知原因'}`);
            return {
                success: true,
                skipped: true,
                reason: detection.reason || '红包雨未激活'
            };
        }

        // 等待红包雨结束
        const waitResult = await waitForRedPackRainEnd(page, {
            maxWaitTime: 10000,  // 默认等待 10 秒
            checkInterval: 1000
        });

        if (waitResult.success) {
            console.log('        ✅ 红包雨弹窗处理完成');
            return {
                success: true,
                ...waitResult
            };
        } else {
            console.log('        ⚠️ 红包雨等待超时，但继续执行');
            return {
                success: true,
                timeout: true,
                ...waitResult
            };
        }

    } catch (error) {
        console.log(`        ❌ 红包雨弹窗处理失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
