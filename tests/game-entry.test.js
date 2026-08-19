/**
 * 专项测试：从首页进入游戏并试玩
 *
 * ═══════════════ 执行命令 ═══════════════
 *
 * 【单账号调试】<分类> <厂商>
 *   node src/index.js slots MINI
 *   node src/index.js slots pp elect
 *   node src/index.js slots MINI --games="FortuneFlow,ballonix"
 *   node src/index.js slots MINI --all          该厂商下全部游戏依次试玩
 *   node src/index.js                           不指定，走 pp/mini 随机+失败降级
 *
 * 【多账号并发】账号取自 data/1.txt
 *   node src/concurrent.js slots MINI --concurrency=2
 *   node src/concurrent.js slots MINI --concurrency=2 --limit=2    只跑前 2 个账号
 *   node src/concurrent.js slots MINI --concurrency=2 --headed     有头模式
 *
 * 【npm 脚本】
 *   npm run game:mini              等价 node src/index.js slots MINI
 *   npm run game:pp                等价 node src/index.js slots "pp elect"
 *   npm run game:mini:all          MINI 全部游戏
 *   npm run game:concurrent:mini   MINI 并发 2
 *   npm run game:shots             开启玩法节点截图（校准 canvas 坐标）
 *
 * 【环境变量】
 *   BRAND_NAME=brand-3003          换版面，默认 brand-3004
 *   GAME_LOAD_TIMEOUT=25000        单游戏等画面上限(ms)，默认 60000
 *   GAMEPLAY_SHOTS=reports/shots   玩法关键节点截图目录
 *   GAME_VENDORS=pp,mini           未指定 --vendor 时的候选厂商
 *
 * 厂商名含空格时加不加引号都可以（slots pp elect 会自动拼成 "pp elect"）。
 * 完整说明见 docs/游戏试玩执行命令.md
 *
 * ════════════════════════════════════════
 *
 * 流程：
 *   1. 登录（优先密码登录，失败回退验证码登录）
 *   2. 清除首页所有弹窗
 *   3. 进入游戏二级页面（.see-all / .all-link / 文本 All）
 *   4. 按 VENDOR_LIST 挑一个厂商试玩，失败自动降级到下一个
 *
 * ── 厂商选择规则（VENDOR_LIST）──
 *   ['pp']         只跑 pp elect
 *   ['mini']       只跑 MiniGame电子
 *   ['pp','mini']  在未阵亡的厂商里随机挑一个
 *
 * ── 失败降级 ──
 *   选中的厂商下所有游戏都跑不起来 → 标记该厂商不可用，当前账号立刻改跑下一个；
 *   该标记跨账号共享，后续账号直接跳过它；
 *   所有厂商都阵亡 → 后续账号跳过整个试玩环节。
 *
 * 玩法：未单独指定玩法的电子游戏统一走 slot-gameplay.js 的通用玩法。
 *       每个账号玩 3~5 轮后结束，换账号由并发 runner 负责。
 */

import { TestHooks } from '../src/utils/hooks.js';
import { enterGameSubPage } from '../scenarios/game/game-entry.js';
import { runVendorsWithFallback } from '../scenarios/game/vendor-runner.js';
import { printRegistryStatus, randomInt, buildTarget } from '../scenarios/game/vendor-registry.js';
import { readGameArgsFromEnv, describeGameArgs } from '../src/utils/game-args.js';

/**
 * 候选厂商列表
 * 可用环境变量覆盖：GAME_VENDORS=pp  /  GAME_VENDORS=mini  /  GAME_VENDORS=pp,mini
 */
const VENDOR_LIST = (process.env.GAME_VENDORS || 'pp,mini')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * 命令行指定的试玩目标（分类 / 厂商 / 游戏名）
 * 例：node src/concurrent.js Slots MINI --games="FortuneFlow,ballonix"
 * 未指定时回退到 VENDOR_LIST 预设的随机+降级逻辑
 */
const CLI_ARGS = readGameArgsFromEnv();
const EXPLICIT_TARGET = CLI_ARGS.hasTarget ? buildTarget(CLI_ARGS) : null;

/**
 * 单个游戏等待画面显示的上限，默认 1 分钟。
 * 调试时可缩短：GAME_LOAD_TIMEOUT=30000 node src/index.js
 */
const GAME_LOAD_TIMEOUT = parseInt(process.env.GAME_LOAD_TIMEOUT || String(1 * 60 * 1000), 10);

/** 每个账号本次试玩的轮数：3~5 随机 */
const ROUNDS = randomInt(3, 5);

/** 每轮旋转之间的等待 */
const ROUND_INTERVAL = 5000;

export default async function (test) {
    let auth;

    test.beforeEach(async () => {
        const hooks = new TestHooks(test);
        // standardSetup 内部完成：进首页 → 登录 → 清理登录后弹窗
        auth = await hooks.standardSetup();
    });

    test.test(`试玩游戏（候选 ${VENDOR_LIST.join('/')}，本轮 ${ROUNDS} 局）`, async () => {
        const page = test.page;
        // 并发时由 ConcurrentRunner 注入；串行调试时回退占位
        const accountId = test.account?.phone || 'single';

        await test.step('进入游戏二级页面', async () => {
            const entry = await enterGameSubPage(page, auth);
            console.log(`      命中策略: ${entry.strategy}`);
        });

        console.log(`      🎯 试玩目标: ${describeGameArgs(CLI_ARGS, EXPLICIT_TARGET)}`);

        const result = await runVendorsWithFallback(page, VENDOR_LIST, {
            loadTimeout: GAME_LOAD_TIMEOUT,
            playOptions: { rounds: ROUNDS, roundInterval: ROUND_INTERVAL },
            accountId,
            test,
            explicitTarget: EXPLICIT_TARGET
        });

        // ---- 汇总 ----
        console.log(`\n      ══════ 账号 ${accountId} 试玩汇总 ══════`);
        if (result.records.length === 0) {
            console.log(`         （无试玩记录）`);
        }
        result.records.forEach(r => {
            const icon = r.played ? '🎉' : (r.loaded ? '✅' : (r.entered ? '⏱️' : '❌'));
            const detail = r.played
                ? `玩了 ${r.roundsPlayed} 轮`
                : (r.loaded ? '画面已显示但未试玩' : (r.error ? r.error.split('\n')[0].slice(0, 50) : '超时未显示'));
            console.log(`         ${icon} [${r.vendor}] ${r.gameName || '(未知)'} — ${detail}`);
        });

        printRegistryStatus(VENDOR_LIST);

        // 所有厂商都已阵亡属于被测环境问题，跳过而非判失败，
        // 否则后续账号会因为环境不可用而全部报错，掩盖真正的链路问题
        if (result.skipped) {
            const why = result.reason === 'insufficient_balance'
                ? '账号余额不足，无法投注'
                : '候选厂商均不可用';
            console.log(`\n      ⏭️ 本账号跳过试玩（${why}）\n`);
            return;
        }

        const playedCount = result.records.filter(r => r.played).length;
        if (playedCount === 0) {
            throw new Error(
                `厂商 ${result.triedKeys.join('/')} 均未能成功试玩：` +
                result.records.map(r => `${r.gameName || '?'}(${r.error ? '异常' : '超时'})`).join(', ')
            );
        }

        console.log(`\n      🎉 成功试玩 ${playedCount} 个游戏（厂商: ${result.vendorKey}）\n`);
    });
}
