// tests/ar777.test.js
import { TestHooks } from '../src/utils/hooks.js';

export default async function (t) {

  t.test('完整登录流程', async () => {
    const hooks = new TestHooks(t);

    // 自动完成：首页 → 登录页 → 登录成功页
    await hooks.standardSetup();

    // 登录成功后的测试...
    await t.step('验证用户状态', async () => {
      console.log('        当前URL:', t.page.url());
    });

    // // 如果需要跳转到其他页面
    // await t.step('点击个人中心', async () => {
    //   await t.page.locator('[data-testid="user-menu"]').click();
    // });

    // // 使用 switchToPage 切换页面
    // await t.switchToPage('个人中心', {
    //   waitForSelector: '.profile-page',
    //   waitTime: 2000
    // });

    // // 继续测试...
    // await t.step('验证个人中心', async () => {
    //   // ...
    // });

    // 最后完成当前页面的采集
    await t.finishCurrentPage();
  });
}