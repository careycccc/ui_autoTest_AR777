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

        // 先处理平台的 OK 确认弹窗（如新账号首登的 "Welcome Lucky Jackpot"）。
        // 必须放在 checkAndHandleHomePopups 之前：后者只认 "View My Bonus"
        // 和弹窗图片，遇到这类弹窗会「识别到却关不掉」，一路空转到 20 次上限，
        // 既拖慢流程，最终还会遮挡 .see-all 让点击干等 30 秒超时。
        const { dismissConfirmPopup, dismissBlockingPopups } = await import('./game-play.js');
        for (let i = 0; i < 5; i++) {
            const closed = await dismissConfirmPopup(page);
            if (!closed) break;   // 已经没有确认弹窗了
        }

        await auth.checkAndHandleHomePopups(20).catch(e => {
            console.log(`      ⚠️ 弹窗清理异常（不阻断）: ${e.message}`);
        });

        // 全屏强制弹窗（Welcome Lucky Jackpot / N FREE SPINS WAITING）
        // 没有关闭按钮，上面两步都处理不掉，必须单独清
        await dismissBlockingPopups(page, { dumpHtml: true });

        await auth.safeWait(1000);
    }

    // ② 查找入口
    console.log('      🔍 查找游戏二级页面入口...');
    let entry = await findGameEntry(page);

    // 找不到通常意味着已不在首页（关弹窗时点击穿透可能把页面带到别处），
    // 导航回首页再试一次，而不是直接判失败
    if (!entry) {
        const { dataConfig } = await import('../../config.js');
        console.log(`      ⚠️ 未找到入口，当前路由: ${page.url()}`);
        console.log(`      ↩️ 导航回首页后重试...`);

        await page.goto(dataConfig.url, { waitUntil: 'load', timeout: 30000 }).catch(() => { });
        await auth.safeWait(2000);

        const { dismissBlockingPopups } = await import('./game-play.js');
        await dismissBlockingPopups(page);

        entry = await findGameEntry(page);
    }

    if (!entry) {
        throw new Error(
            `未找到游戏二级页面入口：.see-all / .all-link / 文本 All 均未命中（当前 ${page.url()}）`
        );
    }

    // ③ 点击进入
    const urlBefore = page.url();

    try {
        // 缩短超时：默认 30s 会白等；被遮挡时应尽快转入重试
        await entry.locator.click({ timeout: 8000 });
    } catch (firstErr) {
        // 点击失败几乎都是被弹窗遮挡 —— 清理后重试一次
        console.log(`      ⚠️ 首次点击入口失败，清理遮挡后重试: ${firstErr.message.split('\n')[0]}`);

        const { dismissBlockingPopups } = await import('./game-play.js');
        await dismissBlockingPopups(page, { dumpHtml: true });
        await auth.safeWait(800);

        try {
            await entry.locator.click({ timeout: 8000 });
        } catch (e) {
            // 仍失败则 dump 出实际挡在上面的元素，便于定位新出现的弹窗
            const blockers = await dumpBlockingOverlays(page).catch(() => []);
            console.log(`      ❌ 点击入口失败: ${e.message.split('\n')[0]}`);
            console.log(`      🔎 当前可见遮挡层: ${JSON.stringify(blockers)}`);
            throw new Error(
                `点击游戏入口被遮挡（策略 ${entry.strategy}）。可见遮挡层: ${JSON.stringify(blockers)}`
            );
        }
    }

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
 * 列出当前覆盖在页面上的遮挡层
 *
 * 点击被拦截时用于定位「到底是什么弹窗挡住了」——
 * canvas/DOM 混合页面没法靠肉眼判断，日志里必须留下证据。
 */
async function dumpBlockingOverlays(page) {
    return await page.evaluate(() => {
        const out = [];
        const seen = new Set();

        document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;

            const r = el.getBoundingClientRect();
            // 只关心真正盖住内容的大块元素
            if (r.width < 150 || r.height < 100) return;

            const z = parseInt(cs.zIndex, 10);
            const floating = cs.position === 'fixed' || cs.position === 'absolute';
            if (!floating && !(z > 0)) return;

            const cls = (el.className?.toString?.() || '').slice(0, 60);
            const key = `${el.tagName}|${cls}`;
            if (seen.has(key)) return;
            seen.add(key);

            // 同时列出该遮挡层内部的可点击元素，用于确定怎么关掉它
            const clickables = [];
            el.querySelectorAll('button, [class*="btn"], [class*="close"], [class*="Close"], img, svg, i')
                .forEach(c => {
                    const cr = c.getBoundingClientRect();
                    if (cr.width < 8 || cr.height < 8) return;
                    if (clickables.length >= 6) return;
                    clickables.push({
                        tag: c.tagName.toLowerCase(),
                        cls: (c.className?.toString?.() || '').slice(0, 45),
                        txt: (c.textContent || '').trim().slice(0, 15),
                        at: `${Math.round(cr.x)},${Math.round(cr.y)}`,
                        wh: `${Math.round(cr.width)}x${Math.round(cr.height)}`
                    });
                });

            out.push({
                tag: el.tagName.toLowerCase(),
                cls,
                z: cs.zIndex,
                pos: cs.position,
                size: `${Math.round(r.width)}x${Math.round(r.height)}`,
                text: (el.innerText || '').trim().slice(0, 40).replace(/\n/g, '|'),
                clickables
            });
        });

        return out.slice(0, 12);
    });
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
