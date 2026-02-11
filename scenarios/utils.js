/**
 * 当文本存在时点击元素
 * @param {Page} page - Playwright 页面对象
 * @param {string} text - 要查找的文本
 * @param {object} options - 可选配置
 * @param {number} options.timeout - 等待超时时间（毫秒），默认 5000
 * @param {boolean} options.exact - 是否精确匹配文本，默认 false
 * @param {string} options.name - 描述文本位置
 * @param {number} options.waitAfter - 点击后等待时间（毫秒），默认 1000
 * @returns {Promise<boolean>} 返回是否成功点击
 */
export async function clickIfTextExists(page, text, options = {}) {
    const {
        timeout = 3000,
        exact = false,
        name = '未命名',
        waitAfter = 1000,
    } = options;

    try {
        // 检查页面是否已关闭
        if (!page || page.isClosed()) {
            console.log(`        ⚠️ ${name} - 页面已关闭，跳过点击 "${text}"`);
            return false;
        }

        const locator = exact
            ? page.getByText(text, { exact: true })
            : page.getByText(text);

        // 检查元素是否可见
        const isVisible = await locator.isVisible({ timeout }).catch(() => false);

        if (!isVisible) {
            console.log(`        ℹ️ ${name} - 文本 "${text}" 不存在或不可见`);
            return false;
        }

        // 等待元素稳定后再点击
        await locator.click({ timeout: 5000, force: false });
        console.log(`        ✓ ${name} - 已点击 "${text}"`);

        // 点击后等待
        if (waitAfter > 0) {
            await page.waitForTimeout(waitAfter);
        }

        return true;
    } catch (error) {
        console.log(`        ❌ ${name} - 点击文本 "${text}" 时出错: ${error.message}`);
        return false;
    }
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
