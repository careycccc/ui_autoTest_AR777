/**
 * 游戏试玩参数解析
 *
 * 把「玩哪个分类 / 哪个厂商 / 哪几个游戏」从代码里抽出来，
 * 由命令行或环境变量传入，避免每换一个厂商就改一次源码。
 *
 * ── 用法 ──
 *   位置参数（第一个是分类，第二个是厂商）：
 *     node src/index.js Slots MINI
 *     node src/concurrent.js video PG
 *
 *   命名参数：
 *     node src/concurrent.js --category=Slots --vendor=MINI
 *     node src/concurrent.js --category=Slots --vendor=MINI --games="FortuneFlow,ballonix"
 *     node src/concurrent.js --category=Slots --vendor=MINI --all     # 该厂商下全部游戏依次试玩
 *
 *   环境变量（供测试文件读取，由入口脚本写入）：
 *     GAME_CATEGORY / GAME_VENDOR / GAME_NAMES / GAME_MODE
 *
 * 不传任何参数时回退到 vendor-registry 里的预设列表（pp / mini 随机）。
 */

/** 分类名归一：允许用户传小写 slots / video */
const CATEGORY_ALIASES = {
    slots: 'Slots',
    slot: 'Slots',
    video: 'video',
    hot: 'hot',
    card: 'card',
    fishing: 'fishing',
    popular: 'Popular'
};

/**
 * 解析命令行参数
 *
 * @param {string[]} argv  一般传 process.argv.slice(2)
 * @returns {{category:string|null, vendor:string|null, games:string[], mode:string|null, hasTarget:boolean}}
 */
export function parseGameArgs(argv = []) {
    const named = {};
    const positional = [];

    for (const arg of argv) {
        if (arg.startsWith('--')) {
            const [rawKey, ...rest] = arg.slice(2).split('=');
            named[rawKey] = rest.length > 0 ? rest.join('=') : true;
        } else {
            positional.push(arg);
        }
    }

    // 位置参数：第 1 个是分类，第 2 个起全部拼成厂商名。
    // 厂商名常含空格（pp elect / CQ9 elect / spribe elect），
    // 不加引号时会被 shell 拆成多个参数，这里合并回去，省得用户踩坑。
    const category = normalizeCategory(named.category ?? positional[0] ?? null);
    const vendor = named.vendor
        ?? (positional.length > 1 ? positional.slice(1).join(' ') : null)
        ?? null;

    const games = typeof named.games === 'string'
        ? named.games.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    // --all 表示把该厂商下的游戏依次跑完；否则只要指定了游戏名就走精准模式
    let mode = null;
    if (named.all) mode = 'inOrder';
    else if (games.length > 0) mode = 'byName';

    return { category, vendor, games, mode, hasTarget: Boolean(vendor) };
}

/** 分类名归一（用户可能传 slots，页面上是 Slots） */
export function normalizeCategory(input) {
    if (!input || input === true) return null;
    const key = String(input).trim();
    return CATEGORY_ALIASES[key.toLowerCase()] || key;
}

/**
 * 把解析结果写入环境变量，供测试文件读取
 * 测试文件是被 import 的，拿不到入口的局部变量，用环境变量传递最直接
 */
export function exportGameArgsToEnv(args) {
    if (args.category) process.env.GAME_CATEGORY = args.category;
    if (args.vendor) process.env.GAME_VENDOR = args.vendor;
    if (args.games.length) process.env.GAME_NAMES = args.games.join(',');
    if (args.mode) process.env.GAME_MODE = args.mode;
}

/**
 * 从环境变量读回参数（测试文件侧使用）
 */
export function readGameArgsFromEnv() {
    const vendor = process.env.GAME_VENDOR || null;
    const games = (process.env.GAME_NAMES || '')
        .split(',').map(s => s.trim()).filter(Boolean);

    return {
        category: process.env.GAME_CATEGORY || null,
        vendor,
        games,
        mode: process.env.GAME_MODE || null,
        hasTarget: Boolean(vendor)
    };
}

/**
 * 描述实际生效的试玩目标
 *
 * 必须基于 buildTarget 推导后的 target 而非原始参数：
 * 未登记的厂商拿不到预设游戏名，会自动落到顺序模式，
 * 若照搬原始参数会打印出「精准模式（未指定游戏名）」这种自相矛盾的提示。
 *
 * @param {object} args    parseGameArgs 的结果
 * @param {object} [target] buildTarget 的结果，给了则以它为准
 */
export function describeGameArgs(args, target = null) {
    if (!args.hasTarget) {
        return '未指定厂商，使用 vendor-registry 预设列表';
    }

    const category = target?.category || args.category || 'Slots';
    const vendor = target?.vendor || args.vendor;
    const mode = target?.mode || args.mode;
    const games = target?.gameNames?.length ? target.gameNames : args.games;

    const modeText = mode === 'inOrder'
        ? '顺序模式（该厂商下全部游戏依次试玩）'
        : `精准模式（${games.join(' / ')}）`;

    return `${category} / ${vendor} — ${modeText}`;
}
