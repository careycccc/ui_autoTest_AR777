/**
 * MiniGame 厂商专属玩法（FortuneFlow / ballonix）
 *
 * 与 slot-gameplay.js 的根本区别：
 *   PP 等电子游戏是 canvas 渲染，只能按相对坐标盲点；
 *   这两个游戏是 DOM 渲染，有真实的 input / button，可以精确定位、
 *   并且能直接读到余额 —— 因此投注额可以按余额动态计算。
 *
 * ── 实测结构（iPhone 14 视口）──
 * FortuneFlow (mini2-game-test.mini.game/game9.html)
 *   余额        唯一一个文本为纯数字的 button（带下拉箭头，如 "352.4"）
 *   投注输入框  input.bet-amount-input   （初始 value "0"，min "1"）
 *   开始按钮    button.btn-bet-def       （文本 Start）
 *
 * ballonix (inout-test.mini.game/ballonix)
 *   余额        文本 "BALANCE" 元素邻近的数字
 *   投注输入框  input.Input-bWmjCu       （初始 value "100"）
 *   加注 / 减注 button.Button-dgWeAp     （两者 class 完全相同，只能靠 svg path 区分）
 *                 加 → path 以 "M27" 开头（向上箭头）
 *                 减 → path 以 "M28" 开头（向下箭头）
 *   开始/停止   button.PlayBtn-cOoEjk    （同一个按钮，点第二次为停止）
 */

/** 生成 [min,max] 闭区间随机整数 */
export function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * 关闭平台 OK 确认弹窗
 * 动态导入以避免与 game-play.js 形成静态循环依赖
 */
async function dismissConfirmPopup(page) {
    const { dismissConfirmPopup: fn } = await import('./game-play.js');
    return await fn(page);
}

/**
 * 找到承载游戏 DOM 的 frame
 * 游戏页可能是嵌套 iframe，取含指定选择器的那一层
 */
async function findGameFrame(page, probeSelector) {
    const frames = page.frames().filter(f => f !== page.mainFrame());

    for (const frame of frames) {
        try {
            const hit = await frame.locator(probeSelector).count();
            if (hit > 0) return frame;
        } catch {
            continue;
        }
    }
    return null;
}

// ============================================================
// FortuneFlow
// ============================================================

/** 读取 FortuneFlow 的余额：唯一文本为纯数字的 button */
async function readFortuneFlowBalance(frame) {
    return await frame.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        for (const b of btns) {
            const t = (b.textContent || '').trim();
            if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
        }
        return null;
    }).catch(() => null);
}

/** FortuneFlow 保留金额：始终不动用，留给后续游戏当本金 */
export const FORTUNE_RESERVE = 100;

/** FortuneFlow 最小投注额（输入框 min="1"） */
export const FORTUNE_MIN_BET = 1;

/**
 * 计算 FortuneFlow 单轮投注额
 *
 * 规则：
 *   1. 保留 FORTUNE_RESERVE(100) 不参与投注 —— 避免打光余额，
 *      导致同厂商后续游戏（ballonix 最低要 25）无法开局
 *   2. 单轮上限为余额的一半，且不得动用保留金
 *   3. 可投区间 >= 100 时按 [100, 上限] 随机；
 *      不足 100 时按 [最小额, 上限] 随机 —— 原先固定取 100 会失去随机性
 *   4. 可用资金不足最小投注则返回 0，调用方据此停止
 */
export function calcFortuneFlowBet(balance, options = {}) {
    const { reserve = FORTUNE_RESERVE, minBet = FORTUNE_MIN_BET } = options;

    if (balance == null || balance <= 0) return 0;

    // 扣除保留金后的可动用资金
    const available = Math.floor(balance - reserve);
    if (available < minBet) return 0;

    // 按比例投注：单轮不超过余额的一半，同时不越过可动用资金
    const upper = Math.min(available, Math.floor(balance / 2));
    if (upper < minBet) return 0;

    // 区间够宽时保持原来的 100 下限，否则从最小额起随机
    const lower = upper >= 100 ? 100 : minBet;
    return randomInt(lower, upper);
}

/**
 * 试玩 FortuneFlow
 *
 * 单轮：读余额 → 算投注额 → 填入输入框 → Start → 等 10s
 * 余额耗尽（不足以投注）则提前结束。
 */
export async function playFortuneFlow(page, options = {}) {
    const {
        // 轮数下调（原 2~4）：配合保留金机制，避免长时间消耗同一账号资金
        rounds = randomInt(2, 3),
        roundWait = 10000,
        reserve = FORTUNE_RESERVE,
        screenshotDir = process.env.GAMEPLAY_SHOTS || null
    } = options;

    const frame = await findGameFrame(page, 'input.bet-amount-input');
    if (!frame) {
        throw new Error('FortuneFlow: 未找到含 input.bet-amount-input 的 frame');
    }

    const input = frame.locator('input.bet-amount-input').first();
    const startBtn = frame.locator('button.btn-bet-def').first();

    console.log(`      🎯 FortuneFlow 计划投注 ${rounds} 轮`);

    let roundsPlayed = 0;
    let stoppedReason = null;
    const history = [];

    for (let i = 1; i <= rounds; i++) {
        // 上一轮结算后可能弹确认框，会挡住输入框与 Start 按钮
        await dismissConfirmPopup(page);

        // 每轮都重新读余额，保证投注额贴合当前实际资金
        const balance = await readFortuneFlowBalance(frame);
        console.log(`      ──── 第 ${i}/${rounds} 轮 | 余额: ${balance ?? '读取失败'} ────`);

        if (balance == null) {
            console.log(`      ⚠️ 余额读取失败，停止投注`);
            stoppedReason = 'balance_unreadable';
            break;
        }

        const bet = calcFortuneFlowBet(balance, { reserve });
        if (bet < FORTUNE_MIN_BET) {
            console.log(`      💸 可动用资金不足（余额 ${balance} - 保留 ${reserve}），停止投注`);
            stoppedReason = 'insufficient_balance';
            break;
        }

        const available = Math.floor(balance - reserve);
        const upper = Math.min(available, Math.floor(balance / 2));
        console.log(
            `      💰 本轮投注: ${bet}` +
            `（可动用 ${available} / 上限 ${upper} = min(可动用, 余额一半)，` +
            `区间 ${upper >= 100 ? 100 : FORTUNE_MIN_BET}~${upper} 随机）`
        );

        // 填投注额：先清空再输入，并触发框架的输入监听
        await input.click();
        await input.fill('');
        await input.fill(String(bet));

        const actual = await input.inputValue().catch(() => null);
        if (actual !== String(bet)) {
            console.log(`      ⚠️ 投注额写入异常（期望 ${bet}，实际 ${actual}），改用逐字符输入`);
            await input.fill('');
            await input.pressSequentially(String(bet), { delay: 80 });
        }

        // 开始游戏
        const disabled = await startBtn.isDisabled().catch(() => false);
        if (disabled) {
            console.log(`      ⚠️ Start 按钮不可用，跳过本轮`);
            stoppedReason = 'start_disabled';
            break;
        }

        await startBtn.click();
        console.log(`      ▶️ 已点击 Start，等待 ${roundWait / 1000}s`);
        await page.waitForTimeout(roundWait);

        roundsPlayed++;
        history.push({ round: i, balanceBefore: balance, bet });

        await debugShot(page, screenshotDir, `mini-FortuneFlow-第${i}轮后`);
    }

    const finalBalance = await readFortuneFlowBalance(frame);
    console.log(`      ✅ FortuneFlow 完成：投注 ${roundsPlayed}/${rounds} 轮，最终余额 ${finalBalance ?? '未知'}`);

    return { success: roundsPlayed > 0, rounds, roundsPlayed, history, finalBalance, stoppedReason };
}

// ============================================================
// ballonix
// ============================================================

/** 读取 ballonix 余额：文本为 BALANCE 的元素邻近的数字 */
async function readBallonixBalance(frame) {
    return await frame.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*'));

        for (const el of all) {
            if (el.children.length > 0) continue;
            if ((el.textContent || '').trim().toUpperCase() !== 'BALANCE') continue;

            // BALANCE 标签与数值通常是相邻节点，向上找 3 层容器提取数字
            let p = el.parentElement;
            for (let i = 0; i < 3 && p; i++) {
                const text = (p.innerText || '').replace(/BALANCE/i, '');
                const m = text.match(/(\d+(?:\.\d+)?)/);
                if (m) return parseFloat(m[1]);
                p = p.parentElement;
            }
        }
        return null;
    }).catch(() => null);
}

/** 读取 ballonix 当前投注额 */
async function readBallonixBet(frame) {
    const v = await frame.locator('input.Input-bWmjCu').first().inputValue().catch(() => null);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
}

/** 最小投注额 */
export const MIN_BET = 25;

/**
 * 投注额调整步长（用户指定）
 *   当前投注 < 100  → 每次 25
 *   当前投注 >= 100 → 每次 50
 */
export function betStep(currentBet) {
    return currentBet < 100 ? 25 : 50;
}

/**
 * 列出加减按钮实际能到达的投注档位
 *
 * 步长在 100 处切换，导致并非所有 25 的倍数都可达：
 *   低区间（<100）步长 25 → 25 / 50 / 75
 *   高区间(>=100)步长 50 → 100 / 150 / 200 / 250 ...
 * 因此 125、175 这类值无法通过按钮到达，不能作为目标。
 */
export function reachableBets(maxBet) {
    const list = [];
    for (const v of [25, 50, 75]) {
        if (v <= maxBet) list.push(v);
    }
    for (let v = 100; v <= maxBet; v += 50) {
        list.push(v);
    }
    return list;
}

/**
 * 计算 ballonix 的目标投注额
 *
 * 默认投注 100；余额不足则降到余额以内。
 * 只从可达档位中挑选，且每轮随机，让投注额贴近真实玩家。
 */
export function calcBallonixTargetBet(balance, currentBet = 100) {
    if (balance == null || balance < MIN_BET) return 0;

    // 上限：不超过余额，同时封顶 200 避免单轮压太多
    const upper = Math.min(Math.floor(balance), 200);
    const options = reachableBets(upper);
    if (options.length === 0) return 0;

    // 余额撑不住当前投注 → 必须下调，取可达档位中不超过余额的最大值
    if (balance < currentBet) {
        return options[options.length - 1];
    }

    // 余额充足 → 随机挑一档，保证每轮金额不同
    return options[randomInt(0, options.length - 1)];
}

/**
 * 规划从 current 调整到 target 需要的点击序列（纯函数，便于验证）
 *
 * 步长随「当前投注额」动态变化（<100 用 25，>=100 用 50），
 * 因此不能简单用差值除以固定步长，必须逐步推演。
 * 当再走一步就会越过目标时停下 —— 宁可少调一档也不超过余额。
 *
 * @returns {{clicks:Array<{dir:'+'|'-', step:number, to:number}>, final:number}}
 */
export function planBetAdjustment(current, target) {
    const clicks = [];
    let cur = current;
    let guard = 0;   // 防止不可达目标造成死循环

    while (cur !== target && guard < 30) {
        guard++;
        const step = betStep(cur);

        if (cur < target) {
            // 上调：绝不允许越过目标，否则投注额可能超过余额
            if (cur + step > target) break;
            cur += step;
            clicks.push({ dir: '+', step, to: cur });
        } else {
            // 下调：即使这一步会低于目标也必须减 —— 停在高于目标的位置
            // 就意味着投注额超过余额，下注必定失败。
            // 减过头后若进入 25 步长区间，下一轮会自动加回来，
            // 例如 100 → 75 走的是 100 −50→ 50 +25→ 75。
            const next = cur - step;
            if (next < MIN_BET) break;   // 已到最小投注，无法再降
            cur = next;
            clicks.push({ dir: '-', step, to: cur });
        }
    }

    return { clicks, final: cur };
}

/**
 * 把投注额从 current 调整到 target
 * 按 planBetAdjustment 规划出的序列逐次点击加/减按钮
 */
async function adjustBallonixBet(frame, current, target) {
    // 两个按钮 class 完全相同，只能靠 svg path 首字母区分方向
    const plusBtn = frame.locator('button.Button-dgWeAp').filter({
        has: frame.locator('svg path[d^="M27"]')
    }).first();
    const minusBtn = frame.locator('button.Button-dgWeAp').filter({
        has: frame.locator('svg path[d^="M28"]')
    }).first();

    const hasPlus = await plusBtn.count() > 0;
    const hasMinus = await minusBtn.count() > 0;

    if (!hasPlus || !hasMinus) {
        console.log(`      ⚠️ 加/减注按钮定位失败（加:${hasPlus} 减:${hasMinus}），跳过调整`);
        return current;
    }

    const { clicks, final } = planBetAdjustment(current, target);

    if (clicks.length === 0) {
        console.log(`         ℹ️ 无需调整（${current} → ${target} 在一个步长内）`);
        return current;
    }

    for (const c of clicks) {
        await (c.dir === '+' ? plusBtn : minusBtn).click();
        console.log(`         ${c.dir === '+' ? '⬆️ 加注' : '⬇️ 减注'} ${c.step} → ${c.to}`);
        await frame.page().waitForTimeout(400);
    }

    // 以输入框真实值为准，点击可能被游戏拒绝（如已到上下限）
    const actual = await readBallonixBet(frame);
    if (actual != null && actual !== final) {
        console.log(`         ⚠️ 实际投注额 ${actual} 与预期 ${final} 不一致（可能触达游戏上下限）`);
    }
    return actual ?? final;
}

/**
 * 试玩 ballonix
 *
 * 单轮：读余额 → 调整投注额 → 点开始 → 随机 5~20s → 点停止 → 等 3s
 */
export async function playBallonix(page, options = {}) {
    const {
        rounds = randomInt(2, 3),
        minPlaySec = 5,
        maxPlaySec = 20,
        stopWait = 3000,
        screenshotDir = process.env.GAMEPLAY_SHOTS || null
    } = options;

    const frame = await findGameFrame(page, 'button.PlayBtn-cOoEjk');
    if (!frame) {
        throw new Error('ballonix: 未找到含 button.PlayBtn-cOoEjk 的 frame');
    }

    const playBtn = frame.locator('button.PlayBtn-cOoEjk').first();

    console.log(`      🎯 ballonix 计划投注 ${rounds} 轮`);

    let roundsPlayed = 0;
    let stoppedReason = null;
    const history = [];

    for (let i = 1; i <= rounds; i++) {
        // 上一轮结算后可能弹确认框，会挡住加减注与 Play 按钮
        await dismissConfirmPopup(page);

        const balance = await readBallonixBalance(frame);
        const currentBet = await readBallonixBet(frame);

        console.log(`      ──── 第 ${i}/${rounds} 轮 | 余额: ${balance ?? '?'} | 当前投注: ${currentBet ?? '?'} ────`);

        if (balance == null) {
            console.log(`      ⚠️ 余额读取失败，停止投注`);
            stoppedReason = 'balance_unreadable';
            break;
        }
        if (balance < MIN_BET) {
            console.log(`      💸 余额不足最小投注（${balance} < ${MIN_BET}），停止`);
            stoppedReason = 'insufficient_balance';
            break;
        }

        // 每轮重算目标投注额，保证金额不同且不超过余额
        const target = calcBallonixTargetBet(balance, currentBet ?? 100);
        if (target < MIN_BET) {
            console.log(`      💸 可投注额不足，停止`);
            stoppedReason = 'insufficient_balance';
            break;
        }

        if (target !== currentBet) {
            console.log(`      💰 调整投注: ${currentBet} → ${target}（步长 ${betStep(currentBet ?? 100)}）`);
            await adjustBallonixBet(frame, currentBet ?? 100, target);
        } else {
            console.log(`      💰 投注额已是 ${target}，无需调整`);
        }

        // 开始
        await playBtn.click();
        const playSec = randomInt(minPlaySec, maxPlaySec);
        console.log(`      ▶️ 已开始，随机游戏 ${playSec}s 后停止`);
        await page.waitForTimeout(playSec * 1000);

        // 停止（同一个按钮点第二次）
        await playBtn.click();
        console.log(`      ⏹️ 已停止`);
        await page.waitForTimeout(stopWait);

        roundsPlayed++;
        history.push({ round: i, balanceBefore: balance, bet: target, playSec });

        await debugShot(page, screenshotDir, `mini-ballonix-第${i}轮后`);
    }

    const finalBalance = await readBallonixBalance(frame);
    console.log(`      ✅ ballonix 完成：投注 ${roundsPlayed}/${rounds} 轮，最终余额 ${finalBalance ?? '未知'}`);

    return { success: roundsPlayed > 0, rounds, roundsPlayed, history, finalBalance, stoppedReason };
}

// ============================================================

/** 调试截图（与 slot-gameplay 保持一致的行为） */
async function debugShot(page, dir, name) {
    if (!dir) return;
    try {
        const fs = await import('fs');
        const path = await import('path');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file });
        console.log(`         📸 ${file}`);
    } catch { }
}
