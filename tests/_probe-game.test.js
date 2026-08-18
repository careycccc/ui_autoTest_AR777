/**
 * 临时探查脚本（非正式用例，用完可删）
 *
 * 本轮目的：
 *   1. 进入游戏后，iframe 内部到底长什么样 → 确定「游戏已显示」的判定标准
 *   2. 游戏页左上角返回按钮的 DOM 结构
 */

import { TestHooks } from '../src/utils/hooks.js';
import { enterGameSubPage } from '../scenarios/game/game-entry.js';
import { selectCategory, selectVendor, enterGame } from '../scenarios/game/game-play.js';

export default async function (test) {
    let auth;

    test.beforeEach(async () => {
        const hooks = new TestHooks(test);
        auth = await hooks.standardSetup();
    });

    test.test('探查游戏 iframe 加载过程与返回按钮', async () => {
        const page = test.page;

        await enterGameSubPage(page, auth);
        await selectCategory(page, 'Slots');
        await selectVendor(page, 'MiniGame电子');

        console.log('\n════════ 探查开始 ════════');

        // ---------- 进入游戏前：先看看游戏页的返回按钮 ----------
        const backBeforeEnter = await page.evaluate(() => {
            const candidates = [];
            document.querySelectorAll('[class*="back"], [class*="Back"], .van-nav-bar__left, .nav-left, header i, header svg').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.y < 120) {
                    candidates.push({
                        tag: el.tagName.toLowerCase(),
                        cls: el.className?.toString?.().slice(0, 60),
                        x: Math.round(r.x), y: Math.round(r.y),
                        html: el.outerHTML.slice(0, 120)
                    });
                }
            });
            return candidates;
        });
        console.log('\n【A】二级页面左上角候选返回按钮:');
        console.log(JSON.stringify(backBeforeEnter, null, 2));

        // ---------- 进入游戏 ----------
        const result = await enterGame(page, { index: 0 });
        console.log(`\n已进入游戏: ${result.gameName}`);

        // ---------- 分段观察 iframe 加载过程 ----------
        console.log('\n【B】iframe 加载过程采样（每 5 秒一次，共 60 秒）:');
        for (let i = 1; i <= 12; i++) {
            await page.waitForTimeout(5000);

            const snap = await page.evaluate(() => {
                const f = document.querySelector('iframe');
                return {
                    iframeExists: !!f,
                    iframeSrcLen: f?.src?.length || 0,
                    outerBodyText: document.body.innerText.slice(0, 80).replace(/\n/g, '|')
                };
            });

            // 通过 Playwright 的 frame API 访问跨域 iframe 内部
            let inner = { accessible: false };
            try {
                const frames = page.frames();
                const gameFrame = frames.find(fr => fr !== page.mainFrame());
                if (gameFrame) {
                    inner = await gameFrame.evaluate(() => ({
                        accessible: true,
                        url: location.href.slice(0, 80),
                        readyState: document.readyState,
                        bodyHTMLLen: document.body?.innerHTML?.length || 0,
                        canvasCount: document.querySelectorAll('canvas').length,
                        canvasSizes: Array.from(document.querySelectorAll('canvas')).map(c => `${c.width}x${c.height}`),
                        imgCount: document.querySelectorAll('img').length,
                        divCount: document.querySelectorAll('div').length,
                        bodyText: (document.body?.innerText || '').slice(0, 100).replace(/\n/g, '|'),
                        visibleEls: Array.from(document.querySelectorAll('*')).filter(e => {
                            const r = e.getBoundingClientRect();
                            return r.width > 50 && r.height > 50;
                        }).length
                    })).catch(e => ({ accessible: false, err: e.message.slice(0, 60) }));
                }
            } catch (e) {
                inner = { accessible: false, err: e.message.slice(0, 60) };
            }

            console.log(`   [${i * 5}s] 外层: ${JSON.stringify(snap)}`);
            console.log(`         内层: ${JSON.stringify(inner)}`);
        }

        // ---------- 游戏页的返回按钮 ----------
        const backInGame = await page.evaluate(() => {
            const candidates = [];
            document.querySelectorAll('*').forEach(el => {
                if (el.tagName === 'IFRAME') return;
                const r = el.getBoundingClientRect();
                // 左上角区域、有尺寸、层级浅
                if (r.width > 0 && r.width < 100 && r.y < 120 && r.x < 120) {
                    const cls = el.className?.toString?.() || '';
                    if (/back|arrow|nav|close|left/i.test(cls) || el.tagName === 'svg' || el.tagName === 'I') {
                        candidates.push({
                            tag: el.tagName.toLowerCase(),
                            cls: cls.slice(0, 60),
                            x: Math.round(r.x), y: Math.round(r.y),
                            w: Math.round(r.width), h: Math.round(r.height),
                            html: el.outerHTML.slice(0, 150)
                        });
                    }
                }
            });
            return candidates.slice(0, 15);
        });
        console.log('\n【C】游戏页左上角候选返回按钮:');
        console.log(JSON.stringify(backInGame, null, 2));

        console.log('\n【D】当前 URL:', page.url());
        console.log('\n════════ 探查结束 ════════\n');
    });
}
