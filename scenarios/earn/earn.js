import { PageRegion, getRegion, clickIfTextExists } from '../utils.js';

// 团队返佣

/**
 * 在轮播图中找到包含指定文字的 slide，滑动到它并点击 Detail
 * @param {Page} page - Playwright page
 * @param {string} targetText - 要匹配的文字，默认 'My team level'
 * @param {number} maxSwipes - 最大滑动次数
 */
export async function clickDetailInCarousel(page) {
    await page.locator('.slide').nth(1).locator('.detail:has-text("Detail")').click();
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
            console.log('        ⚠️ 页面已关闭，跳过操作');
            return false;
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
            console.log('        ❌ Detail 按钮不可见，无法继续');
            return false;
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
        console.log('        ❌ Withdrawal rewards 操作失败:', error.message);
        return false;
    }
}


/**
 * 新版返佣的邀请链接
 */
export async function earnInviteLink(page, test) {
    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            console.log('        ⚠️ 页面已关闭，跳过操作');
            return false;
        }

        // 点击邀请按钮
        const isVisible = await clickIfTextExists(page, 'INVITE FRIENDS FOR REWARDS', {
            name: '新版返佣的邀请链接按钮',
            timeout: 5000
        });

        if (!isVisible) {
            console.log('        ⚠️ 邀请按钮不可见，跳过');
            return false;
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
            console.log('        ⚠️ 页面在切换后关闭');
            return false;
        }

        // 进行页面的完整性判断
        const inviteCodeElement = page.locator('.invite .code span');
        const codeVisible = await inviteCodeElement.isVisible({ timeout: 3000 }).catch(() => false);

        if (!codeVisible) {
            console.log('        ⚠️ 邀请码元素不可见');
            return false;
        }

        const inviteCode = await inviteCodeElement.innerText();

        if (!inviteCode || inviteCode.trim() === '') {
            console.log('        ❌ 邀请码为空，无法继续');
            throw new Error('邀请码为空，页面数据异常');
        } else {
            console.log(`        ✅ 邀请码: ${inviteCode}`);
        }

        // 进行页面跳转验证，这里验证小飞机
        // 记录跳转前的 URL
        const originalUrl = page.url();
        console.log(`        原始页面 URL: ${originalUrl}`);

        // ========== 点击 Telegram 的 SVG ==========
        // 方法1：通过文字定位父元素，再点击 SVG
        const telegramItem = page.locator('.share-icons > div').filter({ hasText: 'Telegram' });
        const telegramVisible = await telegramItem.isVisible({ timeout: 3000 }).catch(() => false);

        if (!telegramVisible) {
            console.log('        ⚠️ Telegram 分享按钮不可见');
            return true; // 邀请码验证成功，只是分享功能不可用
        }

        await telegramItem.locator('svg').click();

        // ========== 验证是否跳转 ==========
        try {
            // 等待 URL 变化（最多等待 5 秒）
            await page.waitForURL((url) => url.toString() !== originalUrl, { timeout: 5000 });

            const newUrl = page.url();
            console.log(`        跳转成功！新页面 URL: ${newUrl}`);

            // 检查是否跳转到 Telegram
            if (newUrl.includes('telegram') || newUrl.includes('t.me')) {
                console.log('        ✅ 成功跳转到 Telegram 页面');
            } else {
                console.log(`        ⚠️ 跳转到了其他页面: ${newUrl}`);
            }

            // ========== 模拟返回原页面 ==========
            await page.goBack();
            await page.waitForLoadState('domcontentloaded');

            const returnedUrl = page.url();
            console.log(`        返回后的 URL: ${returnedUrl}`);

            // 验证是否回到原页面
            if (returnedUrl === originalUrl) {
                console.log('        ✅ 成功返回原页面');
            } else {
                console.log(`        ⚠️ 返回的页面与原页面不同`);
            }

        } catch (error) {
            console.log(`        ⚠️ 跳转验证失败: ${error.message}`);
        }

        return true;

    } catch (error) {
        console.log(`        ❌ earnInviteLink 执行失败: ${error.message}`);
        throw error; // 重新抛出错误以触发截图
    }
}