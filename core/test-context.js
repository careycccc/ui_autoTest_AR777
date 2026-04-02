// ============================================================
// 测试上下文
// 整合 ConfigLoader + ElementLoader + Navigator
// 提供给测试用例使用的统一入口
// ============================================================

import { ConfigLoader } from './config-loader.js';
import { ElementLoader } from './element-loader.js';
import { Navigator } from './navigator.js';

export class TestContext {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} brandName
     */
    constructor(page, brandName) {
        this.page = page;
        this.brandName = brandName;

        // 初始化三大组件
        this.config = new ConfigLoader(brandName);
        this.el = new ElementLoader(brandName);
        this.nav = null; // 延迟初始化
    }

    /**
     * 初始化上下文（异步加载配置和元素）
     */
    async init() {
        await this.config.load();
        await this.el.loadAll();
        this.nav = new Navigator(this.page, this.config, this.el);
        return this;
    }

    /** 导航到功能（快捷方法） */
    async goToFeature(featureName) {
        return this.nav.goToFeature(featureName);
    }

    /** 导航到页面（快捷方法） */
    async goToPage(pageName) {
        return this.nav.navigateToPage(pageName);
    }

    /** 查找元素（快捷方法） */
    async find(elementKey) {
        return this.el.smartLocate(this.page, elementKey);
    }

    /** 点击元素（快捷方法） */
    async click(elementKey) {
        const loc = await this.find(elementKey);
        await loc.click();
    }

    /** 输入文本（快捷方法） */
    async fill(elementKey, text) {
        const loc = await this.find(elementKey);
        await loc.fill(text);
    }

    /** 获取文本（快捷方法） */
    async getText(elementKey) {
        const loc = await this.find(elementKey);
        return loc.textContent();
    }

    /** 检查元素是否可见 */
    async isVisible(elementKey) {
        try {
            const selector = this.el.getSelector(elementKey);
            return await this.page.locator(selector).isVisible();
        } catch {
            return false;
        }
    }

    /** 等待加载完成 */
    async waitForReady() {
        // 等待 loading 消失（如果有的话）
        if (this.el.has('loading_spinner')) {
            const spinner = this.el.getSelector('loading_spinner');
            await this.page
                .locator(spinner)
                .waitFor({ state: 'hidden', timeout: 10000 })
                .catch(() => { });
        }
        await this.page.waitForLoadState('domcontentloaded');
    }

    /** 检查功能是否启用 */
    isFeatureEnabled(featureName) {
        return this.config.isFeatureEnabled(featureName);
    }

    /** 获取版面名 */
    getBrandName() {
        return this.config.getProjectInfo().name;
    }

    /** 获取 baseURL */
    getBaseURL() {
        return this.config.getBaseURL();
    }

    /** 获取登录配置 */
    getLoginConfig() {
        return this.config.getLoginConfig();
    }

    /** 获取设备配置 */
    getDevice() {
        return this.config.getDevice();
    }
}
