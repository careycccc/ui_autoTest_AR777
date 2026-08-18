/**
 * 游戏二级页面入口 - 前置条件模块
 *
 * 职责：从已登录的首页进入游戏二级页面（全部游戏列表页）。
 * 这是一个「大的前置条件」，后续多个游戏类型的用例都基于此页面展开。
 *
 * 定位策略（按优先级，命中即停）：
 *   1. .see-all              →  <span class="see-all">See All</span>
 *   2. .games-info .all-link →  <div class="games-info">...<span class="all-link">All</span></div>
 *   3. .all-link             →  脱离 .games-info 容器的兜底
 *   4. 文本匹配 All          →  class 全部失效时的最后兜底
 *
 * 首页可能同时存在多个入口，统一取第一个。
 */

/** 入口定位策略表 */
const ENTRY_STRATEGIES = [
    { name: '.see-all', build: page => page.locator('.see-all') },
    { name: '.games-info .all-link', build: page => page.locator('.games-info .all-link') },
    { name: '.all-link', build: page => page.locator('.all-link') },
    {
        name: '文本匹配 All',
        // 匹配 "All" 与 "See All"，避免命中 "Allowance" 这类含 All 的长文本
        build: page => page.getByText(/^\s*(see\s+)?all\s*$/i)
    }
];

/**
 * 在首页查找游戏二级页面的入口元素
 *
 * @param {import('playwright').Page} page
 * @param {number} timeout 单个策略的可见性判定超时(ms)
 * @returns {Promise<{locator:any, strategy:string, count:number}|null>}
 */
export async function findGameEntry(page, timeout = 2000) {
    for (const strategy of ENTRY_STRATEGIES) {
        const locator = strategy.build(page);
        const count = await locator.count().catch(() => 0);

        if (count === 0) {
            console.log(`      ✗ 策略「${strategy.name}」未匹配到元素`);
            continue;
        }

        // 首页可能有多个入口，统一取第一个
        const first = locator.first();
        const visible = await first.isVisible({ timeout }).catch(() => false);

        if (!visible) {
            console.log(`      ✗ 策略「${strategy.name}」匹配到 ${count} 个但均不可见`);
            continue;
        }

        const text = await first.textContent().catch(() => '');
        console.log(`      ✓ 策略「${strategy.name}」命中 ${count} 个，取第一个，文本: "${(text || '').trim()}"`);

        return { locator: first, strategy: strategy.name, count };
    }

    return null;
}

/**
 * 从首页进入游戏二级页面
 *
 * @param {import('playwright').Page} page
 * @param {object} auth  AuthHelper 实例
 * @param {object} options
 * @param {boolean} options.clearPopups  进入前是否先清理首页弹窗，默认 true
 * @param {number}  options.routeTimeout 点击后等待路由变化的超时(ms)，默认 5000
 * @returns {Promise<{success:boolean, strategy?:string, urlBefore:string, urlAfter:string}>}
 */
export async function enterGameSubPage(page, auth, options = {}) {
    const { clearPopups = true, routeTimeout = 5000 } = options;

    // ① 清理首页弹窗，避免遮挡入口元素
    if (clearPopups) {
        console.log('      🧹 清理首页弹窗...');
        await auth.checkAndHandleHomePopups(20).catch(e => {
            console.log(`      ⚠️ 弹窗清理异常（不阻断）: ${e.message}`);
        });
        await auth.safeWait(1000);
    }

    // ② 查找入口
    console.log('      🔍 查找游戏二级页面入口...');
    const entry = await findGameEntry(page);

    if (!entry) {
        throw new Error('未找到游戏二级页面入口：.see-all / .all-link / 文本 All 均未命中');
    }

    // ③ 点击进入
    const urlBefore = page.url();
    await entry.locator.click();
    console.log(`      👆 已点击入口（策略: ${entry.strategy}）`);

    // ④ 以路由变化判定是否进入二级页面
    const changed = await waitForUrlChange(page, urlBefore, routeTimeout);
    await auth.safeWait(1000);

    const urlAfter = page.url();

    if (!changed) {
        throw new Error(`点击入口后 ${routeTimeout}ms 内路由未变化，未进入二级页面（仍在 ${urlAfter}）`);
    }

    console.log(`      ✅ 已进入游戏二级页面`);
    console.log(`         ${urlBefore}`);
    console.log(`      →  ${urlAfter}`);

    return { success: true, strategy: entry.strategy, urlBefore, urlAfter };
}

/**
 * 等待路由变化
 */
async function waitForUrlChange(page, urlBefore, timeout = 5000) {
    try {
        await page.waitForFunction(
            prev => window.location.href !== prev,
            urlBefore,
            { timeout }
        );
        return true;
    } catch {
        return false;
    }
}
