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
