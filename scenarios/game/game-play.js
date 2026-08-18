/**
 * 游戏二级页面 - 分类/厂商选择与进入游戏
 *
 * 页面结构（实测 iPhone 14 视口 390x844）：
 *
 *   .category-tabs                    横向滚动容器 (scrollW 736 > clientW 359)
 *     └ .category-tab                 分类项：Hot / Popular / hot / video / Slots / card / fishing
 *         └ span                      分类文本
 *
 *   .category-panel > .game-menu > .category-list    纵向滚动容器 (scrollH 921 > clientH 657)
 *     └ .category-item                厂商项
 *         └ .name                     厂商文本：ARBET / NG / ... / MiniGame电子
 *
 *   .game-grid
 *     └ .game-card                    游戏卡片
 *         └ .game-image > img[alt]    游戏名在 img 的 alt 上
 *
 * 注意：左侧厂商列表随顶部分类变化。默认 hot 分类下只有 1 个厂商（Hot），
 *       切到 Slots 后才会出现 13 个厂商，MiniGame电子 是最后一个（视口外）。
 *
 * 进入游戏的表现：同页跳转到 /game/iframe?url=<base64>&vendorCode=X&gameCode=Y
 *                并渲染 1 个指向厂商域名的 iframe，不开新窗口。
 */

/**
 * 选择顶部分类（横向滚动容器）
 *
 * @param {import('playwright').Page} page
 * @param {string} categoryName  分类名，如 'Slots'
 * @param {object} options
 * @param {boolean} options.exact  是否精确匹配文本，默认 true
 *                                 （必须精确：分类里同时存在 'Hot' 和 'hot'）
 */
export async function selectCategory(page, categoryName, options = {}) {
    const { exact = true, waitAfter = 3000 } = options;

    console.log(`      🔍 选择分类: ${categoryName}`);

    const matcher = exact
        ? new RegExp(`^${escapeRegExp(categoryName)}$`)
        : new RegExp(escapeRegExp(categoryName), 'i');

    const tab = page.locator('.category-tabs .category-tab', { hasText: matcher }).first();

    if (await tab.count() === 0) {
        const available = await listCategories(page);
        throw new Error(`未找到分类「${categoryName}」，当前可选: ${available.join(' / ')}`);
    }

    // 分类可能在横向滚动区之外，先滚进视口
    await tab.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const visible = await tab.isVisible().catch(() => false);
    if (!visible) {
        throw new Error(`分类「${categoryName}」滚动后仍不可见`);
    }

    const urlBefore = page.url();
    await tab.click();
    await page.waitForTimeout(waitAfter);

    console.log(`      ✅ 已选择分类: ${categoryName}`);
    console.log(`         ${urlBefore}`);
    console.log(`      →  ${page.url()}`);

    return { success: true, urlBefore, urlAfter: page.url() };
}

/**
 * 选择左侧厂商（纵向滚动容器）
 *
 * @param {import('playwright').Page} page
 * @param {string} vendorName  厂商名，如 'MiniGame电子'
 */
export async function selectVendor(page, vendorName, options = {}) {
    const { waitAfter = 3000 } = options;

    console.log(`      🔍 选择厂商: ${vendorName}`);

    // 点击 .category-item（.name 的父级），点击区域更大更可靠
    const item = page
        .locator('.category-list .category-item')
        .filter({ has: page.locator('.name', { hasText: new RegExp(`^${escapeRegExp(vendorName)}$`) }) })
        .first();

    if (await item.count() === 0) {
        const available = await listVendors(page);
        throw new Error(`未找到厂商「${vendorName}」，当前可选: ${available.join(' / ')}`);
    }

    // 厂商列表较长，目标项通常在视口下方，需要纵向滚动
    await item.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const visible = await item.isVisible().catch(() => false);
    if (!visible) {
        throw new Error(`厂商「${vendorName}」滚动后仍不可见`);
    }

    const urlBefore = page.url();
    await item.click();
    await page.waitForTimeout(waitAfter);

    console.log(`      ✅ 已选择厂商: ${vendorName}`);
    console.log(`         ${urlBefore}`);
    console.log(`      →  ${page.url()}`);

    return { success: true, urlBefore, urlAfter: page.url() };
}

/**
 * 点击游戏网格中的第 N 个游戏并验证是否成功进入
 *
 * 判定标准（两者都满足才算进入）：
 *   1. URL 跳转到 /game/iframe
 *   2. 页面出现指向厂商域名的 iframe
 *
 * @param {import('playwright').Page} page
 * @param {object} options
 * @param {number} options.index        第几个游戏，默认 0（第一个）
 * @param {number} options.routeTimeout 等待路由跳转的超时(ms)
 * @param {number} options.frameTimeout 等待 iframe 出现的超时(ms)
 */
export async function enterGame(page, options = {}) {
    const { index = 0, routeTimeout = 10000, frameTimeout = 15000 } = options;

    const cards = page.locator('.game-grid .game-card');
    const count = await cards.count();

    if (count === 0) {
        throw new Error('当前厂商下没有游戏卡片(.game-grid .game-card)');
    }
    if (index >= count) {
        throw new Error(`游戏索引越界: 请求第 ${index + 1} 个，实际只有 ${count} 个`);
    }

    const card = cards.nth(index);
    const gameName = await card.locator('img').getAttribute('alt').catch(() => null);

    console.log(`      🎮 共 ${count} 个游戏，点击第 ${index + 1} 个: ${gameName || '(无名称)'}`);

    const urlBefore = page.url();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    // ① 等待路由跳转到 /game/iframe
    let routeOk = false;
    try {
        await page.waitForURL(u => u.href.includes('/game/iframe'), { timeout: routeTimeout });
        routeOk = true;
    } catch {
        routeOk = false;
    }

    if (!routeOk) {
        throw new Error(
            `点击游戏「${gameName}」后 ${routeTimeout}ms 内未跳转到 /game/iframe（当前 ${page.url()}）`
        );
    }
    console.log(`      ✅ 已跳转游戏页: ${page.url().slice(0, 100)}...`);

    // ② 等待游戏 iframe 出现且 src 有效
    let frameSrc = null;
    try {
        await page.waitForFunction(
            () => {
                const f = document.querySelector('iframe');
                return !!(f && f.src && f.src.length > 10);
            },
            null,
            { timeout: frameTimeout }
        );
        frameSrc = await page.evaluate(() => document.querySelector('iframe')?.src || null);
    } catch {
        frameSrc = null;
    }

    if (!frameSrc) {
        throw new Error(`游戏「${gameName}」页面在 ${frameTimeout}ms 内未渲染出有效 iframe`);
    }

    console.log(`      ✅ 游戏 iframe 已加载`);
    console.log(`         ${frameSrc.slice(0, 120)}...`);

    // 解析 vendorCode / gameCode，便于报告定位
    const url = new URL(page.url());
    const vendorCode = url.searchParams.get('vendorCode');
    const gameCode = url.searchParams.get('gameCode');

    return {
        success: true,
        gameName,
        totalGames: count,
        vendorCode,
        gameCode,
        frameSrc,
        urlBefore,
        urlAfter: page.url()
    };
}

/**
 * 按游戏名精准进入指定游戏
 *
 * 游戏名取自卡片图片的 alt 属性，例如 alt="3 Genie Wishes"。
 *
 * @param {import('playwright').Page} page
 * @param {string} gameName 游戏名，需与 img[alt] 完全一致
 * @param {object} options
 * @param {number} options.routeTimeout 等待路由跳转的超时(ms)
 * @param {number} options.frameTimeout 等待 iframe 出现的超时(ms)
 */
export async function enterGameByName(page, gameName, options = {}) {
    const { routeTimeout = 10000, frameTimeout = 15000 } = options;

    const cards = page.locator('.game-grid .game-card');
    const total = await cards.count();
    if (total === 0) {
        throw new Error('当前厂商下没有游戏卡片(.game-grid .game-card)');
    }

    const card = cards.filter({ has: page.locator(`img[alt="${gameName}"]`) }).first();

    if (await card.count() === 0) {
        const available = await listGames(page);
        throw new Error(
            `未找到游戏「${gameName}」，当前厂商下 ${total} 个游戏: ${available.join(' / ')}`
        );
    }

    console.log(`      🎮 精准进入游戏: ${gameName}（共 ${total} 个游戏）`);

    await card.scrollIntoViewIfNeeded();
    await card.click();

    return await waitForGamePage(page, gameName, { routeTimeout, frameTimeout, totalGames: total });
}

/** 列出当前厂商下所有游戏名（用于错误提示） */
export async function listGames(page) {
    return await page.$$eval('.game-grid .game-card img', els =>
        els.map(e => e.alt).filter(Boolean)
    ).catch(() => []);
}

/**
 * 等待游戏页跳转与 iframe 就绪（enterGame / enterGameByName 共用）
 */
async function waitForGamePage(page, gameName, options) {
    const { routeTimeout, frameTimeout, totalGames } = options;

    let routeOk = false;
    try {
        await page.waitForURL(u => u.href.includes('/game/iframe'), { timeout: routeTimeout });
        routeOk = true;
    } catch {
        routeOk = false;
    }

    if (!routeOk) {
        throw new Error(
            `点击游戏「${gameName}」后 ${routeTimeout}ms 内未跳转到 /game/iframe（当前 ${page.url()}）`
        );
    }
    console.log(`      ✅ 已跳转游戏页: ${page.url().slice(0, 100)}...`);

    let frameSrc = null;
    try {
        await page.waitForFunction(
            () => {
                const f = document.querySelector('iframe');
                return !!(f && f.src && f.src.length > 10);
            },
            null,
            { timeout: frameTimeout }
        );
        frameSrc = await page.evaluate(() => document.querySelector('iframe')?.src || null);
    } catch {
        frameSrc = null;
    }

    if (!frameSrc) {
        throw new Error(`游戏「${gameName}」页面在 ${frameTimeout}ms 内未渲染出有效 iframe`);
    }

    console.log(`      ✅ 游戏 iframe 已加载`);
    console.log(`         ${frameSrc.slice(0, 120)}...`);

    const url = new URL(page.url());
    return {
        success: true,
        gameName,
        totalGames,
        vendorCode: url.searchParams.get('vendorCode'),
        gameCode: url.searchParams.get('gameCode'),
        frameSrc,
        urlAfter: page.url()
    };
}

/**
 * 等待游戏画面真正显示出来
 *
 * 为什么不能只判断 iframe 存在或 readyState：
 *   实测 FortuneFlow 加载失败时，iframe 存在、readyState 已是 complete、
 *   src 也有效，但内部始终停在 "Loading...79%"，canvas 从未创建，
 *   bodyHTMLLen 固定 1867 一直不变（后端报 req err: 20000: 50001）。
 *   因此必须探测 iframe 内部的真实渲染状态。
 *
 * 判定「已显示」（任一满足）：
 *   1. 出现 canvas 且尺寸有效  —— 绝大多数游戏用 canvas 渲染
 *   2. 无 Loading 文本 且 DOM 体量明显增长（内容真的渲染出来了）
 *
 * @param {import('playwright').Page} page
 * @param {object} options
 * @param {number} options.timeout   最长等待(ms)，默认 180000（3 分钟）
 * @param {number} options.interval  轮询间隔(ms)，默认 3000
 * @param {number} options.minHTMLLen 判定内容已渲染的 DOM 长度阈值
 */
export async function waitForGameLoaded(page, options = {}) {
    const {
        timeout = 180000,
        interval = 3000,
        minHTMLLen = 3000
    } = options;

    const startedAt = Date.now();
    const deadline = startedAt + timeout;
    let lastSnapshot = null;
    let lastLogAt = 0;

    console.log(`      ⏳ 等待游戏画面显示（最长 ${Math.round(timeout / 1000)}s）...`);

    while (Date.now() < deadline) {
        const snap = await inspectGameFrame(page);
        lastSnapshot = snap;

        if (snap.accessible) {
            const hasCanvas = snap.canvasCount > 0 && snap.canvasSizes.some(s => {
                const [w, h] = s.split('x').map(Number);
                return w > 0 && h > 0;
            });
            const noLoading = !/loading/i.test(snap.bodyText || '');
            const contentRendered = noLoading && snap.bodyHTMLLen >= minHTMLLen;

            if (hasCanvas || contentRendered) {
                const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
                console.log(`      ✅ 游戏画面已显示（${elapsed}s）`);
                console.log(`         信号: ${hasCanvas ? `canvas ${snap.canvasSizes.join(',')}` : `DOM ${snap.bodyHTMLLen} 字符`}`);
                return { loaded: true, elapsed: Date.now() - startedAt, snapshot: snap };
            }
        }

        // 每 30 秒打印一次进度，避免长时间静默
        const elapsed = Date.now() - startedAt;
        if (elapsed - lastLogAt >= 30000) {
            lastLogAt = elapsed;
            console.log(
                `         [${Math.round(elapsed / 1000)}s] 仍未显示 — ` +
                `canvas:${snap.canvasCount} DOM:${snap.bodyHTMLLen} 文本:"${(snap.bodyText || '').slice(0, 30)}"`
            );
        }

        await page.waitForTimeout(interval);
    }

    console.log(`      ⏱️ 等待 ${Math.round(timeout / 1000)}s 超时，游戏画面未显示`);
    if (lastSnapshot) {
        console.log(`         最终状态: canvas:${lastSnapshot.canvasCount} DOM:${lastSnapshot.bodyHTMLLen} 文本:"${(lastSnapshot.bodyText || '').slice(0, 40)}"`);
    }

    return { loaded: false, elapsed: Date.now() - startedAt, snapshot: lastSnapshot };
}

/**
 * 探测游戏 iframe 内部状态
 * Playwright 的 frame API 不受同源策略限制，可直接读跨域 iframe
 */
async function inspectGameFrame(page) {
    const empty = { accessible: false, canvasCount: 0, bodyHTMLLen: 0, canvasSizes: [], bodyText: '' };

    // 游戏页可能是嵌套 iframe（外层容器 + 内层游戏），canvas 在内层。
    // 因此遍历所有 frame 并合并信号，而不是只看第一个。
    const frames = page.frames().filter(f => f !== page.mainFrame());
    if (frames.length === 0) return empty;

    const merged = { ...empty, canvasSizes: [] };

    for (const frame of frames) {
        try {
            const info = await frame.evaluate(() => ({
                readyState: document.readyState,
                bodyHTMLLen: document.body?.innerHTML?.length || 0,
                canvasCount: document.querySelectorAll('canvas').length,
                canvasSizes: Array.from(document.querySelectorAll('canvas')).map(c => `${c.width}x${c.height}`),
                bodyText: (document.body?.innerText || '').slice(0, 120).replace(/\n/g, '|')
            }));

            merged.accessible = true;
            merged.canvasCount += info.canvasCount;
            merged.canvasSizes.push(...info.canvasSizes);
            // 取内容最多的那层作为 DOM 体量代表
            if (info.bodyHTMLLen > merged.bodyHTMLLen) {
                merged.bodyHTMLLen = info.bodyHTMLLen;
                merged.readyState = info.readyState;
            }
            // Loading 文本出现在任一层都说明仍在加载
            if (info.bodyText) {
                merged.bodyText = merged.bodyText
                    ? `${merged.bodyText} ${info.bodyText}`
                    : info.bodyText;
            }
        } catch {
            // frame 在跳转瞬间可能被销毁，跳过该层
            continue;
        }
    }

    return merged;
}

/**
 * 关闭平台的 OK 确认弹窗
 *
 * 结构：<div class="confirmBtn btn_main_style text_shadow">OK</div>
 * 带 Vue scoped 属性，属于平台外层组件而非第三方游戏 iframe，
 * 但为保险仍会遍历所有 frame 查找。
 *
 * 该弹窗会遮挡后续点击，因此在进入游戏、每轮操作前、返回前都要清一次。
 *
 * @returns {Promise<boolean>} 是否真的关闭了弹窗
 */
export async function dismissConfirmPopup(page, options = {}) {
    const { timeout = 1200, silent = true } = options;

    const contexts = [page, ...page.frames().filter(f => f !== page.mainFrame())];

    for (const ctx of contexts) {
        try {
            const btn = ctx.locator('.confirmBtn').first();
            if (await btn.count() === 0) continue;

            const visible = await btn.isVisible({ timeout }).catch(() => false);
            if (!visible) continue;

            const text = (await btn.textContent().catch(() => '') || '').trim();
            await btn.click({ timeout: 3000 });
            console.log(`      ✖️ 已关闭确认弹窗（按钮: "${text}"）`);
            await page.waitForTimeout(800);
            return true;
        } catch (e) {
            if (!silent) {
                console.log(`      ⚠️ 关闭弹窗异常: ${e.message.split('\n')[0]}`);
            }
        }
    }

    return false;
}

/**
 * 从游戏页返回上一级
 *
 * 策略（依次降级）：
 *   1. 点左上角返回按钮 .ar_icon.back
 *   2. 点左上角区域的 svg（部分页面返回图标无 back class）
 *   3. 路由返回 page.goBack()
 *
 * 判定成功：URL 不再包含 /game/iframe
 */
export async function goBackFromGame(page, options = {}) {
    const { timeout = 8000 } = options;

    const isBack = () => !page.url().includes('/game/iframe');

    if (isBack()) return { success: true, method: '无需返回' };

    // 确认弹窗会遮挡返回按钮，先清掉
    await dismissConfirmPopup(page);

    const strategies = [
        {
            name: '返回按钮 .ar_icon.back',
            run: async () => {
                const btn = page.locator('.ar_icon.back').first();
                if (await btn.count() === 0) return false;
                if (!await btn.isVisible().catch(() => false)) return false;
                await btn.click({ timeout: 3000 });
                return true;
            }
        },
        {
            name: '左上角 svg 图标',
            run: async () => {
                // 游戏页返回图标是裸 svg（x≈16, y≈16, 25x25），点其可点击祖先
                const svg = page.locator('svg').first();
                if (await svg.count() === 0) return false;
                const box = await svg.boundingBox().catch(() => null);
                if (!box || box.x > 120 || box.y > 120) return false;
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                return true;
            }
        },
        {
            name: '路由返回 goBack()',
            run: async () => {
                await page.goBack({ waitUntil: 'load', timeout }).catch(() => { });
                return true;
            }
        }
    ];

    for (const strategy of strategies) {
        try {
            const attempted = await strategy.run();
            if (!attempted) {
                console.log(`      ✗ 返回策略「${strategy.name}」不适用`);
                continue;
            }

            // 等待路由离开游戏页
            await page.waitForFunction(
                () => !location.href.includes('/game/iframe'),
                null,
                { timeout: 5000 }
            ).catch(() => { });

            if (isBack()) {
                console.log(`      ↩️ 已返回（策略: ${strategy.name}）`);
                await page.waitForTimeout(1500);
                return { success: true, method: strategy.name, url: page.url() };
            }

            console.log(`      ✗ 返回策略「${strategy.name}」执行后仍在游戏页`);
        } catch (e) {
            console.log(`      ✗ 返回策略「${strategy.name}」异常: ${e.message.split('\n')[0]}`);
        }
    }

    return { success: false, method: null, url: page.url() };
}

/**
 * 依次试玩当前厂商下的游戏
 *
 * 单个游戏流程：进入 → 等待画面显示(最长 3 分钟) → 执行游戏内操作 → 返回列表
 * 未在超时内显示的游戏直接跳过，继续下一个。
 *
 * @param {import('playwright').Page} page
 * @param {object} options
 * @param {number}   options.maxGames     最多试玩几个，0 表示全部，默认 0
 * @param {number}   options.startIndex   从第几个开始，默认 0
 * @param {number}   options.loadTimeout  单个游戏等待画面的超时(ms)，默认 180000
 * @param {boolean}  options.stopOnFirstSuccess  成功进入一个就停止，默认 false
 * @param {Function} options.onGameLoaded 游戏画面显示后的回调 (page, gameInfo) => Promise
 *                                        —— 各游戏的具体玩法逻辑挂在这里
 * @returns {Promise<Array>} 每个游戏的结果
 */
export async function playGames(page, options = {}) {
    const {
        maxGames = 0,
        startIndex = 0,
        loadTimeout = 180000,
        stopOnFirstSuccess = false,
        onGameLoaded = null,
        playOptions = {}
    } = options;

    const total = await page.locator('.game-grid .game-card').count();
    if (total === 0) {
        throw new Error('当前厂商下没有游戏卡片(.game-grid .game-card)');
    }

    const end = maxGames > 0 ? Math.min(startIndex + maxGames, total) : total;
    console.log(`\n      🎯 计划试玩: 第 ${startIndex + 1} ~ ${end} 个（共 ${total} 个游戏）`);

    const results = [];

    for (let i = startIndex; i < end; i++) {
        console.log(`\n      ──────── 游戏 ${i + 1}/${total} ────────`);

        const record = { index: i, gameName: null, entered: false, loaded: false, returned: false, error: null };

        try {
            // 返回列表后 DOM 会重建，每轮都重新定位卡片
            const entry = await enterGame(page, { index: i });
            record.gameName = entry.gameName;
            record.vendorCode = entry.vendorCode;
            record.gameCode = entry.gameCode;
            record.entered = true;

            // 等待游戏画面真正显示
            const loadResult = await waitForGameLoaded(page, { timeout: loadTimeout });
            record.loaded = loadResult.loaded;
            record.loadElapsed = loadResult.elapsed;

            if (loadResult.loaded) {
                // 游戏加载完可能弹出确认框，会挡住后续所有点击
                await dismissConfirmPopup(page);

                // 未指定玩法时，使用通用电子游戏玩法
                const play = onGameLoaded || defaultSlotGameplay;
                const playResult = await play(page, entry, playOptions);
                // 以玩法函数的真实结果为准：一轮没玩成不能算 played，
                // 否则余额耗尽也会被记成成功
                record.played = playResult?.success === true;
                record.roundsPlayed = playResult?.roundsPlayed ?? 0;
                record.stoppedReason = playResult?.stoppedReason ?? null;
            } else {
                console.log(`      ⏭️ 「${entry.gameName}」未显示，跳过并试下一个`);
            }
        } catch (e) {
            record.error = e.message;
            console.log(`      ❌ 游戏 ${i + 1} 处理失败: ${e.message.split('\n')[0]}`);
        }

        // 无论成败都要退回列表，否则后续游戏无从点起
        const backResult = await goBackFromGame(page);
        record.returned = backResult.success;

        if (!backResult.success) {
            console.log(`      ⚠️ 返回失败，终止后续游戏（当前 ${page.url()}）`);
            results.push(record);
            break;
        }

        results.push(record);

        if (stopOnFirstSuccess && record.loaded) {
            console.log(`      ✅ 已成功试玩一个游戏，按配置停止`);
            break;
        }
    }

    // 汇总
    const okCount = results.filter(r => r.loaded).length;
    console.log(`\n      📊 试玩汇总: ${okCount}/${results.length} 个游戏成功显示`);
    results.forEach(r => {
        const icon = r.loaded ? '✅' : (r.entered ? '⏱️' : '❌');
        const detail = r.loaded
            ? `${(r.loadElapsed / 1000).toFixed(1)}s`
            : (r.error ? r.error.split('\n')[0].slice(0, 40) : '超时未显示');
        console.log(`         ${icon} [${r.index + 1}] ${r.gameName || '(未知)'} — ${detail}`);
    });

    return results;
}

/**
 * 【精准模式】进入指定名称的游戏并试玩
 *
 * 与 playGames（顺序模式）的区别：
 *   playGames      —— 不指定游戏，按顺序一个个试，进不去就换下一个
 *   playGameByName —— 指定游戏名精准进入，进不去直接报错（因为是明确的目标）
 *
 * @param {import('playwright').Page} page
 * @param {string} gameName 游戏名（img 的 alt）
 * @param {object} options
 * @param {number}   options.loadTimeout  等待画面显示的超时(ms)
 * @param {Function} options.onGameLoaded 画面显示后的玩法回调，默认走通用电子玩法
 * @param {object}   options.playOptions  传给玩法函数的参数（轮数、间隔等）
 */
export async function playGameByName(page, gameName, options = {}) {
    const {
        loadTimeout = 180000,
        onGameLoaded = null,
        playOptions = {}
    } = options;

    console.log(`\n      ──────── 精准试玩: ${gameName} ────────`);

    const record = {
        mode: 'byName',
        gameName,
        entered: false,
        loaded: false,
        played: false,
        returned: false,
        error: null
    };

    try {
        const entry = await enterGameByName(page, gameName);
        record.entered = true;
        record.vendorCode = entry.vendorCode;
        record.gameCode = entry.gameCode;

        const loadResult = await waitForGameLoaded(page, { timeout: loadTimeout });
        record.loaded = loadResult.loaded;
        record.loadElapsed = loadResult.elapsed;

        if (loadResult.loaded) {
            // 游戏加载完可能弹出确认框，会挡住后续所有点击
            await dismissConfirmPopup(page);

            // 未指定玩法时，使用通用电子游戏玩法
            const play = onGameLoaded || defaultSlotGameplay;
            const playResult = await play(page, entry, playOptions);
            // 以玩法函数的真实结果为准，见 playGames 中同样的处理
            record.played = playResult?.success === true;
            record.roundsPlayed = playResult?.roundsPlayed ?? 0;
            record.stoppedReason = playResult?.stoppedReason ?? null;
        } else {
            console.log(`      ⏭️ 「${gameName}」画面未显示`);
        }
    } catch (e) {
        record.error = e.message;
        console.log(`      ❌ ${e.message.split('\n')[0]}`);
    }

    const backResult = await goBackFromGame(page);
    record.returned = backResult.success;

    return record;
}

/**
 * 按游戏名分派专属玩法
 *
 * 未登记的游戏一律走通用电子玩法（canvas 坐标点击）；
 * 这里登记的是结构特殊、需要专门处理的游戏。
 */
const GAMEPLAY_BY_NAME = {
    // MiniGame 两款是 DOM 游戏，有真实 input/button，可读余额动态算投注额
    'FortuneFlow': async (page, opts) => {
        const { playFortuneFlow } = await import('./minigame-gameplay.js');
        return await playFortuneFlow(page, opts);
    },
    'ballonix': async (page, opts) => {
        const { playBallonix } = await import('./minigame-gameplay.js');
        return await playBallonix(page, opts);
    }
};

/**
 * 默认玩法调度：优先用游戏专属玩法，否则走通用电子玩法
 * 动态导入以避免模块循环依赖
 */
async function defaultSlotGameplay(page, gameInfo, playOptions = {}) {
    const special = GAMEPLAY_BY_NAME[gameInfo.gameName];

    if (special) {
        console.log(`      🕹️ 使用「${gameInfo.gameName}」专属玩法`);
        return await special(page, playOptions);
    }

    const { playSlotGame } = await import('./slot-gameplay.js');
    console.log(`      🕹️ 使用通用电子游戏玩法: ${gameInfo.gameName}`);
    return await playSlotGame(page, playOptions);
}

/** 列出当前所有顶部分类名（用于错误提示） */
export async function listCategories(page) {
    return await page.$$eval('.category-tabs .category-tab', els =>
        els.map(e => e.textContent.trim()).filter(Boolean)
    ).catch(() => []);
}

/** 列出当前所有左侧厂商名（用于错误提示） */
export async function listVendors(page) {
    return await page.$$eval('.category-list .name', els =>
        els.map(e => e.textContent.trim()).filter(Boolean)
    ).catch(() => []);
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
