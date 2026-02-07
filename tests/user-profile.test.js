// tests/user-profile.test.js
import { TestHooks } from '../src/utils/hooks.js';

export default async function (t) {

    t.test('用户个人资料测试', async () => {
        // 一行代码完成登录
        const hooks = new TestHooks(t);
        await hooks.standardSetup();

        // // 以下直接写业务测试
        // await t.step('打开个人资料页', async () => {
        //     await t.page.locator('[data-testid="user-menu"]').click();
        //     await t.page.locator('[data-testid="profile-link"]').click();
        // });

        // await t.markNewPage('个人资料页');

        // await t.step('验证个人信息显示', async () => {
        //     await t.assert.visible('[data-testid="user-name"]');
        //     await t.assert.visible('[data-testid="user-phone"]');
        // });

        // await t.step('修改昵称', async () => {
        //     await t.page.locator('[data-testid="edit-nickname"]').click();
        //     await t.page.locator('[data-testid="nickname-input"]').fill('新昵称');
        //     await t.page.locator('[data-testid="save-btn"]').click();
        // });

        await t.collectPerformance();
    });
}