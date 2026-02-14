// tests/components/tarbarRegister.js
import { TestHooks } from '../../src/utils/hooks.js';
import { testModule } from '../../src/core/TestModle.js';

/**
 * tarbar 注册 - 一个函数搞定
 */
export async function tarbarComponentsRegester(test) {
    let hooks;
    let auth;
    let runner;

    // 🔥 全部放进 beforeEach，runner 创建后立即注册
    test.beforeEach(async () => {
        hooks = new TestHooks(test);
        auth = await hooks.standardSetup();
        runner = new testModule(test, auth);

        // ========================================
        // 注册5个主目录
        // ========================================

        runner.registerTab('活动资讯', {
            selector: '#activity',
            pageName: '活动资讯页',
            waitForSelector: 'text=Promotions',
            waitTime: 1000,
            collectPreviousPage: true
        });

        runner.registerTab('新版返佣', {
            selector: '#promotion',
            pageName: '新版返佣',
            // 🔥 修复：使用更通用的选择器来验证是否在父页面
            // 父页面有 "My Rewards" 和 "Invite Rewards" 两个 tab
            // 使用 "My Rewards" 作为主要验证，因为它是默认显示的 tab
            waitForSelector: 'text=My Rewards',
            waitTime: 1000,
            collectPreviousPage: true
        });

        runner.registerTab('菜单', {
            selector: '#app #menu',
            switchPage: false,
            waitForSelector: '.uid',
            pageName: '菜单页',
            waitTime: 1000,
            verifyTiming: 'beforeEnter',

            verifyFn: async (page) => {
                const uidText = await page.locator('.uid').textContent({ timeout: 5000 });
                console.log(`      🔍 检测到 UID 文本: "${uidText}"`);
                const match = uidText.match(/uid[:\s]*(\d+)/i);
                if (!match) throw new Error(`UID 格式异常: "${uidText}"`);
                const uidValue = parseInt(match[1], 10);
                if (uidValue <= 0) throw new Error(`UID 必须大于0，当前值: ${uidValue}`);
                console.log(`      ✅ UID 验证通过: ${uidValue}`);
            },

            onEnter: async (page, auth) => {
                await auth.safeWait(1000);
                const overlay = page.locator('.close-btn');
                if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await overlay.click({ force: true });
                } else {
                    const { width, height } = page.viewportSize();
                    await page.mouse.click(width - width / 10, height - 80);
                }
                await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
                await auth.safeWait(500);
            },

            onLeave: async (page, auth) => {
                const overlay = page.locator('.close-btn');
                if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await overlay.click({ force: true });
                    await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { });
                }
                await page.locator('#app #menu').click();
                await page.waitForTimeout(500);
            }
        });

        runner.registerTab('邀请转盘', {
            selector: '#turntable',
            pageName: '邀请转盘',
            waitTime: 2000,
            collectPreviousPage: true,

            onEnter: async (page, auth, test) => {
                // 🔥 最简化版本：只检查 URL，不处理任何弹窗
                await auth.safeWait(1500);

                const currentUrl = page.url();
                console.log(`      📍 onEnter URL: ${currentUrl}`);

                if (currentUrl.includes('/activity') && !currentUrl.includes('/turntable')) {
                    console.log(`      ❌ 页面被重定向回活动页`);
                    throw new Error('转盘页面被重定向，账号可能未开启转盘活动');
                }

                console.log(`      ✅ 确认在转盘页面`);

                // 🔥 检查是否需要执行旋转用例
                const { shouldRotateTurntable } = await import('../../scenarios/turntable/turntable-rotate.js');
                const checkResult = await shouldRotateTurntable(page, test);

                // 将结果保存到 auth 对象，供后续用例使用
                auth.turntableShouldRotate = checkResult.shouldRotate;
                auth.turntableCheckReason = checkResult.reason;

                if (!checkResult.shouldRotate) {
                    console.log(`      ℹ️ 无需执行旋转用例: ${checkResult.reason}`);
                } else {
                    console.log(`      ✅ 可以执行旋转用例`);
                }
            },

            onLeave: async (page, auth) => {
                for (const sel of ['.popuer-gift', '.van-overlay']) {
                    const el = page.locator(sel);
                    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
                        await el.click({ force: true });
                        await auth.safeWait(300);
                    }
                }
                if (auth.dismissOverlay) {
                    await auth.dismissOverlay().catch(() => { });
                }
                await auth._clickBackButton();
                await auth.safeWait(1000);
            }
        });

        runner.registerTab('家', {
            selector: '#home',
            pageName: 'home',
            waitForSelector: 'text=Home',
            waitTime: 1000,
            collectPreviousPage: true
        });
    });

    // 🔥 返回 getter 函数（因为 beforeEach 每次会重新创建）
    return {
        getHooks: () => hooks,
        getAuth: () => auth,
        getRunner: () => runner
    };
}