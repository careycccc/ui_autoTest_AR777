/**
 * 专项测试：从首页进入游戏并试玩
 *
 * 流程：
 *   1. 登录（优先密码登录，失败回退验证码登录）
 *   2. 清除首页所有弹窗
 *   3. 进入游戏二级页面（.see-all / .all-link / 文本 All）
 *   4. 选择顶部分类 Slots（横向滚动容器，目标常在视口外）
 *   5. 选择左侧厂商 MiniGame电子（纵向滚动容器，目标常在视口外）
 *   6. 依次试玩该厂商下的游戏：
 *        进入 → 等待画面显示(最长 3 分钟) → 游戏内操作 → 返回列表
 *        超时未显示的游戏直接跳过，继续下一个
 */

import { TestHooks } from '../src/utils/hooks.js';
import { enterGameSubPage } from '../scenarios/game/game-entry.js';
import { selectCategory, selectVendor, playGames } from '../scenarios/game/game-play.js';

/** 本次测试的目标分类与厂商 */
const TARGET_CATEGORY = 'Slots';
const TARGET_VENDOR = 'MiniGame电子';

/**
 * 单个游戏等待画面显示的上限，默认 1 分钟。
 * 调试时可用环境变量缩短：GAME_LOAD_TIMEOUT=30000 node src/index.js
 */
const GAME_LOAD_TIMEOUT = parseInt(process.env.GAME_LOAD_TIMEOUT || String(1 * 60 * 1000), 10);

export default async function (test) {
    let auth;

    test.beforeEach(async () => {
        const hooks = new TestHooks(test);
        // standardSetup 内部完成：进首页 → 登录 → 清理登录后弹窗
        auth = await hooks.standardSetup();
    });

    test.test(`试玩游戏: ${TARGET_CATEGORY} / ${TARGET_VENDOR}`, async () => {
        const page = test.page;

        await test.step('进入游戏二级页面', async () => {
            const entry = await enterGameSubPage(page, auth);
            console.log(`      命中策略: ${entry.strategy}`);
        });

        await test.step(`选择分类 ${TARGET_CATEGORY}`, async () => {
            await selectCategory(page, TARGET_CATEGORY);
        });

        await test.step(`选择厂商 ${TARGET_VENDOR}`, async () => {
            await selectVendor(page, TARGET_VENDOR);
        });

        let results;
        await test.step('依次试玩游戏', async () => {
            results = await playGames(page, {
                loadTimeout: GAME_LOAD_TIMEOUT,

                // ==================================================
                // 各游戏的具体玩法逻辑挂在这里（后续补充）
                // 触发时机：游戏画面已确认渲染完成
                // gameInfo = { gameName, vendorCode, gameCode, frameSrc, ... }
                // ==================================================
                onGameLoaded: async (page, gameInfo) => {
                    console.log(`      （待补充「${gameInfo.gameName}」的玩法逻辑）`);
                }
            });
        });

        // 全部游戏都进不去才判定失败：单个游戏加载失败是被测环境的问题，
        // 不应让整条链路（登录/导航/分类/厂商）的验证结果失真
        const loadedCount = results.filter(r => r.loaded).length;
        if (loadedCount === 0) {
            throw new Error(
                `厂商「${TARGET_VENDOR}」下 ${results.length} 个游戏全部未能显示画面：` +
                results.map(r => `${r.gameName}(${r.error ? '异常' : '超时'})`).join(', ')
            );
        }

        console.log(`\n      🎉 试玩完成：${loadedCount}/${results.length} 个游戏成功显示画面\n`);
    });
}
