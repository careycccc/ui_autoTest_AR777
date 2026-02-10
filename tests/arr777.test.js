// tests/withBeforeEach.test.js
import { TestHooks } from '../src/utils/hooks.js';

export default async function (test) {
    let hooks;
    let auth;

    // 每个测试前登录 + 自动清理弹窗
    test.beforeEach(async () => {
        hooks = new TestHooks(test);
        auth = await hooks.standardSetup();  // 🔥 只调用一次！内部已包含弹窗处理
        // ✅ 到这里：已登录 + 无弹窗 的干净首页
    });

    test.test('登录后导航测试', async () => {

        // 进入活动资讯
        await test.page.waitForTimeout(1000);
        await test.page.locator('#activity').click();
        await test.switchToPage('活动资讯页', {
            waitForSelector: 'text=Promotions',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 进入新版返佣
        await test.page.waitForTimeout(1000);
        await test.page.locator('#promotion').click();
        await test.switchToPage('新版返佣', {
            waitForSelector: 'text=My Rewards',
            waitTime: 1000,
            collectPreviousPage: true
        });

        // 进入菜单
        await test.page.waitForTimeout(1000);
        await test.page.locator('#app #menu').click();
        await test.switchToPage('菜单', {
            waitForSelector: '.uid',
            waitTime: 1000,
            collectPreviousPage: true
        });
        await auth.clickCorner('bottom-right', 5);

        // 进入邀请转盘
        await test.page.waitForTimeout(1000);
        await test.page.locator('#turntable').click();
        await test.switchToPage('邀请转盘', {
            waitForSelector: 'text=Cash everyday',  // 🔥 修复：用文本选择器
            waitTime: 1000,
            collectPreviousPage: true
        });
        // 进行左上角返回的问题
        await auth.dismissOverlay();

        await test.page.pause();
    });
}