import { handleFailure } from '../utils.js';

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
        await page.waitForTimeout(2000);

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
