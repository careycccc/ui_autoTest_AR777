/**
 * 邀请转盘 - 邀请按钮功能
 */
import { swipePage, handleFailure } from '../utils.js';
import { verifyInvitePage } from '../common/invite-verification.js';

/**
 * 邀请转盘 - 点击邀请按钮并验证邀请页面
 * @param {Page} page - Playwright page
 * @param {Object} auth - 认证对象
 * @param {TestCase} test - Test case instance
 */
export async function turntableInviteButton(page, auth, test) {
    try {
        console.log('        🎯 开始邀请转盘邀请按钮测试...');

        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 第一步：确保在邀请转盘页面
        const currentUrl = page.url();
        if (!currentUrl.includes('/turntable')) {
            return await handleFailure(test, `当前不在转盘页面: ${currentUrl}`, { throwError: true });
        }
        console.log('        ✓ 确认在邀请转盘页面');

        // 第二步：检查邀请按钮是否可见，不可见才滑动
        const inviteButton = page.locator('.invite_btn', { hasText: 'INVITE FRIENDS FOR REWARDS' });
        let buttonVisible = await inviteButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (!buttonVisible) {
            console.log('        📱 邀请按钮不可见，向下滑动半个屏幕...');
            await swipePage(page, {
                direction: 'up',
                distance: 0.5,
                startRatio: 0.7
            });
            await page.waitForTimeout(1000);

            // 滑动后再次检查按钮是否可见
            buttonVisible = await inviteButton.isVisible({ timeout: 5000 }).catch(() => false);
        } else {
            console.log('        ✓ 邀请按钮已可见，无需滑动');
        }

        // 第三步：点击邀请按钮
        if (!buttonVisible) {
            return await handleFailure(test, '邀请按钮不可见（滑动后仍不可见）', { throwError: true });
        }

        console.log('        ✓ 找到邀请按钮');
        await inviteButton.click();
        console.log('        ✓ 已点击邀请按钮');

        // 等待页面切换
        await page.waitForTimeout(1000);

        // 切换到邀请页面
        const isJump = await test.switchToPage('邀请转盘->进入邀请页面', {
            waitForSelector: 'text=Share',
            waitTime: 1000,
            collectPreviousPage: true
        });

        if (!isJump) {
            return await handleFailure(test, '邀请页面切换失败', { throwError: true });
        }

        // 第四步：验证邀请页面（复用公共逻辑）
        console.log('        🔍 验证邀请页面...');
        const verifyResult = await verifyInvitePage(page, test, {
            name: '邀请转盘->邀请页面',
            verifyTelegram: true,
            verifyClipboard: true  // 验证粘贴板
        });

        if (!verifyResult.success) {
            return await handleFailure(test, `邀请页面验证失败: ${verifyResult.error}`, { throwError: true });
        }

        console.log('        ✅ 邀请转盘邀请按钮测试完成');
        return true;

    } catch (error) {
        return await handleFailure(test, `turntableInviteButton 执行失败: ${error.message}`, { throwError: true });
    }
}
