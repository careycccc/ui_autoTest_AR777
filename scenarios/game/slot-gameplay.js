/**
 * 电子游戏（Slots）通用玩法
 *
 * 适用范围：所有未单独指定玩法的电子游戏，默认都走这套逻辑。
 *
 * ── 为什么必须用坐标点击 ──
 * 游戏画面由 canvas 渲染，iframe 内部只有一个 <canvas>，
 * 所有按钮（开始、旋转、加减注）都是画布内的像素，没有任何 DOM 节点可定位。
 * 因此只能取 canvas 的 boundingBox，再按相对比例换算出屏幕坐标点击。
 *
 * ── 按钮位置（相对 canvas 的比例）──
 * 实测两个阶段的主按钮位置基本重合：
 *   阶段一「TO START PLAYING」启动画面 —— 中央圆形启动按钮
 *   阶段二 游戏主界面                  —— 中央白色旋转按钮
 * 两者都在水平中心、垂直约 72% 处，故共用同一坐标。
 * 加减注按钮分列旋转按钮左右两侧。
 */

/** 主按钮（启动 / 旋转）相对 canvas 的位置 */
export const SPIN_BUTTON = { xRatio: 0.50, yRatio: 0.72 };

/** 减注按钮（旋转按钮左侧） */
export const BET_MINUS_BUTTON = { xRatio: 0.32, yRatio: 0.72 };

/** 加注按钮（旋转按钮右侧） */
export const BET_PLUS_BUTTON = { xRatio: 0.68, yRatio: 0.72 };

/**
 * 奖励三选一（如 3 Genie Wishes 的 MAKE A WISH）中间选项
 *
 * 实测 390x788 画布下三个选项呈弧形排布：
 *   宝箱(左) x≈145 / 钱袋(中) x≈172 / 金罐(右) x≈233
 * 取中间那个换算而来 —— 中间项水平最居中，跨游戏最好定位。
 */
export const BONUS_PICK_CENTER = { xRatio: 0.44, yRatio: 0.38 };

/**
 * 获取游戏 iframe 内的主 canvas
 *
 * 注意：外层页面也有一个 .coin-canvas（金币动画），必须取 iframe 内的那个。
 */
export async function getGameCanvas(page) {
    // 游戏页存在嵌套 iframe（外层容器 iframe + 内层游戏 iframe），
    // canvas 位于内层，因此必须遍历所有 frame 而非只取第一个。
    // 主文档里的 .coin-canvas（金币动画）通过排除 mainFrame 天然过滤掉。
    const frames = page.frames().filter(f => f !== page.mainFrame());

    for (const frame of frames) {
        try {
            const canvas = frame.locator('canvas').first();
            if (await canvas.count() === 0) continue;

            const box = await canvas.boundingBox().catch(() => null);
            if (!box || box.width < 50 || box.height < 50) continue;

            return { canvas, box, frame };
        } catch {
            // frame 可能在遍历过程中被销毁，跳过
            continue;
        }
    }

    return null;
}

/**
 * 按相对比例点击 canvas 上的某个位置
 */
async function clickOnCanvas(page, box, pos, label) {
    const x = box.x + box.width * pos.xRatio;
    const y = box.y + box.height * pos.yRatio;
    await page.mouse.click(x, y);
    console.log(`         👆 ${label} @ (${Math.round(x)}, ${Math.round(y)})`);
}

/**
 * 保存调试截图，用于肉眼校准 canvas 点击坐标
 * 仅在 options.screenshotDir 提供时启用
 */
async function debugShot(page, dir, name) {
    if (!dir) return;
    try {
        const fs = await import('fs');
        const path = await import('path');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file });
        console.log(`         📸 ${file}`);
    } catch (e) {
        console.log(`         ⚠️ 截图失败: ${e.message.split('\n')[0]}`);
    }
}

/**
 * 采集画面指纹，用于判断画面是否发生变化
 *
 * 必须用 page.screenshot 而不是读 canvas 像素：
 *   游戏用 WebGL 渲染，未开启 preserveDrawingBuffer 时
 *   drawImage/getImageData 读到的是空白，指纹恒定不变，
 *   会把正常运行的游戏误判成「画面无变化」。
 *   Playwright 的截图走的是合成后的帧，能正确捕获 WebGL 内容。
 */
async function screenFingerprint(page, clip = null) {
    try {
        const buf = await page.screenshot(clip ? { clip } : {});
        let hash = 0;
        // 按固定步长抽样，避免大图逐字节开销
        for (let i = 0; i < buf.length; i += 257) {
            hash = (hash * 31 + buf[i]) % 2147483647;
        }
        return String(hash);
    } catch {
        return null;
    }
}

/**
 * 兜底处理奖励三选一（MAKE A WISH 之类）
 *
 * ── 为什么是「盲点」而不是先检测再点 ──
 * 画面全部由 canvas 绘制，没有任何 DOM 可以判断当前处于哪个界面；
 * 而奖励界面自带闪烁动画，画面指纹一直在变，也无法靠「画面停滞」识别
 * （实测三轮都报「画面有变化」，但余额纹丝不动 —— 正是卡在选择界面）。
 *
 * 因此每轮旋转后固定点一次中间选项：
 *   处于三选一   → 选中中间那个，流程继续
 *   处于正常转轴 → 该坐标落在转轴中部，老虎机通常只会跳过动画，无副作用
 *
 * 若某游戏点这里会误触发，把 handleBonusPick 关掉即可。
 */
async function pickBonusChoice(page, box, screenshotDir, roundLabel) {
    await clickOnCanvas(page, box, BONUS_PICK_CENTER, '兜底点击奖励中间项');
    await page.waitForTimeout(2500);
    await debugShot(page, screenshotDir, `${roundLabel}-奖励兜底后`);
}

/**
 * 等待游戏从厂商加载画面切换到可交互的主界面
 *
 * 背景：canvas 一出现就判定「已显示」是不够的 —— 实测此时
 * 画面上还是 PragmaticPlay 的 logo 加载进度条，点击会全部打空。
 *
 * 判定方式：连续采样画面指纹，画面先剧烈变化（加载动画）后趋于
 * 平稳视为就绪；始终不稳定则等满 maxWait 后继续（游戏主界面本身
 * 也带循环动画，不能无限等）。
 */
async function waitForGameInteractive(page, clip, options = {}) {
    const { maxWait = 20000, sampleInterval = 2000, stableNeeded = 2 } = options;

    const deadline = Date.now() + maxWait;
    let prev = await screenFingerprint(page, clip);
    let changes = 0;

    console.log(`      ⏳ 等待游戏完成初始化（最长 ${maxWait / 1000}s）...`);

    while (Date.now() < deadline) {
        await page.waitForTimeout(sampleInterval);
        const now = await screenFingerprint(page, clip);

        if (prev && now && prev !== now) {
            changes++;
        }
        prev = now;

        // 画面已经动过若干次（加载进度推进 → 切入游戏），认为初始化完成
        if (changes >= stableNeeded) {
            console.log(`      ✅ 游戏已完成初始化（画面变化 ${changes} 次）`);
            return true;
        }
    }

    console.log(`      ℹ️ 初始化等待结束（画面变化 ${changes} 次），继续尝试操作`);
    return false;
}

/**
 * 试玩一局电子游戏
 *
 * 流程：
 *   1. 定位 iframe 内的主 canvas
 *   2. 点击中央按钮关闭「TO START PLAYING」启动画面（若存在）
 *   3. 循环点击旋转按钮，每轮之间固定等待
 *
 * @param {import('playwright').Page} page
 * @param {object} options
 * @param {number} options.rounds        旋转轮数，默认 3~5 随机
 * @param {number} options.roundInterval 每轮之间的等待(ms)，默认 5000
 * @param {number} options.startupWait   点击启动按钮后的等待(ms)，默认 5000
 * @param {boolean} options.adjustBet    是否演示加注，默认 false
 * @returns {Promise<{success:boolean, rounds:number, roundsPlayed:number}>}
 */
export async function playSlotGame(page, options = {}) {
    const {
        rounds = randomRounds(3, 5),
        roundInterval = 5000,
        // 点击中央按钮后的等待：需覆盖「关闭启动画面」与「转完一轮」两种情况
        startupWait = 8000,
        adjustBet = false,
        // 加注点击次数：数字或 [min,max] 随机区间
        betClicks = [3, 6],
        // 每轮后兜底点击奖励三选一的中间项
        handleBonusPick = true,
        // 传目录则在关键节点截图，用于校准 canvas 点击坐标
        screenshotDir = process.env.GAMEPLAY_SHOTS || null
    } = options;

    const target = await getGameCanvas(page);
    if (!target) {
        throw new Error('未找到游戏 canvas，无法进行坐标点击');
    }

    const { box, frame } = target;
    console.log(`      🎰 canvas 区域: ${Math.round(box.width)}x${Math.round(box.height)} @ (${Math.round(box.x)}, ${Math.round(box.y)})`);
    console.log(`      🎯 计划旋转 ${rounds} 轮，每轮间隔 ${roundInterval / 1000}s`);

    // ---- 步骤 1：点击中央按钮，关闭启动画面 ----
    // 启动画面可能不出现（勾选过 DON'T SHOW NEXT TIME），
    // 此时这一次点击等同于第一次旋转，不影响后续流程。
    // 截图对比只取 canvas 区域，排除外层导航栏时钟等无关变化
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };

    await debugShot(page, screenshotDir, '0-进入游戏');

    // 先等游戏自身初始化完成，否则点击会打在厂商加载画面上
    await waitForGameInteractive(page, clip);
    await debugShot(page, screenshotDir, '1-初始化完成');

    // ---- 步骤 1：点击中央按钮，把游戏推进到可下注的主界面 ----
    // 实测启动画面「TO START PLAYING!」是否出现并不固定：
    //   出现时 —— 这一下是关闭启动画面
    //   未出现 —— 这一下等同于第一次旋转
    // 两种情况都需要再等动画走完，才会回到可下注状态。
    const beforeStart = await screenFingerprint(page, clip);
    await clickOnCanvas(page, box, SPIN_BUTTON, '点击启动按钮');
    await page.waitForTimeout(startupWait);
    await debugShot(page, screenshotDir, '2-点击启动后');

    const afterStart = await screenFingerprint(page, clip);
    if (beforeStart && afterStart) {
        console.log(`      ${beforeStart !== afterStart ? '✅ 画面已变化，进入游戏主界面' : 'ℹ️ 画面未变化（可能无启动画面）'}`);
    }

    // ---- 步骤 2（可选）：随机加注 ----
    // 必须等上一步动画结束后再做：加减注按钮在启动画面上不存在，
    // 在转轮滚动/结算期间也是禁用的，早点会全部打空。
    if (adjustBet) {
        // betClicks 支持数字或 [min,max] 区间
        const clicks = Array.isArray(betClicks)
            ? randomRounds(betClicks[0], betClicks[1])
            : betClicks;

        console.log(`      💰 随机加注 ${clicks} 次`);
        for (let i = 1; i <= clicks; i++) {
            await clickOnCanvas(page, box, BET_PLUS_BUTTON, `加注 ${i}/${clicks}`);
            await page.waitForTimeout(1000);
        }
        await debugShot(page, screenshotDir, '3-加注后');
    }

    // ---- 步骤 3：循环旋转 ----
    let roundsPlayed = 0;
    for (let i = 1; i <= rounds; i++) {
        // 每轮重新取 box：游戏可能在过程中调整画布尺寸
        const current = await getGameCanvas(page);
        if (!current) {
            console.log(`      ⚠️ 第 ${i} 轮：canvas 已消失，停止旋转`);
            break;
        }

        const roundClip = {
            x: current.box.x, y: current.box.y,
            width: current.box.width, height: current.box.height
        };

        const before = await screenFingerprint(page, roundClip);
        console.log(`      🔄 第 ${i}/${rounds} 轮`);
        await clickOnCanvas(page, current.box, SPIN_BUTTON, '点击旋转');

        await page.waitForTimeout(roundInterval);
        roundsPlayed++;
        await debugShot(page, screenshotDir, `4-第${i}轮后`);

        // 若本轮触发了奖励三选一，点中间那项把流程推进下去
        if (handleBonusPick) {
            await pickBonusChoice(page, current.box, screenshotDir, `4-第${i}轮`);
        }

        const after = await screenFingerprint(page, roundClip);
        if (before && after) {
            console.log(`         ${before !== after ? '✓ 画面有变化' : '⚠️ 画面无变化（可能未触发旋转）'}`);
        }
    }

    console.log(`      ✅ 试玩完成：实际旋转 ${roundsPlayed}/${rounds} 轮`);

    return { success: roundsPlayed > 0, rounds, roundsPlayed };
}

/** 生成 [min, max] 闭区间随机整数 */
export function randomRounds(min = 3, max = 5) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
