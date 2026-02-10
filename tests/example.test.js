// tests/withBeforeEach.test.js
import { TestHooks } from '../src/utils/hooks.js';
import { testModule } from '../src/core/TestModle.js';

export default async function (test) {
  let hooks;
  let auth;
  let runner;

  test.beforeEach(async () => {
    hooks = new TestHooks(test);
    auth = await hooks.standardSetup();
    runner = new testModule(test, auth);

    // ========================================
    // 注册4个主目录
    // ========================================

    // ✅ 绝大多数：switchPage 默认 true，自动使用 switchToPage
    runner.registerTab('活动资讯', {
      selector: '#activity',
      // switchPage: true,  ← 默认就是 true，可省略
      pageName: '活动资讯页',
      waitForSelector: 'text=Promotions',
      waitTime: 1000,
      collectPreviousPage: true
    });

    runner.registerTab('新版返佣', {
      selector: '#promotion',
      pageName: '新版返佣',
      waitForSelector: 'text=My Rewards',
      waitTime: 1000,
      collectPreviousPage: true
    });

    // ✅ 特殊场景：菜单是覆盖层，不切换页面，只点击
    runner.registerTab('菜单', {
      selector: '#app #menu',
      switchPage: false,        // 🔥 仅点击，不切换页面
      waitForSelector: '.uid',
      pageName: '菜单页',
      waitTime: 1000,
      onEnter: async (page, auth, test) => {
        await auth.safeWait(1000);
        const { width, height } = page.viewportSize();
        await page.mouse.click(width - width / 10, height - 80);
        await auth.safeWait(500);
      },
      onLeave: async (page, auth, test) => {
        await page.locator('#app #menu').click();
        await page.waitForTimeout(500);
      }
    });

    // ✅ 邀请转盘：切换页面
    runner.registerTab('邀请转盘', {
      selector: '#turntable',
      pageName: '邀请转盘',
      waitForSelector: 'text=Cash everyday',
      waitTime: 1000,
      collectPreviousPage: true,
      onLeave: async (page, auth, test) => {
        await auth._clickBackButton();
        await auth.safeWait(1000);
      }
    });
  });

  // ========================================
  // 🎲 模式1: 随机压力测试
  // ========================================
  test.test('模式1: 随机点击主目录 (压力测试)', async () => {
    const results = await runner.runRandom(15, {
      minInterval: 2000,
      maxInterval: 3500,
      verify: true,
      onEachDone: async (i, tabName, status) => {
        if (i % 10 === 0) {
          console.log(`\n      ── 进度: ${i} 次完成 ──\n`);
        }
      }
    });

    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  });

  // ========================================
  // 🔄 模式2: 重复模式 —— 任务也能指定 switchPage
  // ========================================
  test.test('模式2: 重复执行指定链路', async () => {
    const results = await runner.runRepeat([
      // 任务1: 切换到活动资讯页（使用 switchToPage）
      {
        name: '进入活动资讯',
        clickSelector: '#activity',
        switchPage: true,                   // 🔥 使用 switchToPage
        pageName: '活动资讯页',
        waitForSelector: 'text=Promotions',
        fn: async (page, auth, round, test) => {
          console.log(`      第${round}轮：检查活动资讯内容`);
          // 在活动资讯页做些事...
        }
      },
      // 任务2: 仅点击编辑按钮（不切换页面）
      {
        name: '点击编辑按钮',
        switchPage: false,                  // 🔥 不切换页面
        fn: async (page, auth, round, test) => {
          // 仅点击，不切换页面
          await page.locator('.edit-btn').click();
          await auth.safeWait(500);
        }
      },
      // 任务3: 进入子页面（用例内自己调用 switchToPage）
      {
        name: '进入详情页',
        fn: async (page, auth, round, test) => {
          await page.locator('.detail-link').click();
          // 🔥 用例函数内也能使用 test.switchToPage
          await test.switchToPage('详情页', {
            waitForSelector: '.detail-content',
            waitTime: 1000,
            collectPreviousPage: true
          });
        }
      }
    ], 5, {
      resetBetweenRounds: true,
      intervalBetweenRounds: 1000
    });
  });

  // ========================================
  // 📋 模式3: 顺序模式 —— 子用例注册
  // ========================================
  test.test('模式3: 按目录顺序执行', async () => {

    // 注册子用例：活动资讯下的子功能
    runner.registerCase('活动资讯', '查看活动列表', async (page, auth, test) => {
      // 不需要切换页面，只验证内容
      const count = await page.locator('.activity-item').count();
      console.log(`      找到 ${count} 个活动`);
    });

    runner.registerCase('活动资讯', '进入活动详情', async (page, auth, test) => {
      await page.locator('.activity-item').first().click();
      // 🔥 用例内使用 test.switchToPage
      await test.switchToPage('活动详情', {
        waitForSelector: '.activity-detail',
        waitTime: 1000,
        collectPreviousPage: true
      });
    });

    // 也可以在注册时配置自动导航
    runner.registerCase('活动资讯', '进入公告详情', async (page, auth, test) => {
      console.log('      已自动导航到公告详情页');
      // 直接写业务逻辑...
    }, {
      clickSelector: '.notice-item:first-child',  // 🔥 自动先点击
      switchPage: true,                            // 🔥 自动调用 switchToPage
      pageName: '公告详情',
      waitForSelector: '.notice-content'
    });

    // 纯点击场景
    runner.registerCase('活动资讯', '点击收藏按钮', async (page, auth, test) => {
      await page.locator('.fav-btn').click();
      await auth.safeWait(500);
      // 不切换页面，仅操作
    }, {
      switchPage: false  // 🔥 显式标记不切换
    });

    const results = await runner.runSequential({
      tabOrder: ['活动资讯', '新版返佣', '菜单', '邀请转盘'],
      defaultRetries: 3,
      retryDelay: 2000
    });
  });
}