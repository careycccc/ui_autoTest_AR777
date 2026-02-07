export default async function (test) {

  test('多页面性能测试示例', async () => {

    // ===== 第一个页面 =====
    await test.goto('https://www.google.com', { pageName: 'Google 首页' });

    await test.step('输入搜索关键词', async () => {
      await test.page.fill('textarea[name="q"]', 'Playwright automation');
    });

    // ===== 切换到第二个页面 =====
    await test.clickAndSwitchTo('搜索结果页',
      async () => {
        await test.page.keyboard.press('Enter');
      },
      {
        waitForSelector: '#search',
        waitTime: 2000
      }
    );

    await test.step('验证搜索结果', async () => {
      await test.assert.visible('#search');
    });

    // ===== 切换到第三个页面 =====
    await test.clickAndSwitchTo('图片搜索页',
      async () => {
        await test.page.click('a:has-text("图片")');
      },
      {
        waitTime: 2000
      }
    );

    await test.step('验证图片页面', async () => {
      await test.waitForTimeout(1000);
    });

    // 最后一个页面会在测试结束时自动采集
  });
}