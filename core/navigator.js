// ============================================================
// 导航路由引擎（核心中的核心）
//
// 作用：
//   根据配置文件，自动将测试导航到目标功能页面
//   测试用例只需要调用 navigator.goToFeature('turntable')
//   不需要关心功能在首页还是在菜单里
//
// 流程：
//   goToFeature('turntable')
//   → 查配置得知 turntable 在 "home" 页面
//   → 调用 navigateToPage('home') 点击首页Tab
//   → 执行 pre_steps（如果有滚动等前置操作）
//   → 点击 turntable 的入口元素
//   → 到达功能页面，可以开始测试
// ============================================================

export class Navigator {
    /**
     * @param {import('@playwright/test').Page} page - Playwright page 对象
     * @param {import('./config-loader').ConfigLoader} configLoader - 配置加载器
     * @param {import('./element-loader').ElementLoader} elementLoader - 元素加载器
     */
    constructor(page, configLoader, elementLoader) {
        this.page = page;
        this.config = configLoader;
        this.el = elementLoader;
        this.currentPage = null; // 记录当前所在页面
    }

    // ===========================================================
    // 核心方法：导航到指定功能
    // ===========================================================

    /**
     * 导航到指定功能
     * 自动处理：页面切换 → 前置操作 → 点击入口
     *
     * @param {string} featureName - 功能名，如 'turntable'
     */
    async goToFeature(featureName) {
        // 1. 检查功能是否启用
        if (!this.config.isFeatureEnabled(featureName)) {
            throw new Error(
                `功能 "${featureName}" 在版面 "${this.config.brandName}" 中未启用`
            );
        }

        // 2. 获取功能配置
        const featureConfig = this.config.getFeatureConfig(featureName);
        if (!featureConfig) {
            throw new Error(`功能 "${featureName}" 的配置不存在`);
        }

        console.log(`[Navigator] 导航到功能: ${featureName} (${featureConfig.name})`);
        console.log(`[Navigator] 目标页面: ${featureConfig.location}`);

        // 3. 先导航到功能所在的页面
        await this.navigateToPage(featureConfig.location);

        // 4. 执行前置步骤（如滚动、展开菜单等）
        if (featureConfig.pre_steps) {
            await this._executeSteps(featureConfig.pre_steps);
        }

        // 5. 点击功能入口
        await this._clickFeatureEntry(featureConfig.entry);

        // 6. 等待功能页面加载
        await this.page.waitForLoadState('networkidle');

        console.log(`[Navigator] 已到达功能: ${featureName}`);
    }

    // ===========================================================
    // 页面导航
    // ===========================================================

    /**
     * 导航到指定页面（首页、菜单等）
     * @param {string} pageName - 页面名，如 'home', 'menu'
     */
    async navigateToPage(pageName) {
        // 如果已经在目标页面，跳过
        if (this.currentPage === pageName) {
            console.log(`[Navigator] 已在 ${pageName} 页面，跳过导航`);
            return;
        }

        const navConfig = this.config.getNavigationConfig(pageName);
        if (!navConfig) {
            throw new Error(`导航配置中没有 "${pageName}" 页面的定义`);
        }

        console.log(`[Navigator] 导航到页面: ${pageName}, 方式: ${navConfig.type}`);

        switch (navConfig.type) {
            case 'tab':
                await this._navigateByTab(navConfig);
                break;

            case 'url':
                await this._navigateByURL(navConfig);
                break;

            case 'menu':
                await this._navigateByMenu(navConfig);
                break;

            case 'sidebar':
                await this._navigateBySidebar(navConfig);
                break;

            default:
                // 兜底：尝试直接用 URL
                if (navConfig.url) {
                    await this.page.goto(navConfig.url);
                } else {
                    throw new Error(`不支持的导航类型: ${navConfig.type}`);
                }
        }

        this.currentPage = pageName;
        await this.page.waitForTimeout(500); // 等待页面切换动画
    }

    /** Tab 切换导航 */
    async _navigateByTab(navConfig) {
        const tabLocator = await this.el.smartLocate(this.page, navConfig.element);
        await tabLocator.click();
    }

    /** URL 直跳导航 */
    async _navigateByURL(navConfig) {
        const baseURL = this.config.getBaseURL();
        await this.page.goto(`${baseURL}${navConfig.url}`);
    }

    /** 菜单多步导航 */
    async _navigateByMenu(navConfig) {
        for (const step of navConfig.steps) {
            await this._executeSingleStep(step);
        }
    }

    /** 侧边栏导航 */
    async _navigateBySidebar(navConfig) {
        // 打开侧边栏
        const trigger = await this.el.smartLocate(this.page, navConfig.trigger_element);
        await trigger.click();
        await this.page.waitForTimeout(300);

        // 点击目标菜单项
        const menuItem = await this.el.smartLocate(this.page, navConfig.menu_element);
        await menuItem.click();
    }

    // ===========================================================
    // 点击功能入口
    // ===========================================================

    async _clickFeatureEntry(entryConfig) {
        switch (entryConfig.type) {
            case 'tab':
            case 'click':
                // 直接点击
                const loc = await this.el.smartLocate(this.page, entryConfig.element);
                await loc.click();
                break;

            case 'scroll-then-click':
                // 先滚动到目标区域，再点击
                if (entryConfig.scroll_target) {
                    const scrollTarget = await this.el.smartLocate(
                        this.page,
                        entryConfig.scroll_target
                    );
                    await scrollTarget.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(300);
                }
                const entryLoc = await this.el.smartLocate(this.page, entryConfig.element);
                await entryLoc.click();
                break;

            case 'deep-link':
                // DeepLink 直接跳转
                await this.page.goto(entryConfig.url);
                break;

            default:
                const defaultLoc = await this.el.smartLocate(this.page, entryConfig.element);
                await defaultLoc.click();
        }
    }

    // ===========================================================
    // 执行步骤序列
    // ===========================================================

    async _executeSteps(steps) {
        for (const step of steps) {
            await this._executeSingleStep(step);
        }
    }

    async _executeSingleStep(step) {
        switch (step.action) {
            case 'click':
                const clickLoc = await this.el.smartLocate(this.page, step.element);
                await clickLoc.click();
                break;

            case 'scroll':
                await this.page.mouse.wheel(
                    0,
                    step.direction === 'down' ? step.distance || 300 : -(step.distance || 300)
                );
                await this.page.waitForTimeout(300);
                break;

            case 'wait':
                await this.page.waitForTimeout(step.duration || 1000);
                break;

            case 'navigate':
                await this.navigateToPage(step.target);
                break;

            default:
                console.warn(`[Navigator] 未知的步骤类型: ${step.action}`);
        }
    }

    // ===========================================================
    // 辅助方法
    // ===========================================================

    /** 回到首页 */
    async goHome() {
        await this.navigateToPage('home');
    }

    /** 检查功能是否可用 */
    isFeatureAvailable(featureName) {
        return this.config.isFeatureEnabled(featureName);
    }
}
