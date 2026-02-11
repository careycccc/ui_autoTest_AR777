/**
 * 统一错误处理工具
 * 用于在返回 false 之前自动截图并记录错误
 */

/**
 * 处理失败场景：截图 + 记录错误 + 返回 false
 * @param {Object} test - TestCase 实例
 * @param {string} errorMessage - 错误信息
 * @param {Object} options - 配置选项
 * @param {boolean} options.screenshot - 是否截图（默认 true）
 * @param {boolean} options.throwError - 是否抛出异常（默认 false）
 * @returns {Promise<boolean>} - 返回 false
 */
export async function handleFailure(test, errorMessage, options = {}) {
    const {
        screenshot = true,
        throwError = false
    } = options;

    console.log(`        ❌ ${errorMessage}`);

    // 截图
    if (screenshot && test && test.currentPageRecord) {
        try {
            const screenshotPath = await test.captureScreenshot(`error-${Date.now()}`);

            // 标记为错误截图
            if (test.currentPageRecord) {
                test.currentPageRecord.errorScreenshotTaken = true;
                test.currentPageRecord.screenshots.push({
                    name: `错误: ${errorMessage}`,
                    path: screenshotPath,
                    timestamp: new Date().toISOString(),
                    isError: true
                });
            }

            console.log(`        📸 已截取错误截图`);
        } catch (e) {
            console.log(`        ⚠️ 截图失败: ${e.message}`);
        }
    }

    // 如果需要抛出异常
    if (throwError) {
        throw new Error(errorMessage);
    }

    return false;
}

/**
 * 检查页面是否关闭，如果关闭则处理失败
 * @param {Object} page - Playwright Page 对象
 * @param {Object} test - TestCase 实例
 * @param {string} context - 上下文信息
 * @returns {Promise<boolean>} - 页面正常返回 true，关闭返回 false
 */
export async function checkPageClosed(page, test, context = '') {
    if (!page || page.isClosed()) {
        await handleFailure(test, `${context} - 页面已关闭`, { screenshot: false });
        return false;
    }
    return true;
}

/**
 * 检查元素是否可见，不可见则处理失败
 * @param {Object} locator - Playwright Locator 对象
 * @param {Object} test - TestCase 实例
 * @param {string} elementName - 元素名称
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} - 可见返回 true，不可见返回 false
 */
export async function checkElementVisible(locator, test, elementName, options = {}) {
    const { timeout = 3000, screenshot = true } = options;

    try {
        const isVisible = await locator.isVisible({ timeout }).catch(() => false);

        if (!isVisible) {
            await handleFailure(test, `${elementName} 不可见`, { screenshot });
            return false;
        }

        return true;
    } catch (error) {
        await handleFailure(test, `检查 ${elementName} 可见性失败: ${error.message}`, { screenshot });
        return false;
    }
}

/**
 * 安全执行操作，失败时自动截图
 * @param {Function} fn - 要执行的异步函数
 * @param {Object} test - TestCase 实例
 * @param {string} operationName - 操作名称
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} - 成功返回 true，失败返回 false
 */
export async function safeExecute(fn, test, operationName, options = {}) {
    const { screenshot = true, throwError = false } = options;

    try {
        await fn();
        return true;
    } catch (error) {
        await handleFailure(test, `${operationName} 失败: ${error.message}`, { screenshot, throwError });
        return false;
    }
}
