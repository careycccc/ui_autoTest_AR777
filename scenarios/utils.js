/**
 * 当文本存在时点击元素
 * @param {Page} page - Playwright 页面对象
 * @param {string} text - 要查找的文本
 * @param {object} options - 可选配置
 * @param {number} options.timeout - 等待超时时间（毫秒），默认 3000
 * @param {boolean} options.exact - 是否精确匹配文本，默认 false
 * @param {string} options.name - 描述文本位置
 * @param {number} options.waitAfter - 点击后等待时间（毫秒），默认 1000
 * @param {string} options.containerSelector - 父容器选择器，用于缩小查找范围
 * @param {string} options.specificSelector - 特定选择器，优先使用
 * @param {boolean} options.scrollIntoView - 是否滚动到元素可见位置，默认 true
 * @param {boolean} options.force - 是否强制点击，默认 false
 * @param {boolean} options.waitForStable - 点击前是否等待页面稳定，默认 true
 * @param {number} options.stableTimeout - 页面稳定等待超时时间，默认 3000ms
 * @param {Object} options.test - TestCase 实例，用于错误截图
 * @param {boolean} options.throwOnNotFound - 元素不可见时是否抛出错误，默认 false
 * @returns {Promise<boolean>} 返回是否成功点击
 */
export async function clickIfTextExists(page, text, options = {}) {
    const {
        timeout = 3000,
        exact = false,
        name = '未命名',
        waitAfter = 1000,
        containerSelector = null,
        specificSelector = null,
        scrollIntoView = true,
        force = false,
        waitForStable = true,
        stableTimeout = 3000,
        test = null,
        throwOnNotFound = false
    } = options;

    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            console.log(`        ⚠️ ${name} - 页面已关闭，跳过点击 "${text}"`);
            return false;
        }

        // 🔥 等待页面稳定（LCP 完成）
        if (waitForStable) {
            await waitForPageStableHelper(page, stableTimeout);
        }

        let locator;

        // 优先使用特定选择器
        if (specificSelector) {
            locator = page.locator(specificSelector);
        } else if (containerSelector) {
            // 在指定容器内查找
            const container = page.locator(containerSelector);
            locator = exact
                ? container.getByText(text, { exact: true })
                : container.getByText(text);
        } else {
            // 全局查找
            locator = exact
                ? page.getByText(text, { exact: true })
                : page.getByText(text);
        }

        // 检查元素是否可见
        const isVisible = await locator.isVisible({ timeout }).catch(() => false);

        if (!isVisible) {
            const errorMsg = `${name} - 文本 "${text}" 在 ${timeout}ms 后仍不可见`;
            console.log(`        ❌ ${errorMsg}`);

            // 🔥 如果提供了 test 实例，标记失败并截图
            if (test) {
                test.markPageTestFailed(errorMsg);
                await test.captureErrorScreenshot(`element-not-visible-${text}`);
            }

            // 🔥 如果设置了抛出错误，则抛出
            if (throwOnNotFound) {
                throw new Error(errorMsg);
            }

            return false;
        }

        // 滚动到元素可见位置
        if (scrollIntoView) {
            await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {
                console.log(`        ⚠️ ${name} - 滚动到 "${text}" 失败，继续尝试点击`);
            });
            await page.waitForTimeout(300);
        }

        // 点击元素
        await locator.click({ timeout: 5000, force });
        console.log(`        ✓ ${name} - 已点击 "${text}"`);

        // 点击后等待
        if (waitAfter > 0) {
            await page.waitForTimeout(waitAfter);
        }

        return true;
    } catch (error) {
        const errorMsg = `${name} - 点击文本 "${text}" 时出错: ${error.message}`;
        console.log(`        ❌ ${errorMsg}`);

        // 🔥 如果提供了 test 实例，标记失败并截图
        if (test) {
            test.markPageTestFailed(errorMsg);
            await test.captureErrorScreenshot(`click-error-${text}`);
        }

        // 🔥 如果设置了抛出错误，则抛出
        if (throwOnNotFound) {
            throw error;
        }

        return false;
    }
}

/**
 * 🔥 辅助函数：等待页面稳定
 * @param {Page} page - Playwright 页面对象
 * @param {number} maxWait - 最大等待时间
 */
async function waitForPageStableHelper(page, maxWait = 3000) {
    try {
        // 等待 DOM 加载
        await page.waitForLoadState('domcontentloaded', { timeout: maxWait }).catch(() => { });

        // 等待 LCP
        const lcpResult = await page.evaluate(() => {
            return new Promise((resolve) => {
                if ('PerformanceObserver' in window) {
                    try {
                        const observer = new PerformanceObserver((list) => {
                            const entries = list.getEntries();
                            const lastEntry = entries[entries.length - 1];
                            if (lastEntry) {
                                resolve(lastEntry.renderTime || lastEntry.loadTime);
                            }
                        });
                        observer.observe({ type: 'largest-contentful-paint', buffered: true });
                        setTimeout(() => {
                            observer.disconnect();
                            resolve(null);
                        }, 2000);
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        }).catch(() => null);

        if (lcpResult) {
            console.log(`        ✅ LCP: ${Math.round(lcpResult)}ms`);
        }

        // 额外等待确保稳定
        await page.waitForTimeout(300);

    } catch (e) {
        // 出错时至少等待 1 秒
        await page.waitForTimeout(1000);
    }
}



/**
 * Telegram 跳转和返回封装函数
 * @param {Page} page - Playwright 页面对象
 * @param {string} parentSelector - 父容器选择器，例如 '.link-wrapper'
 * @param {Object} options - 可选配置
 * @param {string} options.telegramText - Telegram 文本标识，默认 'Telegram'
 * @param {number} options.jumpTimeout - 跳转等待超时时间（毫秒），默认 5000
 * @param {number} options.waitAfterBack - 返回后等待时间（毫秒），默认 1000
 * @param {boolean} options.verifyReturn - 是否验证返回到原页面，默认 true
 * @returns {Promise<Object>} 返回结果对象
 */
export async function handleTelegramJump(page, parentSelector, options = {}) {
    const {
        telegramText = 'Telegram',
        jumpTimeout = 5000,
        waitAfterBack = 1000,
        verifyReturn = true,
        name = ''
    } = options;

    const result = {
        success: false,
        jumped: false,
        returned: false,
        originalUrl: null,
        jumpUrl: null,
        returnUrl: null,
        error: null
    };

    try {
        // 记录原始 URL
        result.originalUrl = page.url();
        console.log(`        📍 原始页面: ${result.originalUrl}`);

        // 1. 定位父容器
        const parentContainer = page.locator(parentSelector);
        const parentVisible = await parentContainer.isVisible({ timeout: 3000 }).catch(() => false);

        if (!parentVisible) {
            result.error = `父容器 "${name}" 不可见`;
            console.log(`        ⚠️ ${result.error}`);
            return result;
        }

        // 2. 在父容器中查找包含 Telegram 文本的子元素
        const telegramItem = parentContainer.locator('> *').filter({ hasText: telegramText });
        const telegramVisible = await telegramItem.isVisible({ timeout: 3000 }).catch(() => false);

        if (!telegramVisible) {
            result.error = `在 "${name}" 中未找到 "${telegramText}" 元素`;
            console.log(`        ⚠️ ${result.error}`);

            return result;
        }

        console.log(`        ✓ 找到 ${telegramText} 元素`);

        // 3. 点击 Telegram 元素（优先点击 SVG，如果没有则点击元素本身）
        const svgElement = telegramItem.locator('svg');
        const hasSvg = await svgElement.count() > 0;

        if (hasSvg) {
            await svgElement.first().click();
            console.log(`        ✓ 点击 ${telegramText} SVG 图标`);
        } else {
            await telegramItem.first().click();
            console.log(`        ✓ 点击 ${telegramText} 元素`);
        }

        // 4. 等待 URL 变化（跳转）
        try {
            await page.waitForURL(
                (url) => url.toString() !== result.originalUrl,
                { timeout: jumpTimeout }
            );

            result.jumpUrl = page.url();
            result.jumped = true;
            console.log(`        ✅ 跳转成功: ${result.jumpUrl}`);

            // 验证是否跳转到 Telegram
            if (result.jumpUrl.includes('telegram') || result.jumpUrl.includes('t.me')) {
                console.log(`        ✅ 确认跳转到 Telegram 页面`);
            } else {
                console.log(`        ⚠️ 跳转到其他页面（非 Telegram）`);
            }

        } catch (error) {
            result.error = `跳转超时: ${error.message}`;
            console.log(`        ⚠️ ${result.error}`);
            return result;
        }

        // 5. 返回原页面
        console.log(`        ⬅️ 返回原页面...`);
        await page.goBack();
        await page.waitForLoadState('domcontentloaded');

        // 等待页面稳定
        if (waitAfterBack > 0) {
            await page.waitForTimeout(waitAfterBack);
        }

        result.returnUrl = page.url();
        result.returned = true;
        console.log(`        ✓ 返回完成: ${result.returnUrl}`);

        // 6. 验证是否回到原页面
        if (verifyReturn) {
            if (result.returnUrl === result.originalUrl) {
                console.log(`        ✅ 成功返回原页面`);
                result.success = true;
            } else {
                result.error = '返回的页面与原页面不同';
                console.log(`        ⚠️ ${result.error}`);
                console.log(`        预期: ${result.originalUrl}`);
                console.log(`        实际: ${result.returnUrl}`);
            }
        } else {
            result.success = true;
        }

    } catch (error) {
        result.error = error.message;
        console.log(`        ❌ Telegram 跳转处理失败: ${error.message}`);
    }

    return result;
}

/**
 * 区域定位器类 - 先定位区域，再操作子元素
 */
export class PageRegion {
    constructor(page) {
        this.page = page;
        this._region = null;
    }

    /**
     * 进入指定区域
     * @param {string} selector - CSS 选择器
     * @param {Object} options - 配置选项
     * @param {string} options.hasText - 区域包含的文字
     * @param {string} options.hasId - 区域内子元素的 id
     * @param {string} options.hasClass - 区域内子元素的 class
     * @param {string} options.hasElement - 区域内子元素的选择器
     * @param {number} options.nth - 第几个元素 (从0开始)
     * @param {boolean} options.wait - 是否等待元素出现
     * @param {number} options.timeout - 超时时间(毫秒)
     * @returns {PageRegion} - 支持链式调用
     */
    async enterRegion(selector, options = {}) {
        const {
            hasText = null,
            hasId = null,
            hasClass = null,
            hasElement = null,
            nth = null,
            wait = true,
            timeout = 10000
        } = options;

        let locator = this.page.locator(selector);

        // 通过文字过滤
        if (hasText) {
            locator = locator.filter({ hasText: hasText });
        }

        // 通过包含特定 id 的子元素过滤
        if (hasId) {
            locator = locator.filter({ has: this.page.locator(`#${hasId}`) });
        }

        // 通过包含特定 class 的子元素过滤
        if (hasClass) {
            locator = locator.filter({ has: this.page.locator(`.${hasClass}`) });
        }

        // 通过包含特定选择器的子元素过滤
        if (hasElement) {
            locator = locator.filter({ has: this.page.locator(hasElement) });
        }

        // 选择第几个
        if (nth !== null) {
            locator = locator.nth(nth);
        }

        // 等待元素可见
        if (wait) {
            await locator.first().waitFor({ state: 'visible', timeout: timeout });
        }

        this._region = locator;
        return this;
    }

    /**
     * 获取当前区域的 Locator
     */
    get region() {
        if (!this._region) {
            throw new Error('请先调用 enterRegion() 进入一个区域');
        }
        return this._region;
    }

    // ============ 子元素定位方法 ============

    /**
     * 在区域内查找元素
     */
    find(selector) {
        return this.region.locator(selector);
    }

    /**
     * 在区域内通过文字查找
     */
    findByText(text, options = {}) {
        return this.region.getByText(text, options);
    }

    /**
     * 在区域内通过角色查找
     */
    findByRole(role, options = {}) {
        return this.region.getByRole(role, options);
    }

    // ============ 常用操作方法 ============

    /**
     * 点击区域内的元素
     */
    async click(selectorOrText = null) {
        if (selectorOrText) {
            if (selectorOrText.startsWith('.') || selectorOrText.startsWith('#')) {
                await this.find(selectorOrText).click();
            } else {
                await this.findByText(selectorOrText).click();
            }
        } else {
            await this.region.click();
        }
        return this;
    }

    /**
     * 填充区域内的输入框
     */
    async fill(selector, value) {
        await this.find(selector).fill(value);
        return this;
    }

    /**
     * 获取区域内元素的文字
     */
    async getText(selector = null) {
        if (selector) {
            return await this.find(selector).innerText();
        }
        return await this.region.innerText();
    }

    /**
     * 获取区域内多个元素的文字
     */
    async getTexts(selector) {
        return await this.find(selector).allInnerTexts();
    }

    /**
     * 获取区域内元素的属性
     */
    async getAttribute(selector, attr) {
        return await this.find(selector).getAttribute(attr);
    }

    /**
     * 检查元素是否可见
     */
    async isVisible(selector = null) {
        if (selector) {
            return await this.find(selector).isVisible();
        }
        return await this.region.isVisible();
    }

    /**
     * 计算匹配元素数量
     */
    async count(selector = null) {
        if (selector) {
            return await this.find(selector).count();
        }
        return await this.region.count();
    }

    /**
     * 高亮显示当前区域（调试用）
     */
    async highlight(duration = 2000) {
        await this.region.evaluate((element, dur) => {
            element.style.outline = '3px solid red';
            setTimeout(() => element.style.outline = '', dur);
        }, duration);
        return this;
    }

    /**
     * 对区域截图
     */
    async screenshot(path) {
        await this.region.screenshot({ path: path });
        return this;
    }
}

// ============ 快捷函数 ============

/**
 * 快捷函数：直接获取区域 Locator
 */
export async function getRegion(page, selector, options = {}) {
    const region = new PageRegion(page);
    await region.enterRegion(selector, options);
    return region.region;
}


/**
 * 失败处理函数 - 自动截图并返回 false
 * @param {Object} test - TestCase 实例
 * @param {string} errorMessage - 错误信息
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} - 返回 false
 */
export async function handleFailure(test, errorMessage, options = {}) {
    const { screenshot = true, throwError = false } = options;

    console.log(`        ❌ ${errorMessage}`);

    // 截图
    if (screenshot && test && test.currentPageRecord && !test.page.isClosed()) {
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
 * 验证元素是否存在及其内容，主要是验证Rulse里面有没有内容
 * @param {Page} page - Playwright page 对象
 * @param {string} selector - CSS 选择器
 * @returns {Promise<Object>} 验证结果
 */
export async function verifyElementContent(page, selector) {
    const element = page.locator(selector);

    const result = {
        exists: false,
        hasText: false,
        hasImages: false,
        hasContent: false,  // 新增：是否有任何内容
        isEmpty: true,      // 新增：容器是否为空
        text: '',
        imageCount: 0
    };

    // 检查元素是否存在
    result.exists = await element.count() > 0;
    if (!result.exists) return result;

    // 检查文字
    result.text = (await element.innerText()).trim();
    result.hasText = result.text.length > 0;

    // 检查图片
    result.imageCount = await element.locator('img').count();
    result.hasImages = result.imageCount > 0;

    // 判断容器是否有内容
    result.hasContent = result.hasText || result.hasImages;
    result.isEmpty = !result.hasContent;

    return result;
}


/**
 * 滑动加载更多数据 排行榜的滑动
 * @param {Page} page - Playwright page 对象
 * @param {string} containerSelector - 滚动容器选择器
 * @param {string} itemSelector - 子元素选择器
 * @param {number} threshold - 触发滑动的阈值（默认8）
 */
export async function scrollToLoadAll(page, containerSelector, itemSelector, threshold = 8) {
    const container = page.locator(containerSelector);

    // 检查容器是否存在
    if (await container.count() === 0) {
        console.log('❌ 容器不存在');
        return;
    }

    // 获取初始 item 数量
    let itemCount = await container.locator(itemSelector).count();
    console.log(`初始 item 数量: ${itemCount}`);

    // 如果少于等于阈值，不需要滑动
    if (itemCount <= threshold) {
        console.log(`item 数量 (${itemCount}) <= ${threshold}，无需滑动`);
        return;
    }

    console.log(`item 数量 (${itemCount}) > ${threshold}，开始滑动...`);

    // 获取容器的位置和大小
    const containerBox = await container.boundingBox();
    if (!containerBox) {
        console.log('❌ 无法获取容器位置');
        return;
    }

    let previousCount = 0;
    let noChangeCount = 0;
    const maxNoChangeAttempts = 3; // 连续3次无变化则停止

    while (noChangeCount < maxNoChangeAttempts) {
        previousCount = await container.locator(itemSelector).count();

        // 在容器内执行向上滑动（手指从下往上滑）
        const startX = containerBox.x + containerBox.width / 2;
        const startY = containerBox.y + containerBox.height * 0.8;
        const endY = containerBox.y + containerBox.height * 0.2;

        // 模拟手指滑动
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, endY, { steps: 10 });
        await page.mouse.up();

        // 等待可能的数据加载
        await page.waitForTimeout(500);

        // 检查是否有新的 item
        const currentCount = await container.locator(itemSelector).count();
        console.log(`滑动后 item 数量: ${currentCount}`);

        if (currentCount === previousCount) {
            noChangeCount++;
            console.log(`无新数据，连续 ${noChangeCount} 次`);
        } else {
            noChangeCount = 0; // 重置计数
        }
    }

    const finalCount = await container.locator(itemSelector).count();
    console.log(`✅ 滑动完成，最终 item 数量: ${finalCount}`);
}


/**
 * 页面滑动函数 - 模拟手指滑动操作
 * @param {Page} page - Playwright page 对象
 * @param {Object} options - 滑动配置选项
 * @param {string} options.direction - 滑动方向: 'up'(向上), 'down'(向下), 'left'(向左), 'right'(向右)
 * @param {number} options.distance - 滑动距离比例 (0-1)，默认 0.5 (滑动视口的一半距离)
 * @param {number} options.startRatio - 起始位置比例 (0-1)，默认根据方向自动计算
 * @param {number} options.duration - 滑动持续时间（毫秒），默认 300
 * @param {number} options.steps - 滑动步数，默认 10（越大越平滑）
 * @param {number} options.waitAfter - 滑动后等待时间（毫秒），默认 500
 * @returns {Promise<void>}
 * 
 * @example
 * // 向上滑动半屏（默认）
 * await swipePage(page, { direction: 'up' });
 * 
 * // 向上滑动 70% 的距离
 * await swipePage(page, { direction: 'up', distance: 0.7 });
 * 
 * // 从屏幕 80% 位置向上滑动到 20% 位置
 * await swipePage(page, { direction: 'up', startRatio: 0.8, distance: 0.6 });
 * 
 * // 向下滑动
 * await swipePage(page, { direction: 'down' });
 * 
 * // 向左滑动（轮播图）
 * await swipePage(page, { direction: 'left' });
 */
export async function swipePage(page, options = {}) {
    const {
        direction = 'up',
        distance = 0.5,
        startRatio = null,
        duration = 300,
        steps = 10,
        waitAfter = 500
    } = options;

    // 获取视口大小
    const viewportSize = page.viewportSize();
    const width = viewportSize.width;
    const height = viewportSize.height;

    let startX, startY, endX, endY;

    // 根据方向计算起始和结束位置
    switch (direction) {
        case 'up': // 向上滑动（手指从下往上）
            startX = width / 2;
            endX = width / 2;
            startY = startRatio !== null ? height * startRatio : height * (0.5 + distance / 2);
            endY = startY - height * distance;
            break;

        case 'down': // 向下滑动（手指从上往下）
            startX = width / 2;
            endX = width / 2;
            startY = startRatio !== null ? height * startRatio : height * (0.5 - distance / 2);
            endY = startY + height * distance;
            break;

        case 'left': // 向左滑动（手指从右往左）
            startY = height / 2;
            endY = height / 2;
            startX = startRatio !== null ? width * startRatio : width * (0.5 + distance / 2);
            endX = startX - width * distance;
            break;

        case 'right': // 向右滑动（手指从左往右）
            startY = height / 2;
            endY = height / 2;
            startX = startRatio !== null ? width * startRatio : width * (0.5 - distance / 2);
            endX = startX + width * distance;
            break;

        default:
            throw new Error(`不支持的滑动方向: ${direction}。支持的方向: up, down, left, right`);
    }

    // 执行滑动
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps });
    await page.mouse.up();

    // 等待页面稳定
    if (waitAfter > 0) {
        await page.waitForTimeout(waitAfter);
    }

    console.log(`        ✓ 已${direction === 'up' ? '向上' : direction === 'down' ? '向下' : direction === 'left' ? '向左' : '向右'}滑动页面 (距离: ${Math.round(distance * 100)}%)`);
}


/**
 * 获取当前页面的所有 API 请求及其返回值
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @param {string|RegExp|Array} options.urlFilter - URL 过滤器（可选）
 * @param {number} options.limit - 返回最近的 N 个请求（可选）
 * @param {boolean} options.onlySuccess - 只返回成功的请求（status 200-299），默认 false
 * @param {boolean} options.onlyErrors - 只返回错误的请求，默认 false
 * @param {number} options.minDuration - 最小耗时（毫秒），用于筛选慢请求（可选）
 * @param {boolean} options.includeDetails - 是否包含详细信息（headers, postData 等），默认 false
 * @returns {Array} 请求列表
 * 
 * @example
 * // 获取所有请求
 * const requests = getPageRequests(test);
 * 
 * // 获取最近 5 个请求
 * const requests = getPageRequests(test, { limit: 5 });
 * 
 * // 获取包含 'api' 的请求
 * const requests = getPageRequests(test, { urlFilter: 'api' });
 * 
 * // 获取匹配正则的请求
 * const requests = getPageRequests(test, { urlFilter: /\/api\/(user|order)/ });
 * 
 * // 获取多个 URL 模式的请求
 * const requests = getPageRequests(test, { urlFilter: ['/api/user', '/api/order'] });
 * 
 * // 只获取成功的请求
 * const requests = getPageRequests(test, { onlySuccess: true });
 * 
 * // 只获取错误的请求
 * const requests = getPageRequests(test, { onlyErrors: true });
 * 
 * // 获取耗时超过 1 秒的慢请求
 * const requests = getPageRequests(test, { minDuration: 1000 });
 */
export function getPageRequests(test, options = {}) {
    const {
        urlFilter = null,
        limit = null,
        onlySuccess = false,
        onlyErrors = false,
        minDuration = null,
        includeDetails = false
    } = options;

    if (!test || !test.networkMonitor) {
        console.log('        ⚠️ NetworkMonitor 不可用');
        return [];
    }

    // 获取所有 API 请求
    let requests = test.networkMonitor.getApiRequests();

    // 应用 URL 过滤器
    if (urlFilter) {
        requests = requests.filter(req => {
            const url = req.url;

            // 数组过滤器
            if (Array.isArray(urlFilter)) {
                return urlFilter.some(filter => {
                    if (typeof filter === 'string') {
                        return url.includes(filter);
                    } else if (filter instanceof RegExp) {
                        return filter.test(url);
                    }
                    return false;
                });
            }

            // 字符串过滤器
            if (typeof urlFilter === 'string') {
                return url.includes(urlFilter);
            }

            // 正则过滤器
            if (urlFilter instanceof RegExp) {
                return urlFilter.test(url);
            }

            return true;
        });
    }

    // 只返回成功的请求
    if (onlySuccess) {
        requests = requests.filter(req => {
            const status = req.response?.status;
            return status >= 200 && status < 300;
        });
    }

    // 只返回错误的请求
    if (onlyErrors) {
        requests = requests.filter(req => {
            return req.error !== null || (req.response?.status >= 400);
        });
    }

    // 筛选慢请求
    if (minDuration !== null) {
        requests = requests.filter(req => req.duration >= minDuration);
    }

    // 限制返回数量（取最新的）
    if (limit !== null && limit > 0) {
        requests = requests.slice(-limit);
    }

    // 格式化返回数据
    return requests.map(req => {
        const result = {
            url: req.url,
            method: req.method,
            status: req.response?.status,
            statusText: req.response?.statusText,
            duration: Math.round(req.duration),
            responseBody: req.responseBody,
            error: req.error,
            errorDetails: req.errorDetails
        };

        // 包含详细信息
        if (includeDetails) {
            result.headers = req.headers;
            result.responseHeaders = req.response?.headers;
            result.postData = req.postData;
            result.resourceType = req.resourceType;
            result.startTime = req.startTime;
            result.endTime = req.endTime;
        }

        return result;
    });
}

/**
 * 打印页面请求列表（格式化输出）
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项（同 getPageRequests）
 * @param {boolean} options.showBody - 是否显示响应体，默认 true
 * @param {number} options.bodyMaxLength - 响应体最大显示长度，默认 200
 * 
 * @example
 * // 打印所有请求
 * printPageRequests(test);
 * 
 * // 打印最近 5 个请求
 * printPageRequests(test, { limit: 5 });
 * 
 * // 打印包含 'api' 的请求
 * printPageRequests(test, { urlFilter: 'api' });
 * 
 * // 打印但不显示响应体
 * printPageRequests(test, { showBody: false });
 */
export function printPageRequests(test, options = {}) {
    const {
        showBody = true,
        bodyMaxLength = 200,
        ...filterOptions
    } = options;

    const requests = getPageRequests(test, filterOptions);

    if (requests.length === 0) {
        console.log('        ℹ️ 没有找到匹配的请求');
        return;
    }

    console.log(`\n        📊 页面请求列表 (共 ${requests.length} 个):`);
    console.log('        ' + '='.repeat(80));

    requests.forEach((req, index) => {
        const statusIcon = req.status >= 200 && req.status < 300 ? '✅' :
            req.status >= 400 ? '❌' : '⚠️';

        console.log(`\n        ${index + 1}. ${statusIcon} ${req.method} ${req.url}`);
        console.log(`           状态: ${req.status || 'N/A'} ${req.statusText || ''}`);
        console.log(`           耗时: ${req.duration}ms`);

        if (req.error) {
            console.log(`           ❌ 错误: ${req.error.message || req.error.type}`);
        }

        if (showBody && req.responseBody) {
            const bodyStr = typeof req.responseBody === 'string'
                ? req.responseBody
                : JSON.stringify(req.responseBody, null, 2);

            const displayBody = bodyStr.length > bodyMaxLength
                ? bodyStr.substring(0, bodyMaxLength) + '...'
                : bodyStr;

            console.log(`           响应: ${displayBody}`);
        }
    });

    console.log('\n        ' + '='.repeat(80));
}

/**
 * 查找特定的 API 请求
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {string|RegExp} urlPattern - URL 匹配模式
 * @param {Object} options - 配置选项
 * @param {boolean} options.latest - 是否返回最新的一个，默认 true
 * @returns {Object|Array} 单个请求对象或请求数组
 * 
 * @example
 * // 查找最新的登录请求
 * const loginReq = findRequest(test, '/api/login');
 * 
 * // 查找所有用户相关请求
 * const userReqs = findRequest(test, /\/api\/user/, { latest: false });
 */
export function findRequest(test, urlPattern, options = {}) {
    const { latest = true } = options;

    const requests = getPageRequests(test, { urlFilter: urlPattern });

    if (requests.length === 0) {
        return latest ? null : [];
    }

    return latest ? requests[requests.length - 1] : requests;
}

/**
 * 等待特定的 API 请求完成并返回结果
 * 
 * @param {Page} page - Playwright page 对象
 * @param {string|RegExp} urlPattern - URL 匹配模式
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 超时时间（毫秒），默认 10000
 * @param {Function} options.trigger - 触发请求的函数（可选）
 * @returns {Promise<Object>} 请求结果
 * 
 * @example
 * // 等待登录请求
 * const result = await waitForRequest(page, '/api/login', {
 *     trigger: async () => {
 *         await page.click('.login-button');
 *     }
 * });
 * 
 * // 只等待，不触发
 * const result = await waitForRequest(page, '/api/user/info');
 */
export async function waitForRequest(page, urlPattern, options = {}) {
    const {
        timeout = 10000,
        trigger = null
    } = options;

    const result = {
        success: false,
        url: null,
        status: null,
        body: null,
        error: null
    };

    try {
        // 设置响应监听
        const responsePromise = page.waitForResponse(
            response => {
                const url = response.url();
                if (typeof urlPattern === 'string') {
                    return url.includes(urlPattern);
                } else if (urlPattern instanceof RegExp) {
                    return urlPattern.test(url);
                }
                return false;
            },
            { timeout }
        );

        // 触发请求（如果提供了触发函数）
        if (trigger && typeof trigger === 'function') {
            await trigger();
        }

        // 等待响应
        const response = await responsePromise;
        const responseData = await response.json().catch(() => response.text());

        result.success = true;
        result.url = response.url();
        result.status = response.status();
        result.statusText = response.statusText();
        result.body = responseData;

        return result;

    } catch (error) {
        result.error = error.message;
        console.log(`        ⚠️ 等待请求失败: ${error.message}`);
        return result;
    }
}

/**
 * 获取页面请求的统计信息
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项（同 getPageRequests）
 * @returns {Object} 统计信息
 * 
 * @example
 * const stats = getRequestStats(test);
 * console.log('总请求数:', stats.total);
 * console.log('成功:', stats.success);
 * console.log('失败:', stats.failed);
 * console.log('平均耗时:', stats.avgDuration);
 */
export function getRequestStats(test, options = {}) {
    const requests = getPageRequests(test, options);

    const stats = {
        total: requests.length,
        success: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        slowRequests: [],
        errorRequests: []
    };

    if (requests.length === 0) {
        return stats;
    }

    requests.forEach(req => {
        // 统计成功/失败
        if (req.status >= 200 && req.status < 300 && !req.error) {
            stats.success++;
        } else {
            stats.failed++;
            stats.errorRequests.push({
                url: req.url,
                status: req.status,
                error: req.error
            });
        }

        // 统计耗时
        stats.totalDuration += req.duration;
        stats.minDuration = Math.min(stats.minDuration, req.duration);
        stats.maxDuration = Math.max(stats.maxDuration, req.duration);

        // 慢请求（超过 1 秒）
        if (req.duration > 1000) {
            stats.slowRequests.push({
                url: req.url,
                duration: req.duration
            });
        }
    });

    stats.avgDuration = Math.round(stats.totalDuration / requests.length);

    return stats;
}

/**
 * 打印请求统计信息
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项（同 getPageRequests）
 */
export function printRequestStats(test, options = {}) {
    const stats = getRequestStats(test, options);

    console.log('\n        📈 请求统计信息:');
    console.log('        ' + '='.repeat(50));
    console.log(`        总请求数: ${stats.total}`);
    console.log(`        成功: ${stats.success} ✅`);
    console.log(`        失败: ${stats.failed} ❌`);
    console.log(`        平均耗时: ${stats.avgDuration}ms`);
    console.log(`        最快: ${stats.minDuration}ms`);
    console.log(`        最慢: ${stats.maxDuration}ms`);

    if (stats.slowRequests.length > 0) {
        console.log(`\n        ⚠️ 慢请求 (>1s): ${stats.slowRequests.length} 个`);
        stats.slowRequests.forEach((req, index) => {
            console.log(`           ${index + 1}. ${req.url} (${req.duration}ms)`);
        });
    }

    if (stats.errorRequests.length > 0) {
        console.log(`\n        ❌ 错误请求: ${stats.errorRequests.length} 个`);
        stats.errorRequests.forEach((req, index) => {
            console.log(`           ${index + 1}. ${req.url} (${req.status || 'N/A'})`);
            if (req.error) {
                console.log(`              错误: ${req.error.message || req.error.type}`);
            }
        });
    }

    console.log('        ' + '='.repeat(50));
}


/**
 * 根据 API 路径数组获取对应的响应数据
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Array<string>} apiPaths - API 路径数组，例如 ['/api/user/info', '/api/turntable/spin']
 * @param {Object} options - 配置选项
 * @param {boolean} options.exactMatch - 是否精确匹配，默认 false（包含匹配）
 * @param {boolean} options.latest - 每个 API 只返回最新的一个，默认 true
 * @param {boolean} options.includeNotFound - 是否包含未找到的 API（返回 null），默认 true
 * @returns {Object} API 路径到响应数据的映射对象
 * 
 * @example
 * // 基本使用
 * const responses = getApiResponses(test, [
 *     '/api/user/info',
 *     '/api/turntable/spin',
 *     '/api/order/list'
 * ]);
 * 
 * console.log(responses['/api/user/info']);      // 用户信息响应
 * console.log(responses['/api/turntable/spin']); // 转盘响应
 * 
 * // 精确匹配
 * const responses = getApiResponses(test, ['/api/user'], { exactMatch: true });
 * 
 * // 获取所有匹配的请求（不只是最新的）
 * const responses = getApiResponses(test, ['/api/user'], { latest: false });
 */
export function getApiResponses(test, apiPaths, options = {}) {
    const {
        exactMatch = false,
        latest = true,
        includeNotFound = true
    } = options;

    if (!test || !test.networkMonitor) {
        console.log('        ⚠️ NetworkMonitor 不可用');
        return {};
    }

    if (!Array.isArray(apiPaths) || apiPaths.length === 0) {
        console.log('        ⚠️ apiPaths 必须是非空数组');
        return {};
    }

    // 获取所有 API 请求
    const allRequests = test.networkMonitor.getApiRequests();

    // 结果对象
    const result = {};

    // 遍历每个 API 路径
    apiPaths.forEach(apiPath => {
        // 查找匹配的请求
        const matchedRequests = allRequests.filter(req => {
            if (exactMatch) {
                // 精确匹配：URL 必须以 apiPath 结尾
                return req.url.endsWith(apiPath) || req.url.includes(apiPath + '?');
            } else {
                // 包含匹配：URL 包含 apiPath
                return req.url.includes(apiPath);
            }
        });

        if (matchedRequests.length > 0) {
            if (latest) {
                // 只返回最新的一个
                const latestRequest = matchedRequests[matchedRequests.length - 1];
                result[apiPath] = {
                    url: latestRequest.url,
                    method: latestRequest.method,
                    status: latestRequest.response?.status,
                    statusText: latestRequest.response?.statusText,
                    data: latestRequest.responseBody,
                    duration: Math.round(latestRequest.duration),
                    error: latestRequest.error,
                    timestamp: latestRequest.endTime
                };
            } else {
                // 返回所有匹配的请求
                result[apiPath] = matchedRequests.map(req => ({
                    url: req.url,
                    method: req.method,
                    status: req.response?.status,
                    statusText: req.response?.statusText,
                    data: req.responseBody,
                    duration: Math.round(req.duration),
                    error: req.error,
                    timestamp: req.endTime
                }));
            }
        } else if (includeNotFound) {
            // 未找到的 API
            result[apiPath] = null;
        }
    });

    return result;
}

/**
 * 根据 API 路径数组获取响应数据（简化版，直接返回 data）
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Array<string>} apiPaths - API 路径数组
 * @param {Object} options - 配置选项
 * @returns {Object} API 路径到响应数据的映射对象（只包含 data 字段）
 * 
 * @example
 * const data = getApiResponseData(test, [
 *     '/api/user/info',
 *     '/api/turntable/spin'
 * ]);
 * 
 * console.log(data['/api/user/info']);      // 直接是响应数据
 * console.log(data['/api/turntable/spin']); // 直接是响应数据
 */
export function getApiResponseData(test, apiPaths, options = {}) {
    const responses = getApiResponses(test, apiPaths, options);
    const result = {};

    Object.keys(responses).forEach(apiPath => {
        const response = responses[apiPath];
        if (response) {
            if (Array.isArray(response)) {
                // 多个请求的情况
                result[apiPath] = response.map(r => r.data);
            } else {
                // 单个请求的情况
                result[apiPath] = response.data;
            }
        } else {
            result[apiPath] = null;
        }
    });

    return result;
}

/**
 * 打印 API 响应数据（格式化输出）
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Array<string>} apiPaths - API 路径数组
 * @param {Object} options - 配置选项
 * @param {number} options.dataMaxLength - 数据最大显示长度，默认 300
 * 
 * @example
 * printApiResponses(test, [
 *     '/api/user/info',
 *     '/api/turntable/spin'
 * ]);
 */
export function printApiResponses(test, apiPaths, options = {}) {
    const {
        dataMaxLength = 300,
        ...otherOptions
    } = options;

    const responses = getApiResponses(test, apiPaths, otherOptions);

    console.log(`\n        📊 API 响应数据 (共 ${apiPaths.length} 个):`);
    console.log('        ' + '='.repeat(80));

    apiPaths.forEach((apiPath, index) => {
        const response = responses[apiPath];

        console.log(`\n        ${index + 1}. ${apiPath}`);

        if (!response) {
            console.log('           ❌ 未找到该 API 的请求');
            return;
        }

        if (Array.isArray(response)) {
            // 多个请求
            console.log(`           ℹ️ 找到 ${response.length} 个请求`);
            response.forEach((resp, idx) => {
                console.log(`\n           请求 ${idx + 1}:`);
                printSingleResponse(resp, dataMaxLength);
            });
        } else {
            // 单个请求
            printSingleResponse(response, dataMaxLength);
        }
    });

    console.log('\n        ' + '='.repeat(80));
}

/**
 * 打印单个响应（辅助函数）
 */
function printSingleResponse(response, dataMaxLength) {
    const statusIcon = response.status >= 200 && response.status < 300 ? '✅' :
        response.status >= 400 ? '❌' : '⚠️';

    console.log(`           ${statusIcon} 状态: ${response.status || 'N/A'} ${response.statusText || ''}`);
    console.log(`           ⏱️ 耗时: ${response.duration}ms`);
    console.log(`           🔗 URL: ${response.url}`);

    if (response.error) {
        console.log(`           ❌ 错误: ${response.error.message || response.error.type}`);
    }

    if (response.data) {
        const dataStr = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data, null, 2);

        const displayData = dataStr.length > dataMaxLength
            ? dataStr.substring(0, dataMaxLength) + '...'
            : dataStr;

        console.log(`           📦 响应数据:\n${displayData.split('\n').map(line => '              ' + line).join('\n')}`);
    } else {
        console.log('           ⚠️ 无响应数据');
    }
}

/**
 * 批量验证 API 响应
 * 
 * @param {TestCase} test - TestCase 实例
 * @param {Array<Object>} apiConfigs - API 配置数组
 * @returns {Object} 验证结果
 * 
 * @example
 * const result = validateApiResponses(test, [
 *     {
 *         path: '/api/user/info',
 *         expectedStatus: 200,
 *         validate: (data) => data.code === 0
 *     },
 *     {
 *         path: '/api/turntable/spin',
 *         expectedStatus: 200,
 *         validate: (data) => data.data?.reward !== undefined
 *     }
 * ]);
 * 
 * if (!result.allPassed) {
 *     console.log('验证失败:', result.failures);
 * }
 */
export function validateApiResponses(test, apiConfigs) {
    const apiPaths = apiConfigs.map(config => config.path);
    const responses = getApiResponses(test, apiPaths);

    const result = {
        total: apiConfigs.length,
        passed: 0,
        failed: 0,
        allPassed: true,
        results: [],
        failures: []
    };

    apiConfigs.forEach(config => {
        const { path, expectedStatus = 200, validate = null, name = null } = config;
        const response = responses[path];

        const testResult = {
            path: path,
            name: name || path,
            passed: false,
            errors: []
        };

        // 检查是否找到请求
        if (!response) {
            testResult.errors.push('未找到该 API 的请求');
            testResult.passed = false;
        } else {
            // 检查状态码
            if (response.status !== expectedStatus) {
                testResult.errors.push(`状态码错误: 期望 ${expectedStatus}, 实际 ${response.status}`);
            }

            // 检查是否有错误
            if (response.error) {
                testResult.errors.push(`API 错误: ${response.error.message || response.error.type}`);
            }

            // 自定义验证
            if (validate && typeof validate === 'function') {
                try {
                    const isValid = validate(response.data);
                    if (!isValid) {
                        testResult.errors.push('自定义验证失败');
                    }
                } catch (error) {
                    testResult.errors.push(`验证函数执行错误: ${error.message}`);
                }
            }

            testResult.passed = testResult.errors.length === 0;
        }

        result.results.push(testResult);

        if (testResult.passed) {
            result.passed++;
        } else {
            result.failed++;
            result.allPassed = false;
            result.failures.push(testResult);
        }
    });

    return result;
}

/**
 * 打印 API 验证结果
 * 
 * @param {Object} validationResult - validateApiResponses 的返回结果
 */
export function printValidationResult(validationResult) {
    console.log('\n        🔍 API 验证结果:');
    console.log('        ' + '='.repeat(50));
    console.log(`        总数: ${validationResult.total}`);
    console.log(`        通过: ${validationResult.passed} ✅`);
    console.log(`        失败: ${validationResult.failed} ❌`);

    if (validationResult.failures.length > 0) {
        console.log('\n        ❌ 失败的 API:');
        validationResult.failures.forEach((failure, index) => {
            console.log(`\n        ${index + 1}. ${failure.name}`);
            console.log(`           路径: ${failure.path}`);
            failure.errors.forEach(error => {
                console.log(`           - ${error}`);
            });
        });
    } else {
        console.log('\n        ✅ 所有 API 验证通过');
    }

    console.log('        ' + '='.repeat(50));
}
