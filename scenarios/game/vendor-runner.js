/**
 * 厂商级试玩编排
 *
 * 职责：按候选 list 挑一个厂商试玩，失败则自动降级到下一个，
 *       并把「整个厂商都跑不起来」的结论写回注册表供后续账号复用。
 *
 * 流程：
 *   pickVendor(list)  →  选分类 → 选厂商 → 按 mode 试玩
 *        ↓ 该厂商全部游戏失败
 *   markVendorDead()  →  排除它，重新 pickVendor  →  再试
 *        ↓ 候选全部阵亡
 *   返回 skipped，后续账号直接跳过
 */

import { selectCategory, selectVendor, playGames, playGameByName } from './game-play.js';
import {
    VENDORS,
    pickVendor,
    markVendorDead,
    recordAttempt,
    allVendorsDead
} from './vendor-registry.js';

/**
 * 试玩单个厂商
 *
 * @param {import('playwright').Page} page
 * @param {object} target  VENDORS 中的一项
 * @param {object} options
 * @returns {Promise<{records:Array, anySuccess:boolean}>}
 */
async function runOneVendor(page, target, options = {}) {
    const { loadTimeout, playOptions = {}, test = null } = options;

    // 合并厂商特有玩法参数（如 pp 的随机加注）
    const mergedPlayOptions = { ...playOptions, ...(target.playOptions || {}) };

    const step = async (name, fn) => (test ? test.step(name, fn) : fn());

    await step(`选择分类 ${target.category}`, async () => {
        await selectCategory(page, target.category);
    });

    await step(`选择厂商 ${target.vendor}`, async () => {
        await selectVendor(page, target.vendor, { aliases: target.vendorAliases || [] });
    });

    let records = [];

    if (target.mode === 'byName') {
        // 支持指定多个游戏依次玩（如 MiniGame 的 FortuneFlow + ballonix）
        const names = target.gameNames?.length
            ? target.gameNames
            : (target.gameName ? [target.gameName] : []);

        if (names.length === 0) {
            throw new Error(`厂商「${target.vendor}」为精准模式但未指定游戏名`);
        }

        for (const name of names) {
            await step(`精准试玩 ${name}`, async () => {
                const record = await playGameByName(page, name, {
                    loadTimeout,
                    playOptions: mergedPlayOptions
                });
                records.push(record);
            });
        }
    } else {
        await step(`顺序试玩 ${target.vendor}`, async () => {
            records = await playGames(page, {
                loadTimeout,
                // 默认玩成功一个即可；厂商内每个游戏都有专属玩法时
                // 在 VENDORS 里显式设为 false，把整个厂商跑完
                stopOnFirstSuccess: target.stopOnFirstSuccess !== false,
                playOptions: mergedPlayOptions
            });
        });
    }

    const anySuccess = records.some(r => r.played);
    return { records, anySuccess };
}

/**
 * 按候选 list 试玩，失败自动降级
 *
 * @param {import('playwright').Page} page
 * @param {string[]} list  候选厂商 key，如 ['pp','mini']
 * @param {object} options
 * @param {number} options.loadTimeout  单游戏等待画面超时
 * @param {object} options.playOptions  通用玩法参数
 * @param {string} options.accountId    当前账号标识（用于日志与阵亡归因）
 * @param {object} options.test         TestCase 实例，传入则包裹 step
 * @returns {Promise<{skipped:boolean, vendorKey:string|null, records:Array, triedKeys:string[]}>}
 */
export async function runVendorsWithFallback(page, list, options = {}) {
    const {
        loadTimeout = 60000,
        playOptions = {},
        accountId = 'unknown',
        test = null,
        // 由命令行参数构建的目标；给了就直接用它，不走 list 随机与降级
        explicitTarget = null
    } = options;

    // ---- 参数指定了厂商：直接执行，不参与随机与降级 ----
    if (explicitTarget) {
        console.log(`\n      🎯 按参数指定的厂商执行: ${explicitTarget.category} / ${explicitTarget.vendor}`);

        const { records, anySuccess } = await runOneVendor(page, explicitTarget, {
            loadTimeout, playOptions, test
        });

        const tagged = records.map(r => ({
            ...r, vendorKey: explicitTarget.key, vendor: explicitTarget.vendor
        }));
        recordAttempt(explicitTarget.key, anySuccess);

        const allBroke = tagged.length > 0 && tagged.every(
            r => r.loaded && r.stoppedReason === 'insufficient_balance'
        );

        if (!anySuccess && allBroke) {
            console.log(`      💸 账号 ${accountId} 余额不足，跳过`);
            return {
                skipped: true, reason: 'insufficient_balance',
                vendorKey: explicitTarget.key, records: tagged, triedKeys: [explicitTarget.key]
            };
        }

        return {
            skipped: false, vendorKey: explicitTarget.key,
            records: tagged, triedKeys: [explicitTarget.key]
        };
    }

    // 开跑前先看整体状态：前面的账号可能已把所有厂商判死
    if (allVendorsDead(list)) {
        console.log(`\n      ⏭️ 候选厂商已全部标记为不可用，跳过试玩`);
        console.log(`         候选: ${list.join(', ')}`);
        return { skipped: true, vendorKey: null, records: [], triedKeys: [] };
    }

    const triedKeys = [];
    const allRecords = [];

    while (true) {
        const key = pickVendor(list, triedKeys);

        if (!key) {
            // 候选耗尽：要么本轮全试过了，要么剩下的都已阵亡
            console.log(`\n      ⏭️ 无可用厂商（本轮已试: ${triedKeys.join(', ') || '无'}）`);
            return { skipped: true, vendorKey: null, records: allRecords, triedKeys };
        }

        const target = VENDORS[key];
        triedKeys.push(key);

        console.log(`\n      🎲 本轮选中厂商: ${target.vendor}（候选 ${list.join('/')}，已试 ${triedKeys.length} 个）`);

        const { records, anySuccess } = await runOneVendor(page, target, {
            loadTimeout,
            playOptions,
            test
        });

        records.forEach(r => allRecords.push({ ...r, vendorKey: key, vendor: target.vendor }));
        recordAttempt(key, anySuccess);

        if (anySuccess) {
            console.log(`      ✅ 厂商「${target.vendor}」试玩成功`);
            return { skipped: false, vendorKey: key, records: allRecords, triedKeys };
        }

        // 区分两类失败：游戏进得去但账号没钱，说明厂商本身是好的。
        // 此时既不能标记厂商阵亡（会害后续账号跳过好厂商），
        // 换个厂商也没用（同一账号照样没钱），直接结束试玩。
        const allBroke = records.length > 0 && records.every(
            r => r.loaded && r.stoppedReason === 'insufficient_balance'
        );

        if (allBroke) {
            console.log(`      💸 账号 ${accountId} 余额不足，厂商「${target.vendor}」本身可用，不标记为阵亡`);
            return {
                skipped: true,
                reason: 'insufficient_balance',
                vendorKey: key,
                records: allRecords,
                triedKeys
            };
        }

        // 该厂商下所有游戏均失败 → 标记阵亡，后续账号不再尝试
        const reason = summarizeFailure(records);
        markVendorDead(key, reason, accountId);

        console.log(`      🔄 降级：尝试下一个厂商...`);
    }
}

/** 汇总失败原因，用于阵亡记录 */
function summarizeFailure(records) {
    if (records.length === 0) return '无游戏可试';

    const parts = records.map(r => {
        const why = r.error
            ? r.error.split('\n')[0].slice(0, 30)
            : (r.entered ? '超时未显示' : '未能进入');
        return `${r.gameName || '?'}(${why})`;
    });

    return `${records.length} 个游戏全部失败: ${parts.join(', ')}`;
}
