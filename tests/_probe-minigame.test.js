/**
 * 临时探查脚本（非正式用例，用完可删）
 *
 * 目的：确认 MiniGame 两个游戏的真实结构
 *   1. 游戏能否加载（之前一直卡 Loading）
 *   2. 用户余额显示在哪个元素 —— 投注额计算依赖它
 *   3. FortuneFlow 的 .bet-amount-input / Start 按钮
 *   4. ballonix 的加减注按钮如何区分（两者 class 完全相同）
 */

import { TestHooks } from '../src/utils/hooks.js';
import { enterGameSubPage } from '../scenarios/game/game-entry.js';
import { selectCategory, selectVendor, enterGameByName } from '../scenarios/game/game-play.js';

const TARGET_GAME = process.env.PROBE_GAME || 'FortuneFlow';

export default async function (test) {
    let auth;

    test.beforeEach(async () => {
        const hooks = new TestHooks(test);
        auth = await hooks.standardSetup();
    });

    test.test(`探查 MiniGame: ${TARGET_GAME}`, async () => {
        const page = test.page;

        await enterGameSubPage(page, auth);
        await selectCategory(page, 'Slots');
        await selectVendor(page, 'MiniGame电子');
        await enterGameByName(page, TARGET_GAME);

        console.log('\n════════ 探查开始 ════════');

        // 分段等待，观察加载过程
        for (let t = 1; t <= 12; t++) {
            await page.waitForTimeout(5000);

            const frames = page.frames().filter(f => f !== page.mainFrame());
            let summary = [];

            for (const frame of frames) {
                try {
                    const info = await frame.evaluate(() => ({
                        url: location.href.slice(0, 60),
                        bodyLen: document.body?.innerHTML?.length || 0,
                        canvas: document.querySelectorAll('canvas').length,
                        inputs: document.querySelectorAll('input').length,
                        buttons: document.querySelectorAll('button').length,
                        text: (document.body?.innerText || '').slice(0, 60).replace(/\n/g, '|')
                    }));
                    summary.push(info);
                } catch { }
            }

            console.log(`   [${t * 5}s] ${JSON.stringify(summary)}`);

            // 一旦出现 input 或 button，说明 DOM 游戏已渲染
            const ready = summary.some(s => s.inputs > 0 || s.buttons > 2);
            if (ready) {
                console.log(`   ✅ 检测到可交互 DOM，停止等待`);
                break;
            }
        }

        // ---------- 详细 dump ----------
        const frames = page.frames().filter(f => f !== page.mainFrame());

        for (const [idx, frame] of frames.entries()) {
            let detail;
            try {
                detail = await frame.evaluate(() => {
                    // 找所有可能显示余额的元素（含货币符号或纯数字）
                    const moneyEls = [];
                    document.querySelectorAll('*').forEach(el => {
                        if (el.children.length > 0) return;
                        const t = (el.textContent || '').trim();
                        if (!t || t.length > 25) return;
                        if (/[\d]/.test(t) && /[¥$₹€]|\d+\.\d{2}|balance|credit/i.test(t)) {
                            moneyEls.push({
                                tag: el.tagName.toLowerCase(),
                                cls: (el.className?.toString?.() || '').slice(0, 70),
                                text: t
                            });
                        }
                    });

                    // 所有 input
                    const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
                        cls: (el.className?.toString?.() || '').slice(0, 80),
                        type: el.type,
                        value: el.value,
                        min: el.min,
                        placeholder: el.placeholder
                    }));

                    // 所有 button
                    const buttons = Array.from(document.querySelectorAll('button')).map((el, i) => ({
                        i,
                        cls: (el.className?.toString?.() || '').slice(0, 70),
                        text: (el.textContent || '').trim().slice(0, 20),
                        // SVG path 用于区分同 class 的加/减按钮
                        svgPath: (el.querySelector('svg path:last-of-type')?.getAttribute('d') || '').slice(0, 45),
                        disabled: el.disabled
                    }));

                    return {
                        url: location.href.slice(0, 90),
                        bodyLen: document.body?.innerHTML?.length || 0,
                        moneyEls: moneyEls.slice(0, 15),
                        inputs,
                        buttons: buttons.slice(0, 20),
                        bodyText: (document.body?.innerText || '').slice(0, 300).replace(/\n/g, ' | ')
                    };
                });
            } catch (e) {
                detail = { err: e.message.slice(0, 60) };
            }

            console.log(`\n【Frame ${idx}】`);
            console.log(JSON.stringify(detail, null, 2));
        }

        console.log('\n════════ 探查结束 ════════\n');
    });
}
