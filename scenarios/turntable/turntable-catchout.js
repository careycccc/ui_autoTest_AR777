/**
 * 邀请转盘 - 提现功能验证
 * 点击 CASH OUT 按钮后会出现4种不同的弹窗，自动识别并验证
 */

/**
 * 点击 CASH OUT 按钮并等待弹窗
 * @param {*} page 
 * @param {*} auth 
 * @returns {Object} 弹窗信息
 */
async function clickCashOutButton(page, auth) {
    // 等待页面稳定
    await auth.safeWait(1000);

    // 查找并点击 CASH OUT 按钮（使用模糊匹配）
    const cashOutBtn = page.locator('.cash_btn.btn_main_style').filter({
        hasText: /CASH OUT|提现/i
    });

    const isCashOutVisible = await cashOutBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isCashOutVisible) {
        throw new Error('未找到 CASH OUT 按钮');
    }

    console.log('      ✅ 找到 CASH OUT 按钮');

    // 点击按钮
    await cashOutBtn.click();
    console.log('      🖱️ 已点击 CASH OUT 按钮');

    // 等待弹窗出现
    await auth.safeWait(1500);

    // 获取弹窗标题以判断类型
    const dialogContent = page.locator('.dialog-content');
    const isDialogVisible = await dialogContent.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isDialogVisible) {
        throw new Error('提现弹窗未出现');
    }

    const dialogTitle = await page.locator('.dialog-title').textContent({ timeout: 3000 }).catch(() => '');
    console.log(`      📋 弹窗标题: "${dialogTitle}"`);

    return {
        title: dialogTitle,
        isVisible: true
    };
}

/**
 * 验证提现功能 - 自动识别弹窗类型并处理
 * 点击 CASH OUT 按钮后会出现4种不同的弹窗，自动识别并验证
 */
export async function verifyCashOut(page, auth, test) {
    console.log('      🔍 开始验证提现功能...');

    // 点击 CASH OUT 按钮并获取弹窗信息
    const dialogInfo = await clickCashOutButton(page, auth);

    // 根据弹窗标题自动识别类型并处理
    let result = null;
    let dialogType = '';

    if (dialogInfo.title.includes('Insufficient amount')) {
        // 第一种：金额不足
        dialogType = 'insufficient_amount';
        result = await handleInsufficientAmountDialog(page, auth);
        console.log(`      💰 还需金额: ${result.neededAmount}`);

    } else if (dialogInfo.title.includes('Cash out') && dialogInfo.title === 'Cash out') {
        // 第二种：确认提现（需要流水）
        dialogType = 'cash_out_confirm';
        result = await handleCashOutConfirmDialog(page, auth);
        console.log(`      � 提现金额: ${result.amount}`);
        console.log(`      📊 流水倍数: ${result.turnoverMultiple}x`);

    } else if (dialogInfo.title.includes('Proceed to Bind')) {
        // 第三种：未绑定提现信息
        dialogType = 'bind_required';
        result = await handleBindRequiredDialog(page, auth);
        console.log(`      📝 提示: ${result.message}`);

    } else if (dialogInfo.title.includes('Choose cash out method')) {
        // 第四种：选择提现方式
        dialogType = 'choose_method';
        result = await handleChooseMethodDialog(page, auth);
        console.log(`      💰 提现金额: ${result.amountValue}`);
        console.log(`      � 可用方式: ${result.methodCount} 种 (${result.methods.join(', ')})`);

    } else {
        throw new Error(`未知的弹窗类型: "${dialogInfo.title}"`);
    }

    console.log(`      ✅ 提现功能验证完成 (类型: ${dialogType})`);

    return {
        type: dialogType,
        title: dialogInfo.title,
        ...result
    };
}

/**
 * 处理第一种弹窗：金额不足
 */
async function handleInsufficientAmountDialog(page, auth) {
    console.log('      💰 弹窗类型: 金额不足');

    // 获取提示信息（使用模糊匹配）
    const tipText = await page.locator('.amount_no_tip').textContent({ timeout: 3000 }).catch(() => '');
    console.log(`      📝 提示信息: ${tipText}`);

    // 提取需要的金额（支持多种货币符号）
    const amountMatch = tipText.match(/[₹$€£¥]([\d,.]+)/);
    const neededAmount = amountMatch ? amountMatch[1] : 'unknown';
    console.log(`      💵 还需金额: ${neededAmount}`);

    // 检查按钮（使用模糊匹配，只要包含关键词即可）
    const inviteBtn = page.locator('.subBtn.btn_main_style').filter({
        hasText: /INVITE.*FRIENDS|INVITE.*REWARD|邀请好友/i
    });
    const isBtnVisible = await inviteBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isBtnVisible) {
        // 尝试更宽松的匹配
        const anyBtn = page.locator('.subBtn.btn_main_style');
        const anyBtnVisible = await anyBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (!anyBtnVisible) {
            throw new Error('未找到确认按钮');
        }
        console.log('      ⚠️ 使用通用按钮选择器');
    }

    console.log('      ✅ 验证通过: 金额不足弹窗');

    // 关闭弹窗（点击按钮或遮罩）
    await closeDialog(page, auth);

    return {
        message: tipText,
        neededAmount: neededAmount
    };
}

/**
 * 处理第二种弹窗：确认提现（需要流水）
 */
async function handleCashOutConfirmDialog(page, auth) {
    console.log('      💰 弹窗类型: 确认提现（需要流水）');

    // 获取金额信息（使用模糊匹配）
    const addText = await page.locator('.cash_balance .add').textContent({ timeout: 3000 }).catch(() => '');
    console.log(`      📝 金额信息: ${addText}`);

    // 提取金额（支持多种货币符号和格式）
    const amountMatch = addText.match(/[₹$€£¥]([\d,.]+)/);
    const amount = amountMatch ? amountMatch[1] : 'unknown';

    // 获取流水要求（可能包含倍数信息）
    const playCodeText = await page.locator('.play_code').textContent({ timeout: 3000 }).catch(() => '');
    console.log(`      📝 流水要求: ${playCodeText}`);

    // 提取流水倍数（如 3x, 5x 等）
    const turnoverMatch = playCodeText.match(/(\d+)x?\s*turnover|(\d+)\s*倍/i);
    const turnoverMultiple = turnoverMatch ? (turnoverMatch[1] || turnoverMatch[2]) : 'unknown';
    if (turnoverMultiple !== 'unknown') {
        console.log(`      � 流水倍数: ${turnoverMultiple}x`);
    }

    // 检查按钮（使用模糊匹配）
    const cancelBtn = page.locator('.subBtn2.btn').filter({ hasText: /Cancel|取消|关闭/i });
    const confirmBtn = page.locator('.subBtn.btn_main_style').filter({ hasText: /Confirm|确认|确定/i });

    const isCancelVisible = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const isConfirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isCancelVisible && !isConfirmVisible) {
        // 尝试更宽松的选择器
        const anyFooterBtns = page.locator('.dialog-footer .btn, .dialog-footer button');
        const btnCount = await anyFooterBtns.count();

        if (btnCount < 2) {
            throw new Error('未找到足够的操作按钮');
        }
        console.log(`      ⚠️ 使用通用按钮选择器 (找到 ${btnCount} 个按钮)`);

        // 点击第一个按钮（通常是取消）
        await anyFooterBtns.first().click();
        await auth.safeWait(500);
    } else {
        console.log('      ✅ 验证通过: 确认提现弹窗');

        // 点击 Cancel 关闭弹窗
        if (isCancelVisible) {
            await cancelBtn.click();
        } else {
            // 如果没有 Cancel，点击遮罩层
            await closeDialog(page, auth);
        }
        await auth.safeWait(500);
    }

    return {
        amount: amount,
        turnoverRequirement: playCodeText,
        turnoverMultiple: turnoverMultiple
    };
}

/**
 * 处理第三种弹窗：未绑定提现信息
 */
async function handleBindRequiredDialog(page, auth) {
    console.log('      💰 弹窗类型: 未绑定提现信息');

    // 获取提示信息
    const tipText = await page.locator('.amount_no_tip').textContent({ timeout: 3000 }).catch(() => '');
    console.log(`      📝 提示信息: ${tipText}`);

    // 检查按钮（使用模糊匹配）
    const okBtn = page.locator('.subBtn.btn_main_style').filter({
        hasText: /OK|确定|知道了|去绑定/i
    });
    const isBtnVisible = await okBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isBtnVisible) {
        // 尝试更宽松的匹配
        const anyBtn = page.locator('.dialog-footer .subBtn, .dialog-footer button');
        const anyBtnVisible = await anyBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (!anyBtnVisible) {
            throw new Error('未找到确认按钮');
        }
        console.log('      ⚠️ 使用通用按钮选择器');
    }

    console.log('      ✅ 验证通过: 未绑定提现信息弹窗');

    // 关闭弹窗
    await closeDialog(page, auth);

    return {
        message: tipText
    };
}

/**
 * 处理第四种弹窗：选择提现方式
 */
async function handleChooseMethodDialog(page, auth) {
    console.log('      💰 弹窗类型: 选择提现方式');

    // 获取金额（使用模糊匹配）
    const amountText = await page.locator('.amount').textContent({ timeout: 3000 }).catch(() => '');
    console.log(`      💵 提现金额: ${amountText}`);

    // 提取纯数字金额
    const amountMatch = amountText.match(/[₹$€£¥]?([\d,.]+)/);
    const amountValue = amountMatch ? amountMatch[1] : amountText;

    // 获取所有提现方式
    const withdrawItems = page.locator('.withdraw_list .item');
    const itemCount = await withdrawItems.count();
    console.log(`      📋 可用提现方式数量: ${itemCount}`);

    const methods = [];
    for (let i = 0; i < itemCount; i++) {
        const item = withdrawItems.nth(i);
        const titleText = await item.locator('.title').textContent({ timeout: 2000 }).catch(() => '');
        if (titleText && titleText.trim()) {
            methods.push(titleText.trim());
            console.log(`      ${i + 1}. ${titleText.trim()}`);
        }
    }

    // 检查按钮（使用模糊匹配）
    const cancelBtn = page.locator('.subBtn2.btn, .foot_btn .btn').filter({
        hasText: /Cancel|取消|关闭/i
    }).first();
    const confirmBtn = page.locator('.subBtn.btn_main_style, .foot_btn .btn_main_style').filter({
        hasText: /Confirm|确认|确定/i
    }).first();

    const isCancelVisible = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const isConfirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isCancelVisible && !isConfirmVisible) {
        // 尝试更宽松的选择器
        const anyFooterBtns = page.locator('.dialog-footer .btn, .foot_btn .btn, .dialog-footer button');
        const btnCount = await anyFooterBtns.count();

        if (btnCount < 1) {
            console.log('      ⚠️ 未找到操作按钮，尝试点击遮罩层关闭');
            await closeDialog(page, auth);
        } else {
            console.log(`      ⚠️ 使用通用按钮选择器 (找到 ${btnCount} 个按钮)`);
            // 点击第一个按钮（通常是取消）
            await anyFooterBtns.first().click();
            await auth.safeWait(500);
        }
    } else {
        console.log('      ✅ 验证通过: 选择提现方式弹窗');

        // 优先点击 Cancel
        if (isCancelVisible) {
            await cancelBtn.click();
        } else if (isConfirmVisible) {
            // 如果只有 Confirm，点击遮罩层
            await closeDialog(page, auth);
        }
        await auth.safeWait(500);
    }

    return {
        amount: amountText,
        amountValue: amountValue,
        methods: methods,
        methodCount: itemCount
    };
}

/**
 * 关闭弹窗的通用方法（使用多种策略）
 */
async function closeDialog(page, auth) {
    console.log('      🔒 尝试关闭弹窗...');

    // 策略1: 尝试点击遮罩层关闭
    const overlaySelectors = [
        '.van-overlay',
        '.overlay',
        '.mask',
        '[class*="overlay"]',
        '[class*="mask"]'
    ];

    for (const selector of overlaySelectors) {
        const overlay = page.locator(selector).first();
        const isOverlayVisible = await overlay.isVisible({ timeout: 1000 }).catch(() => false);

        if (isOverlayVisible) {
            await overlay.click({ force: true });
            await auth.safeWait(500);
            console.log(`      ✅ 已通过遮罩层关闭弹窗 (${selector})`);
            return true;
        }
    }

    // 策略2: 尝试点击确认/关闭按钮
    const buttonSelectors = [
        '.subBtn.btn_main_style',
        '.dialog-footer .btn',
        '.dialog-footer button',
        'button[class*="btn"]',
        '.foot_btn .btn'
    ];

    for (const selector of buttonSelectors) {
        const btn = page.locator(selector).filter({
            hasText: /OK|确定|知道了|关闭|Close/i
        }).first();
        const isBtnVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);

        if (isBtnVisible) {
            await btn.click();
            await auth.safeWait(500);
            console.log(`      ✅ 已通过按钮关闭弹窗 (${selector})`);
            return true;
        }
    }

    // 策略3: 点击任意底部按钮
    const anyFooterBtn = page.locator('.dialog-footer .btn, .dialog-footer button, .foot_btn .btn').first();
    const anyBtnVisible = await anyFooterBtn.isVisible({ timeout: 1000 }).catch(() => false);

    if (anyBtnVisible) {
        await anyFooterBtn.click();
        await auth.safeWait(500);
        console.log('      ✅ 已通过底部按钮关闭弹窗');
        return true;
    }

    // 策略4: 按 ESC 键
    try {
        await page.keyboard.press('Escape');
        await auth.safeWait(500);
        console.log('      ✅ 已通过 ESC 键关闭弹窗');
        return true;
    } catch (e) {
        // ESC 键可能不起作用
    }

    console.log('      ⚠️ 无法自动关闭弹窗，弹窗可能已自动消失');
    return false;
}
