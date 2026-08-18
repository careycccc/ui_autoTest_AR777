/**
 * 游戏厂商注册表 + 跨账号失败记忆
 *
 * ── 解决什么问题 ──
 * 并发跑多个账号时，如果某个厂商下的游戏全都进不去（如 MiniGame电子
 * 长期卡在 Loading），不该让每个账号都去撞一遍南墙 —— 第一个账号
 * 发现该厂商全军覆没后，后续账号应直接跳过它，改跑别的厂商。
 *
 * ── 为什么模块级单例可行 ──
 * ConcurrentRunner 在同一个 Node 进程内为每个账号创建独立
 * BrowserContext，但模块只会被 ESM 加载一次，因此这里的状态
 * 天然被所有账号共享，无需额外的 IPC 或文件锁。
 *
 * ── 选择策略 ──
 *   list 只有一个       → 只跑它
 *   list 有多个         → 在「未阵亡」的里面随机挑一个
 *   挑中的跑完全失败    → 标记阵亡，当前账号立刻改跑下一个
 *   全部阵亡            → 后续账号直接跳过试玩环节
 */

/** 厂商定义表：key 是 list 里使用的短名 */
export const VENDORS = {
    pp: {
        key: 'pp',
        category: 'Slots',
        vendor: 'pp elect',
        mode: 'byName',                 // 精准模式：直接进指定游戏
        gameName: '3 Genie Wishes',
        // 该厂商特有的玩法参数：进游戏后随机加注 3~6 次
        playOptions: { adjustBet: true, betClicks: [3, 6] }
    },
    mini: {
        key: 'mini',
        category: 'Slots',
        vendor: 'MiniGame电子',
        mode: 'inOrder',                // 顺序模式：一个个试下去
        // 该厂商下每个游戏都有各自玩法（FortuneFlow / ballonix），
        // 成功一个后仍要继续玩下一个，因此不提前收工
        stopOnFirstSuccess: false,
        playOptions: {}
    }
};

// ============================================================
// 跨账号共享状态
// ============================================================

/** 已确认「该厂商下所有游戏都跑不起来」的厂商 key */
const deadVendors = new Map();   // key -> { reason, markedBy, at }

/** 每个厂商的累计尝试统计 */
const vendorStats = new Map();   // key -> { attempts, successes, failures }

/**
 * 标记厂商阵亡（该厂商下所有游戏均失败）
 * @param {string} key      厂商短名
 * @param {string} reason   失败原因摘要
 * @param {string} markedBy 由哪个账号发现的
 */
export function markVendorDead(key, reason, markedBy = 'unknown') {
    if (deadVendors.has(key)) return;

    deadVendors.set(key, { reason, markedBy, at: new Date().toISOString() });
    console.log(`      🚫 厂商「${VENDORS[key]?.vendor || key}」已标记为不可用（由账号 ${markedBy} 发现）`);
    console.log(`         原因: ${reason}`);
    console.log(`         后续账号将跳过该厂商`);
}

/** 该厂商是否已被标记为不可用 */
export function isVendorDead(key) {
    return deadVendors.has(key);
}

/** 记录一次尝试结果 */
export function recordAttempt(key, success) {
    const s = vendorStats.get(key) || { attempts: 0, successes: 0, failures: 0 };
    s.attempts++;
    if (success) s.successes++;
    else s.failures++;
    vendorStats.set(key, s);
}

/**
 * 从候选 list 中挑一个可用厂商
 *
 * @param {string[]} list     候选厂商 key 列表
 * @param {string[]} exclude  本账号本轮已试过的 key（避免重复试）
 * @returns {string|null} 选中的 key，无可用时返回 null
 */
export function pickVendor(list, exclude = []) {
    const alive = list.filter(k => VENDORS[k] && !isVendorDead(k) && !exclude.includes(k));

    if (alive.length === 0) return null;
    if (alive.length === 1) return alive[0];

    // 多个可用时随机挑一个，让并发账号分散到不同厂商
    return alive[Math.floor(Math.random() * alive.length)];
}

/** 是否所有候选厂商都已阵亡 */
export function allVendorsDead(list) {
    return list.every(k => !VENDORS[k] || isVendorDead(k));
}

/** 打印当前注册表状态（用于汇总） */
export function printRegistryStatus(list) {
    console.log(`\n      ══════ 厂商注册表状态 ══════`);
    for (const key of list) {
        const v = VENDORS[key];
        if (!v) {
            console.log(`         ❓ ${key} — 未定义`);
            continue;
        }
        const s = vendorStats.get(key) || { attempts: 0, successes: 0, failures: 0 };
        const dead = deadVendors.get(key);
        const icon = dead ? '🚫' : (s.successes > 0 ? '✅' : '⬜');
        const detail = dead
            ? `不可用（${dead.reason.slice(0, 40)}）`
            : `尝试 ${s.attempts} 次 / 成功 ${s.successes}`;
        console.log(`         ${icon} ${v.vendor} — ${detail}`);
    }
}

/** 重置状态（仅供测试使用） */
export function resetRegistry() {
    deadVendors.clear();
    vendorStats.clear();
}

/** 生成 [min,max] 闭区间随机整数 */
export function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
