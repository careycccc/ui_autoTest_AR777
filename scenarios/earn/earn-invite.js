/**
 * 邀请相关功能
 */
import { clickIfTextExists, handleFailure, handleTelegramJump, swipePage } from '../utils.js';

/**
 * 🔥 辅助函数：确保在 Invite Rewards tab
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {string} actionName - 操作名称（用于日志）
 * @returns {Promise<boolean>} 是否成功切换到 Invite Rewards tab
 */
async function ensureOnInviteRewardsTab(page, test, actionName) {
    // 检查是否已经在 Invite Rewards 页面
    const historyButton = await page.getByText('History').first().count();
    const checkListDetail = await page.getByText('Check the list detail').count();
    const alreadyOnInviteRewards = historyButton > 0 && checkListDetail > 0;

    if (alreadyOnInviteRewards) {
        console.log(`        ✓ 已在 Invite Rewards 页面，跳过 tab 切换`);
        return true;
    }

    // 不在 Invite Rewards 页面，需要切换
    console.log(`        ℹ️ 当前不在 Invite Rewards 页面，准备切换...`);

    // 🔥 先检查是否在新版返佣主页面
    const currentUrl = page.url();
    const urlPath = new URL(currentUrl).pathname;

    // 如果不在 /earn 主页面，先返回
    if (urlPath !== '/earn') {
        console.log(`        ℹ️ 当前路由: ${urlPath}，需要先返回新版返佣主页`);

        // 尝试点击返回按钮
        const backButton = page.locator('[class*="back"]').first();
        const backVisible = await backButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (backVisible) {
            await backButton.click();
            await page.waitForTimeout(1500);
            console.log(`        ✓ 已返回新版返佣主页`);
        }
    }

    // 查找并点击 Invite Rewards tab
    const inviteRewardsTab = page.getByText('Invite Rewards').first();
    const tabExists = await inviteRewardsTab.count() > 0;

    if (!tabExists) {
        const errorMsg = `❌ Invite Rewards tab 不存在，无法执行 ${actionName}`;
        console.log(`        ${errorMsg}`);
        // 🔥 直接抛出错误，而不是返回 false
        throw new Error(errorMsg);
    }

    await inviteRewardsTab.click({ force: true, timeout: 5000 });
    console.log(`        ✓ 已点击 "Invite Rewards" tab`);

    // 等待路由更新
    await page.waitForTimeout(1000);

    // 切换页面
    const isJump = await test.switchToPage(`${actionName}->进入返佣排行榜的界面`, {
        waitForSelector: 'text=Check the list detail',
        waitTime: 1000,
        collectPreviousPage: true
    });

    if (!isJump) {
        const errorMsg = `❌ ${actionName}->进入返佣排行榜的界面->页面切换失败`;
        console.log(`        ${errorMsg}`);
        // 🔥 直接抛出错误
        throw new Error(errorMsg);
    }

    return true;
}

/**
 * 新版返佣的邀请链接
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnInviteLink(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 点击邀请按钮
        const isVisible = await clickIfTextExists(page, 'INVITE FRIENDS FOR REWARDS', {
            name: '新版返佣的邀请链接按钮',
            timeout: 5000
        });

        if (!isVisible) {
            return await handleFailure(test, '新版返佣的邀请按钮不可见，跳过', { throwError: true });
        }
        // 等待页面切换
        await test.switchToPage('进入新版返佣的邀请界面', {
            waitForSelector: 'text=Share',
            waitTime: 1000,
            collectPreviousPage: true,
        });

        // 等待页面稳定
        await page.waitForTimeout(1000);

        // 检查页面是否仍然打开
        if (page.isClosed()) {
            return await handleFailure(test, '进入新版返佣的邀请界面的页面在切换后关闭了');
        }

        // 进行页面的完整性判断
        const inviteCodeElement = page.locator('.invite .code span');
        const codeVisible = await inviteCodeElement.isVisible({ timeout: 3000 }).catch(() => false);

        if (!codeVisible) {
            return await handleFailure(test, '新版返佣的邀请界面邀请码元素不可见');
        }

        const inviteCode = await inviteCodeElement.innerText();

        if (!inviteCode || inviteCode.trim() === '') {
            return await handleFailure(test, '新版返佣的邀请界面邀请码为空，页面数据异常', { throwError: true });
        } else {
            console.log(`        ✅ 新版返佣的邀请界面邀请码: ${inviteCode}`);
        }

        // 使用封装的 Telegram 跳转函数
        const jumpResult = await handleTelegramJump(page, '.share-icons', {
            telegramText: 'Telegram',
            jumpTimeout: 5000,
            waitAfterBack: 1000,
            verifyReturn: true,
            name: '新版返佣->邀请链接->Telegram'
        });

        if (!jumpResult.success) {
            console.log(`        ⚠️ 新版返佣的邀请界面Telegram 跳转验证失败: ${jumpResult.error || '未知错误'}`);
            // 邀请码验证成功，只是跳转功能不可用
            return true;
        }

        return true;

    } catch (error) {
        return await handleFailure(test, `earnInviteLink 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 新版返佣的排行榜的界面Invite Rewards -- 进入返佣排行榜的个人详情页
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
 */
export async function earnInviteRewardsRankInfo(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '进入个人详情页');
        }

        // 等待元素出现
        await page.waitForSelector('.ranking-icon');

        // 点击 SVG（进入个人详情页）
        await page.locator('.ranking-icon svg').click();
        console.log(`        ✓ 已点击排行榜图标`);

        // 🔥 新增：等待个人详情页加载
        await page.waitForTimeout(1000);

        // 🔥 新增：切换到个人详情页
        await test.switchToPage('返佣排行榜的个人详情页', {
            waitTime: 1000,
            collectPreviousPage: true
        });

        console.log(`        ✅ earnInviteRewardsRankInfo 执行完成`);
        return true;
    } catch (error) {
        return await handleFailure(test, `earnInviteRewardsRankInfo 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 跳转到Rewards
 */
export async function earnRankToRewards(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '跳转到Rewards');
        }

        // 向下滑动 1/2
        await swipePage(page, { direction: 'up' });
        await page.waitForTimeout(1000);

        // 点击 "Rewards" 按钮
        const rewardsButton = page.getByText('Rewards').first();
        await rewardsButton.click();
        console.log(`        ✓ 已点击 "Rewards" 按钮`);

        //切换页面
        await test.switchToPage('返佣详情页面Reward Details', {
            waitForSelector: 'text=Reward Details',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 等待页面加载
        await page.waitForTimeout(1000);
        return true;
    } catch (error) {
        return await handleFailure(test, `earnRankToRewards 执行失败: ${error.message}`, { throwError: true });
    }
}


/**
 * 跳转到Invitees
 */

export async function earnRankToInvitees(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '跳转到Invitees');
        }

        // 向下滑动 1/2
        await swipePage(page, { direction: 'up' });
        await page.waitForTimeout(1000);

        // 点击 "Invitees" 按钮
        const inviteesButton = page.getByText('Invitees').first();
        await inviteesButton.click();
        console.log(`        ✓ 已点击 "Invitees" 按钮`);

        //切换页面
        await test.switchToPage('返佣详情页面Reward Details', {
            waitForSelector: 'text=Reward Details',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 等待页面加载
        await page.waitForTimeout(1000);
        return true;
    } catch (error) {
        return await handleFailure(test, `earnRankToInvitees 执行失败: ${error.message}`, { throwError: true });
    }
}


/**
 * Invite Rewards 底部弹窗 - Go To Attend
 * 检查底部是否有 "Go To Attend" 弹窗，如果有则点击并跳转到邀请界面
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
 */
export async function earnInviteRewardsGoToAttend(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, 'Go To Attend->页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, 'Go To Attend');
        }

        // 🔥 向下滑动以显示底部弹窗
        console.log('        ℹ️ 向下滑动以显示底部弹窗...');
        await swipePage(page, {
            direction: 'up',
            distance: 0.5,
            startRatio: 0.7
        });
        await page.waitForTimeout(1000);

        // 🔥 检查底部弹窗是否存在
        const footerPopup = page.locator('.footer[data-v-e09e1317]');
        const popupVisible = await footerPopup.isVisible({ timeout: 3000 }).catch(() => false);

        if (!popupVisible) {
            console.log('        ℹ️ 底部弹窗不存在，跳过此用例');
            return true; // 不存在不算失败
        }

        console.log('        ✓ 检测到底部弹窗');

        // 🔥 验证弹窗内容
        const popupText = await footerPopup.innerText().catch(() => '');
        console.log(`        📝 弹窗内容: ${popupText.substring(0, 50)}...`);

        // 🔥 查找并点击 "Go To Attend" 按钮
        const goToAttendBtn = footerPopup.locator('text=Go To Attend');
        const btnVisible = await goToAttendBtn.isVisible({ timeout: 2000 }).catch(() => false);

        if (!btnVisible) {
            return await handleFailure(test, 'Go To Attend->按钮不可见');
        }

        await goToAttendBtn.click();
        console.log('        ✓ 已点击 "Go To Attend" 按钮');

        // 🔥 等待路由更新
        await page.waitForTimeout(500);

        // 🔥 进入到了邀请界面（复用 earnInviteLink 的验证逻辑）
        const isInviteLinkview = await test.switchToPage('进入邀请界面（从Go To Attend）', {
            waitForSelector: 'text=Share',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isInviteLinkview) {
            return await handleFailure(test, 'Go To Attend->邀请界面->页面切换失败');
        }

        // 🔥 验证邀请码（与 earnInviteLink 相同的逻辑）
        await page.waitForTimeout(1000);

        // 进行页面的完整性判断
        const inviteCodeElement = page.locator('.invite .code span');
        const codeVisible = await inviteCodeElement.isVisible({ timeout: 3000 }).catch(() => false);

        if (!codeVisible) {
            return await handleFailure(test, 'Go To Attend->邀请码元素不可见');
        }

        const inviteCode = await inviteCodeElement.innerText();

        if (!inviteCode || inviteCode.trim() === '') {
            return await handleFailure(test, 'Go To Attend->邀请码为空，页面数据异常', { throwError: true });
        } else {
            console.log(`        ✅ 邀请码: ${inviteCode}`);
        }

        return true;
    } catch (error) {
        return await handleFailure(test, `Go To Attend->earnInviteRewardsGoToAttend 执行失败: ${error.message}`, { throwError: true });
    }
}




