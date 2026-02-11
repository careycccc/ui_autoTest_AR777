/**
 * 邀请相关功能
 */
import { clickIfTextExists, handleFailure, handleTelegramJump } from '../utils.js';

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
            return await handleFailure(test, '邀请按钮不可见，跳过', { throwError: true });
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
            return await handleFailure(test, '页面在切换后关闭');
        }

        // 进行页面的完整性判断
        const inviteCodeElement = page.locator('.invite .code span');
        const codeVisible = await inviteCodeElement.isVisible({ timeout: 3000 }).catch(() => false);

        if (!codeVisible) {
            return await handleFailure(test, '邀请码元素不可见');
        }

        const inviteCode = await inviteCodeElement.innerText();

        if (!inviteCode || inviteCode.trim() === '') {
            return await handleFailure(test, '邀请码为空，页面数据异常', { throwError: true });
        } else {
            console.log(`        ✅ 邀请码: ${inviteCode}`);
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
            console.log(`        ⚠️ Telegram 跳转验证失败: ${jumpResult.error || '未知错误'}`);
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
 */
export async function earnInviteRewardsRankInfo(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 点击切换到Invite Rewards界面
        const isVisible = await clickIfTextExists(page, 'Invite Rewards', {
            name: '新版返佣的排行榜的界面'
        });

        if (!isVisible) {
            return await handleFailure(test, '新版返佣的排行榜的界面Invite Rewards不可见，跳过');
        }

        const isJump = await test.switchToPage('进入返佣排行榜的排行榜的界面', {
            waitForSelector: 'text=Check the list detail',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isJump) {
            return await handleFailure(test, '页面切换失败');
        }

        // 等待元素出现
        await page.waitForSelector('.ranking-icon');
        // 点击 SVG
        await page.locator('.ranking-icon svg').click();

        return true;
    } catch (error) {
        return await handleFailure(test, `earnInviteRewardsRankInfo 执行失败: ${error.message}`, { throwError: true });
    }
}
