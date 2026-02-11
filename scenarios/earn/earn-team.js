/**
 * 团队返佣相关功能
 */
import { PageRegion, clickIfTextExists, handleFailure } from '../utils.js';

/**
 * 进入团队详情页面
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnTeamDetail(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '进入团队详情->页面已关闭，跳过操作');
        }

        // 在轮播图中找到 "My team level" 并点击 Detail
        const slideLocator = page.locator('.swiper-slide').filter({ hasText: 'My team level' });
        const slideVisible = await slideLocator.isVisible({ timeout: 5000 }).catch(() => false);

        if (!slideVisible) {
            console.log('        ℹ️ 未找到 "My team level" slide，尝试滑动查找...');
            const swiperContainer = page.locator('.swiper-container').first();
            const containerVisible = await swiperContainer.isVisible({ timeout: 3000 }).catch(() => false);

            if (containerVisible) {
                for (let i = 0; i < 5; i++) {
                    await swiperContainer.swipe({ direction: 'left' }).catch(() => { });
                    await page.waitForTimeout(500);
                    const found = await slideLocator.isVisible({ timeout: 1000 }).catch(() => false);
                    if (found) {
                        console.log(`        ✅ 找到 "My team level" slide (滑动 ${i + 1} 次)`);
                        break;
                    }
                }
            }
        }

        // 点击 Detail 按钮
        const detailButton = slideLocator.locator('text=Detail');
        const detailVisible = await detailButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!detailVisible) {
            return await handleFailure(test, '进入团队详情->Detail 按钮不可见');
        }

        await detailButton.click();
        console.log('        ✅ 已点击 Detail 按钮');

        // 切换到团队详情页面
        await test.switchToPage('进入团队详情', {
            waitForSelector: 'text=Subordinate Data',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 点击切换后的页面的Level 1，Level 2，Level 3（依次执行）
        await clickIfTextExists(page, 'Level 1', { name: '新版返佣->团队详情' });
        await clickIfTextExists(page, 'Level 2', { name: '新版返佣->团队详情' });
        await clickIfTextExists(page, 'Level 3', { name: '新版返佣->团队详情' });

        console.log('        ✅ earnTeamDetail 执行完成');
        return true;

    } catch (error) {
        return await handleFailure(test, `进入团队详情->earnTeamDetail 执行失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 在轮播图中找到 "My team level" 并点击 Detail（用于 Withdrawal rewards）
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function earnWithdrawalRewards(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        // 在轮播图中找到 "My team level" 并点击 Detail
        const slideLocator = page.locator('.swiper-slide').filter({ hasText: 'My team level' });
        const slideVisible = await slideLocator.isVisible({ timeout: 5000 }).catch(() => false);

        if (!slideVisible) {
            console.log('        ℹ️ 未找到 "My team level" slide，尝试滑动查找...');

            const swiperContainer = page.locator('.swiper-container').first();
            const containerVisible = await swiperContainer.isVisible({ timeout: 3000 }).catch(() => false);

            if (containerVisible) {
                for (let i = 0; i < 5; i++) {
                    await swiperContainer.swipe({ direction: 'left' }).catch(() => { });
                    await page.waitForTimeout(500);

                    const found = await slideLocator.isVisible({ timeout: 1000 }).catch(() => false);
                    if (found) {
                        console.log(`        ✅ 找到 "My team level" slide (滑动 ${i + 1} 次)`);
                        break;
                    }
                }
            }
        }

        // 点击 Detail 按钮
        const detailButton = slideLocator.locator('text=Detail');
        if (!await checkElementVisible(detailButton, test, 'Detail 按钮')) {
            return false;
        }

        await detailButton.click();
        console.log('        ✅ 已点击 Detail 按钮');

        // 切换到 Withdrawal rewards 页面
        await test.switchToPage('进入返佣的Withdrawal rewards界面', {
            waitForSelector: 'text=Withdrawal rewards',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 等待页面稳定
        await page.waitForTimeout(1000);

        console.log('        ✅ earnWithdrawalRewards 执行完成');
        return true;

    } catch (error) {
        return await handleFailure(test, `Withdrawal rewards 操作失败: ${error.message}`, { throwError: true });
    }
}

/**
 * 在我的团队的Withdrawal rewards里面点击Claim，Detail按钮
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 */
export async function Withdrawalrewards(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭，跳过操作');
        }

        const region = new PageRegion(page);

        // 1.进入Withdrawal rewards区域
        await region.enterRegion('.withdrawal', { hasText: 'Withdrawal rewards' });
        console.log('        ✓ 已进入 Withdrawal rewards 区域');

        // 2.检查 Claim 按钮状态（按钮是灰色disabled状态，跳过点击）
        const claimButton = region.find('#withdrawalDetail');
        const isVisible = await claimButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (isVisible) {
            // 检查按钮是否被禁用
            const isDisabled = await claimButton.evaluate(el => el.classList.contains('disabled')).catch(() => true);

            if (isDisabled) {
                console.log('        ℹ️ Claim 按钮已禁用（灰色），跳过点击');
            } else {
                // 只有在按钮可用时才点击
                await claimButton.click({ force: true, timeout: 5000 });
                console.log('        ✓ 已点击 Claim 按钮');
                await page.waitForTimeout(1000);
            }
        } else {
            console.log('        ℹ️ Claim 按钮不可见');
        }

        // 3.直接点击 Detail 按钮（这个才是主要操作）
        const detailButton = region.findByText('Detail');
        const detailVisible = await detailButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!detailVisible) {
            return await handleFailure(test, 'Detail 按钮不可见，无法继续');
        }

        // 使用 force: true 强制点击，忽略可能的遮挡
        await detailButton.click({ force: true, timeout: 5000 });
        console.log('        ✓ 已点击 Detail 按钮');
        await page.waitForTimeout(1500);

        // 4.切换到新页面 Reward Details
        await test.switchToPage('返佣详情页面Reward Details', {
            waitForSelector: 'text=Reward Details',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 5.点击详情里面的筛选按钮
        await clickIfTextExists(page, 'All', { name: '新版返佣->佣金详情', waitAfter: 500 });
        await clickIfTextExists(page, 'Bet', { name: '新版返佣->佣金详情', waitAfter: 500 });
        await clickIfTextExists(page, 'Deposit', { name: '新版返佣->佣金详情', waitAfter: 500 });
        await clickIfTextExists(page, 'Task', { name: '新版返佣->佣金详情', waitAfter: 500 });
        await clickIfTextExists(page, 'Invite', { name: '新版返佣->佣金详情', waitAfter: 500 });

        console.log('        ✅ Withdrawal rewards 操作完成');
        return true;
    } catch (error) {
        return await handleFailure(test, `Withdrawal rewards 操作失败: ${error.message}`, { throwError: true });
    }
}

// 辅助函数
async function checkElementVisible(locator, test, elementName) {
    const isVisible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
        await handleFailure(test, `${elementName} 不可见`);
        return false;
    }
    return true;
}
