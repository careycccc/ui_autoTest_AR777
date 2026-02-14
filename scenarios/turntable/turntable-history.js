/**
 * 邀请转盘 - 领取奖励历史检测
 */

/**
 * 检测并验证领取奖励历史页面
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - auth 对象
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回检测结果
 */
export async function checkCashOutHistory(page, auth, test) {
    console.log('        🎯 开始检测领取奖励历史...');

    try {
        // 步骤1: 查找并点击历史图标
        console.log('        🔍 步骤1: 查找历史图标...');

        const historyIconSelectors = [
            '.ar_icon.icon_History',
            'span.ar_icon.icon_History',
            '.icon_History',
            '[aria-hidden="true"] svg[width="48"][height="48"]'
        ];

        let historyIconClicked = false;

        for (const selector of historyIconSelectors) {
            try {
                const historyIcon = page.locator(selector).first();
                const visible = await historyIcon.isVisible({ timeout: 2000 }).catch(() => false);

                if (visible) {
                    console.log(`        ✓ 找到历史图标: ${selector}`);
                    await historyIcon.click();
                    console.log('        ✓ 已点击历史图标');
                    historyIconClicked = true;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
            }
        }

        if (!historyIconClicked) {
            return {
                success: false,
                error: '未找到历史图标'
            };
        }

        // 步骤2: 等待页面切换并验证历史页面
        console.log('        🔍 步骤2: 等待页面切换...');

        // 使用 switchToPage 切换到历史页面
        await test.switchToPage('领取奖励历史页', {
            waitForSelector: 'text=Wheel Cash Out History',
            waitTime: 2000,
            collectPreviousPage: true
        });

        console.log('        ✅ 已切换到领取奖励历史页面');

        // 验证页面标题
        const historyTitleSelectors = [
            'text=Wheel Cash Out History',
            ':text("Wheel Cash Out History")',
            'h1:has-text("Wheel Cash Out History")',
            'h2:has-text("Wheel Cash Out History")',
            'h3:has-text("Wheel Cash Out History")',
            '.title:has-text("Wheel Cash Out History")'
        ];

        let titleFound = false;

        for (const selector of historyTitleSelectors) {
            try {
                const titleEl = page.locator(selector).first();
                const visible = await titleEl.isVisible({ timeout: 2000 }).catch(() => false);

                if (visible) {
                    console.log(`        ✓ 找到页面标题: ${selector}`);
                    titleFound = true;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
            }
        }

        if (!titleFound) {
            console.log('        ⚠️ 未找到页面标题，但页面可能已切换');
        }

        // 步骤3: 等待2秒
        console.log('        ⏳ 步骤3: 等待 2 秒...');
        await page.waitForTimeout(2000);

        // 步骤4: 返回转盘页面
        console.log('        🔍 步骤4: 返回转盘页面...');

        // 记录当前 URL
        const beforeUrl = page.url();
        console.log(`        📍 当前 URL: ${beforeUrl}`);

        // 策略1: 尝试点击返回按钮
        const backButtonSelectors = [
            'span.ar_icon.back.back',
            '.ar_icon.back',
            '.back-btn',
            '.back',
            '[aria-label="back"]',
            'button:has-text("Back")'
        ];

        let backButtonClicked = false;

        for (const selector of backButtonSelectors) {
            try {
                const backBtn = page.locator(selector).first();
                const visible = await backBtn.isVisible({ timeout: 1000 }).catch(() => false);

                if (visible) {
                    console.log(`        ✓ 找到返回按钮: ${selector}`);
                    await backBtn.click();
                    console.log('        ✓ 已点击返回按钮');
                    backButtonClicked = true;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
            }
        }

        // 策略2: 如果没有找到返回按钮，使用路由返回
        if (!backButtonClicked) {
            console.log('        ⚠️ 未找到返回按钮，使用路由返回...');
            await page.goBack();
            console.log('        ✓ 已执行路由返回');
        }

        // 等待页面切换
        await page.waitForTimeout(1500);

        // 验证是否返回到转盘页面
        const afterUrl = page.url();
        console.log(`        📍 返回后 URL: ${afterUrl}`);

        const backToTurntable = afterUrl.includes('/turntable') && !afterUrl.includes('/history');

        if (backToTurntable) {
            console.log('        ✅ 已成功返回转盘页面');
        } else {
            console.log('        ⚠️ 可能未完全返回转盘页面');
        }

        // 验证转盘页面的关键元素
        const turntableElements = [
            'text=Invitation Wheel',
            'text=CASH OUT',
            '#turntable_canvas canvas'
        ];

        let turntableElementFound = false;

        for (const selector of turntableElements) {
            try {
                const el = page.locator(selector).first();
                const visible = await el.isVisible({ timeout: 2000 }).catch(() => false);

                if (visible) {
                    console.log(`        ✓ 找到转盘元素: ${selector}`);
                    turntableElementFound = true;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
            }
        }

        if (!turntableElementFound) {
            console.log('        ⚠️ 未找到转盘关键元素，但可能已返回');
        }

        return {
            success: true,
            historyPageVisited: true,
            backToTurntable: backToTurntable,
            turntableElementFound: turntableElementFound
        };

    } catch (error) {
        console.log(`        ❌ 领取奖励历史检测失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
