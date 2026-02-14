/**
 * 邀请转盘 - 规则弹窗检测
 */

/**
 * 检测并验证规则弹窗
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - auth 对象
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<Object>} 返回检测结果
 */
export async function checkRulesDialog(page, auth, test) {
    console.log('        🎯 开始检测规则弹窗...');

    try {
        // 步骤1: 查找并点击帮助图标
        console.log('        🔍 步骤1: 查找帮助图标...');

        const helpIconSelectors = [
            '.ar_icon.icon_nva_help',
            'span.ar_icon.icon_nva_help',
            '.icon_nva_help',
            '[aria-hidden="true"] svg',
            'svg[width="48"][height="48"]'
        ];

        let helpIconClicked = false;

        for (const selector of helpIconSelectors) {
            try {
                const helpIcon = page.locator(selector).first();
                const visible = await helpIcon.isVisible({ timeout: 2000 }).catch(() => false);

                if (visible) {
                    console.log(`        ✓ 找到帮助图标: ${selector}`);
                    await helpIcon.click();
                    console.log('        ✓ 已点击帮助图标');
                    helpIconClicked = true;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
            }
        }

        if (!helpIconClicked) {
            return {
                success: false,
                error: '未找到帮助图标'
            };
        }

        // 等待弹窗出现
        await page.waitForTimeout(1000);

        // 步骤2: 验证规则弹窗是否出现
        console.log('        🔍 步骤2: 验证规则弹窗...');

        const dialogTitleSelectors = [
            'h3.dialogTitle:has-text("Rules")',
            '.dialogTitle:has-text("Rules")',
            'h3:has-text("Rules")',
            'text=Rules'
        ];

        let dialogVisible = false;
        let dialogTitleElement = null;

        for (const selector of dialogTitleSelectors) {
            try {
                const titleEl = page.locator(selector).first();
                const visible = await titleEl.isVisible({ timeout: 2000 }).catch(() => false);

                if (visible) {
                    console.log(`        ✓ 找到规则弹窗标题: ${selector}`);
                    dialogVisible = true;
                    dialogTitleElement = titleEl;
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
            }
        }

        if (!dialogVisible) {
            return {
                success: false,
                error: '规则弹窗未出现'
            };
        }

        console.log('        ✅ 规则弹窗已出现');

        // 步骤3: 等待2秒
        console.log('        ⏳ 步骤3: 等待 2 秒...');
        await page.waitForTimeout(2000);

        // 步骤4: 点击弹窗中的关闭按钮（或 Rules 标题区域）
        console.log('        🔍 步骤4: 关闭规则弹窗...');

        // 尝试多种关闭方式
        const closeStrategies = [
            {
                name: '关闭按钮',
                selectors: [
                    '.dialog-close',
                    '.close-btn',
                    '[data-testid="close"]',
                    '.ar_icon.close',
                    'button:has-text("Close")',
                    'button:has-text("×")'
                ]
            },
            {
                name: '点击遮罩层',
                selectors: [
                    '.dialog-overlay',
                    '.modal-overlay',
                    '.van-overlay'
                ]
            }
        ];

        let dialogClosed = false;

        for (const strategy of closeStrategies) {
            if (dialogClosed) break;

            for (const selector of strategy.selectors) {
                try {
                    const closeEl = page.locator(selector).first();
                    const visible = await closeEl.isVisible({ timeout: 1000 }).catch(() => false);

                    if (visible) {
                        await closeEl.click();
                        console.log(`        ✓ 通过 ${strategy.name} 关闭弹窗: ${selector}`);
                        dialogClosed = true;
                        break;
                    }
                } catch (e) {
                    // 继续尝试下一个选择器
                }
            }
        }

        // 如果没有找到关闭按钮，尝试按 ESC 键
        if (!dialogClosed) {
            console.log('        ⚠️ 未找到关闭按钮，尝试按 ESC 键...');
            await page.keyboard.press('Escape');
            dialogClosed = true;
        }

        // 等待弹窗关闭
        await page.waitForTimeout(1000);

        // 验证弹窗是否已关闭
        const stillVisible = await page.locator('h3.dialogTitle:has-text("Rules")')
            .isVisible({ timeout: 1000 })
            .catch(() => false);

        if (stillVisible) {
            console.log('        ⚠️ 弹窗可能未完全关闭');
        } else {
            console.log('        ✅ 规则弹窗已关闭');
        }

        return {
            success: true,
            dialogAppeared: true,
            dialogClosed: !stillVisible
        };

    } catch (error) {
        console.log(`        ❌ 规则弹窗检测失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
