/**
 * 排行榜奖励相关功能
 */
import { clickIfTextExists, handleFailure } from '../utils.js';

/**
 * 进入history
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnInviteRewardsHistory(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入history->页面已关闭，跳过操作');
        }

        // 点击切换到Invite Rewards界面
        const isVisible = await clickIfTextExists(page, 'Invite Rewards', {
            name: '进入history->新版返佣的排行榜的界面'
        });

        if (!isVisible) {
            return await handleFailure(test, '进入history->新版返佣的排行榜的界面Invite Rewards不可见，跳过');
        }

        const isJump = await test.switchToPage('进入history->进入返佣排行榜的排行榜的界面', {
            waitForSelector: 'text=Check the list detail',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isJump) {
            return await handleFailure(test, '进入history->进入返佣排行榜的排行榜的界面->页面切换失败');
        }

        // 找到history进行点击
        const isVisibleHistory = await clickIfTextExists(page, 'History', {
            name: '进入history->新版返佣的排行榜的界面'
        });

        if (!isVisibleHistory) {
            return await handleFailure(test, '进入history->histroyory不可见，跳过');
        }

        // 进入到了history的界面
        const isHistoryview = await test.switchToPage('进入返佣排行榜的history的界面', {
            waitForSelector: 'text=History',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isHistoryview) {
            return await handleFailure(test, '进入history的界面->页面切换失败');
        }

        await page.waitForTimeout(1000);

        return true;
    } catch (error) {
        return await handleFailure(test, `进入history->earnInviteRewardsHistory 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 进入Rules
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnInviteRewardsRules(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入Rules->页面已关闭，跳过操作');
        }

        // 点击切换到Invite Rewards界面
        const isVisible = await clickIfTextExists(page, 'Invite Rewards', {
            name: '进入Rules->新版返佣的排行榜的界面'
        });

        if (!isVisible) {
            return await handleFailure(test, '进入Rules->新版返佣的排行榜的界面Invite Rewards不可见，跳过');
        }

        const isJump = await test.switchToPage('进入Rules->进入返佣排行榜的排行榜的界面', {
            waitForSelector: 'text=Check the list detail',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isJump) {
            return await handleFailure(test, '进入Rules->进入返佣排行榜的排行榜的界面->页面切换失败');
        }

        // 找到Rules进行点击
        const isVisibleRules = await clickIfTextExists(page, 'Rules', {
            name: '进入Rules->新版返佣的排行榜的界面'
        });

        if (!isVisibleRules) {
            return await handleFailure(test, '进入Rules->Rules不可见，跳过');
        }

        // 进入到了Rules的界面
        const isRulesview = await test.switchToPage('进入返佣排行榜的Rules的界面', {
            waitForSelector: 'text=Rules',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isRulesview) {
            return await handleFailure(test, '进入Rules的界面->页面切换失败');
        }

        await page.waitForTimeout(1000);

        return true;
    } catch (error) {
        return await handleFailure(test, `进入Rules->earnInviteRewardsRules 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 进入排行榜的榜单
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnInviteRewardsRanklist(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入Ranklist->页面已关闭，跳过操作');
        }

        // 点击切换到Invite Rewards界面
        const isVisible = await clickIfTextExists(page, 'Invite Rewards', {
            name: '进入Ranklist->新版返佣的排行榜的界面'
        });

        if (!isVisible) {
            return await handleFailure(test, '进入Ranklist->新版返佣的排行榜的界面Invite Rewards不可见，跳过');
        }

        const isJump = await test.switchToPage('进入Ranklist->进入返佣排行榜的排行榜的界面', {
            waitForSelector: 'text=Check the list detail',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isJump) {
            return await handleFailure(test, '进入Ranklist->进入返佣排行榜的排行榜的界面->页面切换失败');
        }

        // 找到"Check the list detail"进行点击
        const isVisibleRanklist = await clickIfTextExists(page, 'Check the list detail', {
            name: '进入Ranklist->新版返佣的排行榜的界面'
        });

        if (!isVisibleRanklist) {
            return await handleFailure(test, '进入Ranklist->Check the list detail不可见，跳过');
        }

        // 进入到了Ranklist的界面
        const isRanklistview = await test.switchToPage('进入返佣排行榜的Ranklist的界面', {
            waitForSelector: 'text=Ranklist',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isRanklistview) {
            return await handleFailure(test, '进入Ranklist的界面->页面切换失败');
        }

        await page.waitForTimeout(1000);

        return true;
    } catch (error) {
        return await handleFailure(test, `进入Ranklist->earnInviteRewardsRanklist 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 进入邀请链接
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnInviteRewardsInviteLink(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入InviteLink->页面已关闭，跳过操作');
        }

        // 点击切换到Invite Rewards界面
        const isVisible = await clickIfTextExists(page, 'Invite Rewards', {
            name: '进入InviteLink->新版返佣的排行榜的界面'
        });

        if (!isVisible) {
            return await handleFailure(test, '进入InviteLink->新版返佣的排行榜的界面Invite Rewards不可见，跳过');
        }

        const isJump = await test.switchToPage('进入InviteLink->进入返佣排行榜的排行榜的界面', {
            waitForSelector: 'text=Check the list detail',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isJump) {
            return await handleFailure(test, '进入InviteLink->进入返佣排行榜的排行榜的界面->页面切换失败');
        }

        // 找到"Invite link"进行点击
        const isVisibleInviteLink = await clickIfTextExists(page, 'Invite link', {
            name: '进入InviteLink->新版返佣的排行榜的界面'
        });

        if (!isVisibleInviteLink) {
            return await handleFailure(test, '进入InviteLink->Invite link不可见，跳过');
        }

        // 进入到了Invite link的界面
        const isInviteLinkview = await test.switchToPage('进入返佣排行榜的InviteLink的界面', {
            waitForSelector: 'text=Invite link',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isInviteLinkview) {
            return await handleFailure(test, '进入InviteLink的界面->页面切换失败');
        }

        await page.waitForTimeout(1000);

        return true;
    } catch (error) {
        return await handleFailure(test, `进入InviteLink->earnInviteRewardsInviteLink 执行失败: ${error.message}`, { throwError: true });
    }
}
