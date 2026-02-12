/**
 * 排行榜奖励相关功能
 */
import { clickIfTextExists, handleFailure, swipePage } from '../utils.js';

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
 * 进入history
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
 */
export async function earnInviteRewardsHistory(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入history->之前页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '进入history');
        }

        // 找到history进行点击
        const isVisibleHistory = await clickIfTextExists(page, 'History', {
            name: '进入history->新版返佣的排行榜的界面'
        });

        if (!isVisibleHistory) {
            return await handleFailure(test, '进入history->histroy不可见，跳过');
        }

        // 🔥 修复：等待路由更新到 /earn/history
        await page.waitForTimeout(500);

        // 进入到了history的界面
        const isHistoryview = await test.switchToPage('进入返佣排行榜的history的界面', {
            waitForSelector: 'text=History',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isHistoryview) {
            return await handleFailure(test, '进入history的界面->页面切换失败');
        }
        // 点击关闭按钮

        const dialogContainer = page.locator('.dialog-container');
        const closeButton = dialogContainer.locator('.close-btn');

        try {
            // 等待对话框出现
            await dialogContainer.waitFor({ state: 'visible', timeout: 3000 });

            // 点击关闭按钮
            await closeButton.click({ force: true, timeout: 5000 });
            console.log('        ✓ 已关闭 History 弹框');

            // 等待对话框消失
            await dialogContainer.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
        } catch (error) {
            return await handleFailure(test, `进入history->关闭弹框时出错: ${error.message}`);
        }
        await page.waitForTimeout(1000);
        return true;
    } catch (error) {
        return await handleFailure(test, `进入history->earnInviteRewardsHistory 执行失败: ${error.message}`, { throwError: true });
    }
}

// /**
//  * 进入Rules
//  * @param {Page} page - Playwright page
//  * @param {TestCase} test - Test case instance
//  * @param {Object} options - 配置选项
//  * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
//  */
// export async function earnInviteRewardsRules(page, test, options = {}) {
//     try {
//         const { skipTabSwitch = false } = options;

//         // 检查页面是否已关闭
//         if (!page || page.isClosed()) {
//             return await handleFailure(test, '进入Rules->之前页面已关闭，跳过操作');
//         }

//         // 只有在需要时才切换到 Invite Rewards tab
//         if (!skipTabSwitch) {
//             await ensureOnInviteRewardsTab(page, test, '进入Rules');
//         }

//         // 找到Rules进行点击
//         // 尝试多种可能的选择器
//         let isVisibleRules = await clickIfTextExists(page, 'Rules', {
//             name: '进入Rules->新版返佣的排行榜的界面',
//             timeout: 5000
//         });

//         // 如果第一次没找到，尝试在特定容器中查找
//         if (!isVisibleRules) {
//             console.log('        ℹ️ 尝试在 .invite-rewards 容器中查找 Rules...');
//             isVisibleRules = await clickIfTextExists(page, 'Rules', {
//                 name: '进入Rules->新版返佣的排行榜的界面',
//                 containerSelector: '.invite-rewards',
//                 timeout: 3000
//             });
//         }

//         // 如果还是没找到，尝试查找包含 "rule" 的按钮
//         if (!isVisibleRules) {
//             console.log('        ℹ️ 尝试查找包含 "rule" 的按钮...');
//             const ruleButton = page.locator('button, div, span').filter({ hasText: /rule/i }).first();
//             const ruleButtonVisible = await ruleButton.isVisible({ timeout: 3000 }).catch(() => false);

//             if (ruleButtonVisible) {
//                 await ruleButton.click();
//                 isVisibleRules = true;
//                 console.log('        ✓ 找到并点击了包含 "rule" 的按钮');
//             }
//         }

//         if (!isVisibleRules) {
//             return await handleFailure(test, '进入Rules->Rules不可见，跳过');
//         }

//         // 🔥 修复：等待 tab 切换完成
//         await page.waitForTimeout(500);

//         // 🔥 Rules 是一个 Tab 切换，不是新页面，所以不需要 switchToPage
//         // 只需要验证 Rules tab 的内容是否加载
//         console.log('        ✓ 已切换到 Rules tab');

//         // 验证 Rules 内容是否加载（检查特征文本）
//         const rulesContent = page.locator('text=How it works').or(page.locator('text=Agent Rating'));
//         const contentVisible = await rulesContent.first().isVisible({ timeout: 3000 }).catch(() => false);

//         if (contentVisible) {
//             console.log('        ✅ Rules 内容已加载');
//         } else {
//             console.log('        ⚠️ Rules 内容未完全加载，但 tab 切换成功');
//         }

//         await page.waitForTimeout(1000);
//         return true;
//     } catch (error) {
//         return await handleFailure(test, `进入Rules->earnInviteRewardsRules 执行失败: ${error.message}`, { throwError: true });
//     }
// }
/**
 * 进入Rules
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
 */
export async function earnInviteRewardsRules(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入Rules->之前页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '进入Rules');
        }

        // ✅ 在页面顶部找到 Rules tab 并点击（这是一个页面内的Tab切换，不是新窗口）
        const rulesTab = page.locator('text=Rules').first();
        const isVisible = await rulesTab.isVisible({ timeout: 5000 }).catch(() => false);

        if (!isVisible) {
            return await handleFailure(test, '进入Rules->Rules tab 不可见，跳过');
        }

        console.log('        ✓ 找到 Rules tab，准备点击...');

        // 点击 Rules tab（页面内切换）
        await rulesTab.click();
        console.log('        ✓ 已点击 Rules tab');

        // 等待 tab 切换完成
        await page.waitForTimeout(1000);

        // 验证 Rules 内容是否加载（检查特征文本）
        const rulesContent = page.locator('text=How it works').or(page.locator('text=Invite friends'));
        const contentVisible = await rulesContent.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (contentVisible) {
            console.log('        ✅ Rules 内容已加载');
        } else {
            console.log('        ⚠️ Rules 内容未完全加载，但 tab 切换成功');
        }

        await page.waitForTimeout(500);

        // 🔥 返回到 Invite Rewards tab，方便后续测试用例
        console.log('        ℹ️ 返回到 Invite Rewards tab...');
        const inviteRewardsTab = page.locator('text=Invite Rewards').first();
        const inviteRewardsVisible = await inviteRewardsTab.isVisible({ timeout: 3000 }).catch(() => false);

        if (inviteRewardsVisible) {
            await inviteRewardsTab.click();
            console.log('        ✓ 已返回到 Invite Rewards tab');
            await page.waitForTimeout(1000);

            // 验证是否成功返回
            const checkListDetail = await page.locator('text=Check the list detail').isVisible({ timeout: 3000 }).catch(() => false);
            if (checkListDetail) {
                console.log('        ✅ 已确认回到 Invite Rewards tab');
            }
        } else {
            console.log('        ⚠️ Invite Rewards tab 不可见，跳过返回');
        }

        return true;
    } catch (error) {
        return await handleFailure(test, `进入Rules->earnInviteRewardsRules 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 进入排行榜的榜单
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
 */
export async function earnInviteRewardsRanklist(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入Ranklist->页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '进入Ranklist');
        }

        // 找到"Check the list detail"进行点击
        const isVisibleRanklist = await clickIfTextExists(page, 'Check the list detail', {
            name: '进入Ranklist->新版返佣的排行榜的界面'
        });

        if (!isVisibleRanklist) {
            return await handleFailure(test, '进入Ranklist->Check the list detail不可见，跳过');
        }

        // 🔥 修复：等待路由更新
        await page.waitForTimeout(500);

        // 进入到了Ranklist的界面
        const isRanklistview = await test.switchToPage('进入返佣排行榜的Ranklist的界面', {
            waitForSelector: 'text=Ranklist',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isRanklistview) {
            return await handleFailure(test, '进入Ranklist的界面->页面切换失败');
        }

        // 🔥 新增：关闭 Ranklist 弹框（与 History 类似）
        const dialogContainer = page.locator('.box');
        const closeButton = dialogContainer.locator('.close');

        try {
            // 等待对话框出现
            await dialogContainer.waitFor({ state: 'visible', timeout: 3000 });

            // 点击关闭按钮
            await closeButton.click({ force: true, timeout: 5000 });
            console.log('        ✓ 已关闭 新版返佣的排行榜的弹框');

            // 等待对话框消失
            await dialogContainer.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
        } catch (error) {
            console.log(`        ⚠️ 关闭弹框时出错（可能不是弹框）: ${error.message}`);
        }

        await page.waitForTimeout(1000);

        return true;
    } catch (error) {
        return await handleFailure(test, `进入Ranklist->earnInviteRewardsRanklist 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 进入邀请链接（从 Invite Rewards 排行榜页面）
 * 注意：Invite Rewards 页面本身没有独立的 "Invite link" 按钮
 * 需要返回主页面，然后点击 "INVITE FRIENDS FOR REWARDS" 按钮
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {boolean} options.skipTabSwitch - 是否跳过切换到 Invite Rewards tab（默认 false）
 */
export async function earnInviteRewardsInviteLink(page, test, options = {}) {
    try {
        const { skipTabSwitch = false } = options;

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入InviteLink->之前页面已关闭，跳过操作');
        }

        // 只有在需要时才切换到 Invite Rewards tab
        if (!skipTabSwitch) {
            await ensureOnInviteRewardsTab(page, test, '进入InviteLink');
        }

        // 🔥 修复：Invite Rewards 页面没有独立的 "Invite link" 按钮
        // 需要切换回 "My Rewards" tab，然后点击 "INVITE FRIENDS FOR REWARDS"
        console.log('        ℹ️ 切换到 My Rewards tab 以访问邀请按钮...');

        const myRewardsTab = page.getByText('My Rewards').first();
        const myRewardsExists = await myRewardsTab.count() > 0;

        if (!myRewardsExists) {
            return await handleFailure(test, '进入InviteLink->My Rewards tab 不存在');
        }

        await myRewardsTab.click({ force: true, timeout: 5000 });
        console.log('        ✓ 已切换到 My Rewards tab');
        await page.waitForTimeout(1000);

        // 🔥 使用封装的滑动函数向上滑动页面
        console.log('        ℹ️ 向上滑动页面以显示邀请按钮...');
        await swipePage(page, {
            direction: 'up',
            distance: 0.4,  // 滑动 40% 的距离
            startRatio: 0.7  // 从屏幕 70% 的位置开始
        });

        // 🔥 现在查找并点击 "INVITE FRIENDS FOR REWARDS" 按钮
        let isVisibleInviteLink = await clickIfTextExists(page, 'INVITE FRIENDS FOR REWARDS', {
            name: '进入InviteLink->邀请按钮',
            timeout: 5000,
            scrollIntoView: true  // 确保元素滚动到可见位置
        });

        // 如果还是没找到，尝试查找包含 "invite" 的按钮
        if (!isVisibleInviteLink) {
            console.log('        ℹ️ 尝试查找包含 "invite" 的元素...');
            const inviteButton = page.locator('button, div, a, span').filter({ hasText: /invite.*friend/i }).first();
            const inviteButtonVisible = await inviteButton.isVisible({ timeout: 3000 }).catch(() => false);

            if (inviteButtonVisible) {
                await inviteButton.click();
                isVisibleInviteLink = true;
                console.log('        ✓ 找到并点击了邀请按钮');
            }
        }

        if (!isVisibleInviteLink) {
            return await handleFailure(test, '进入InviteLink->邀请按钮不可见，跳过');
        }

        // 🔥 等待路由更新
        await page.waitForTimeout(500);

        // 进入到了邀请界面（与 earnInviteLink 相同的页面）
        const isInviteLinkview = await test.switchToPage('进入返佣排行榜的邀请界面', {
            waitForSelector: 'text=Share',  // 使用与 earnInviteLink 相同的选择器
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isInviteLinkview) {
            return await handleFailure(test, '进入InviteLink的界面->页面切换失败');
        }

        // 🔥 验证邀请码（与 earnInviteLink 相同的逻辑）
        await page.waitForTimeout(1000);

        // 进行页面的完整性判断
        const inviteCodeElement = page.locator('.invite .code span');
        const codeVisible = await inviteCodeElement.isVisible({ timeout: 3000 }).catch(() => false);

        if (!codeVisible) {
            return await handleFailure(test, '进入InviteLink->邀请码元素不可见');
        }

        const inviteCode = await inviteCodeElement.innerText();

        if (!inviteCode || inviteCode.trim() === '') {
            return await handleFailure(test, '进入InviteLink->邀请码为空，页面数据异常', { throwError: true });
        } else {
            console.log(`        ✅ 邀请码: ${inviteCode}`);
        }

        return true;
    } catch (error) {
        return await handleFailure(test, `进入InviteLink->earnInviteRewardsInviteLink 执行失败: ${error.message}`, { throwError: true });
    }
}
