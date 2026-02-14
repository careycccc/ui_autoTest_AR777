/**
 * 邀请页面验证公共逻辑
 * 用于复用邀请页面的验证功能
 */
import { handleTelegramJump, handleFailure } from '../utils.js';

/**
 * 验证邀请页面的完整性
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {Object} options - 配置选项
 * @param {string} options.name - 页面名称（用于日志）
 * @param {boolean} options.verifyTelegram - 是否验证 Telegram 跳转，默认 true
 * @param {boolean} options.verifyClipboard - 是否验证粘贴板，默认 true
 * @param {number} options.timeout - 超时时间，默认 3000
 * @returns {Promise<Object>} 验证结果
 */
export async function verifyInvitePage(page, test, options = {}) {
    const {
        name = '邀请页面',
        verifyTelegram = true,
        verifyClipboard = true,
        timeout = 3000
    } = options;

    const result = {
        success: false,
        inviteCodeFound: false,
        inviteCode: null,
        telegramJumpSuccess: false,
        clipboardVerified: false,
        clipboardContent: null,
        error: null
    };

    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            result.error = '页面已关闭';
            return result;
        }

        // 等待页面稳定
        await page.waitForTimeout(1000);

        // 验证邀请码元素
        const inviteCodeElement = page.locator('.invite .code span');
        const codeVisible = await inviteCodeElement.isVisible({ timeout }).catch(() => false);

        if (!codeVisible) {
            result.error = `${name}邀请码元素不可见`;
            console.log(`        ❌ ${result.error}`);
            await handleFailure(test, result.error, { screenshot: true, throwError: false });
            return result;
        }

        result.inviteCodeFound = true;

        // 获取邀请码
        const inviteCode = await inviteCodeElement.innerText();

        if (!inviteCode || inviteCode.trim() === '') {
            result.error = `${name}邀请码为空，页面数据异常`;
            console.log(`        ❌ ${result.error}`);
            await handleFailure(test, result.error, { screenshot: true, throwError: false });
            return result;
        }

        result.inviteCode = inviteCode;
        console.log(`        ✅ ${name}邀请码: ${inviteCode}`);

        // 🔥 验证粘贴板（必须验证）
        if (verifyClipboard) {
            console.log(`        🔍 开始验证粘贴板...`);
            const clipboardResult = await verifyClipboardLink(page, test, inviteCode, { name, timeout });

            if (!clipboardResult.success) {
                result.error = `粘贴板验证失败: ${clipboardResult.error}`;
                console.log(`        ❌ ${result.error}`);
                // 🔥 粘贴板验证失败，截图并返回失败
                await handleFailure(test, result.error, { screenshot: true, throwError: false });
                return result;
            }

            result.clipboardVerified = true;
            result.clipboardContent = clipboardResult.clipboardContent;
            console.log(`        ✅ ${name} 粘贴板验证成功`);
        }

        // 验证 Telegram 跳转（可选）
        if (verifyTelegram) {
            const jumpResult = await handleTelegramJump(page, '.share-icons', {
                telegramText: 'Telegram',
                jumpTimeout: 5000,
                waitAfterBack: 1000,
                verifyReturn: true,
                name: `${name}->Telegram`
            });

            if (!jumpResult.success) {
                console.log(`        ⚠️ ${name} Telegram 跳转验证失败: ${jumpResult.error || '未知错误'}`);
                // Telegram 跳转失败不影响整体成功（只是功能不可用）
                result.telegramJumpSuccess = false;
            } else {
                result.telegramJumpSuccess = true;
                console.log(`        ✅ ${name} Telegram 跳转验证成功`);
            }
        }

        result.success = true;
        return result;

    } catch (error) {
        result.error = error.message;
        console.log(`        ❌ ${name}验证失败: ${error.message}`);
        await handleFailure(test, `${name}验证异常: ${error.message}`, { screenshot: true, throwError: false });
        return result;
    }
}

/**
 * 验证粘贴板链接
 * @param {Page} page - Playwright page
 * @param {TestCase} test - Test case instance
 * @param {string} inviteCode - 邀请码
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 验证结果
 */
async function verifyClipboardLink(page, test, inviteCode, options = {}) {
    const { name = '邀请页面', timeout = 3000 } = options;

    const result = {
        success: false,
        clipboardContent: null,
        error: null
    };

    try {
        // 查找 "Copy Link" 按钮（通过文本定位）
        const copyLinkButton = page.locator('text=Copy Link').first();
        const buttonVisible = await copyLinkButton.isVisible({ timeout }).catch(() => false);

        if (!buttonVisible) {
            result.error = 'Copy Link 按钮不可见';
            console.log(`        ❌ ${result.error}`);
            return result;
        }

        console.log(`        ✓ 找到 Copy Link 按钮`);

        // 点击 Copy Link 按钮
        await copyLinkButton.click();
        console.log(`        ✓ 已点击 Copy Link 按钮`);

        // 等待 2 秒
        await page.waitForTimeout(2000);

        // 读取粘贴板内容
        const clipboardContent = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch (e) {
                return null;
            }
        });

        if (!clipboardContent) {
            result.error = '无法读取粘贴板内容，可能是浏览器权限问题';
            console.log(`        ❌ ${result.error}`);
            return result;
        }

        result.clipboardContent = clipboardContent;
        console.log(`        📋 粘贴板内容: ${clipboardContent}`);

        // 验证链接格式（必须是 https:// 开头）
        if (!clipboardContent.startsWith('https://')) {
            result.error = `粘贴板内容不是有效的 HTTPS 链接，实际内容: ${clipboardContent}`;
            console.log(`        ❌ ${result.error}`);
            return result;
        }

        console.log(`        ✓ 链接格式正确（https:// 开头）`);

        // 验证链接中是否包含邀请码
        if (!clipboardContent.includes(inviteCode)) {
            result.error = `粘贴板链接中不包含邀请码。期望包含: ${inviteCode}，实际链接: ${clipboardContent}`;
            console.log(`        ❌ ${result.error}`);
            return result;
        }

        console.log(`        ✓ 链接中包含邀请码 ${inviteCode}`);

        result.success = true;
        return result;

    } catch (error) {
        result.error = `粘贴板验证异常: ${error.message}`;
        console.log(`        ❌ ${result.error}`);
        return result;
    }
}
