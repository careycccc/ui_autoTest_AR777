// tests/sequential.test.js
import { tarbarComponentsRegester } from '../src/common/common.js';
import { verifyActivelist } from '../scenarios/promo/promo.js';
import { clickDetailInCarousel, Withdrawalrewards, earnInviteLink } from '../scenarios/earn/earn.js';
import { clickIfTextExists } from '../scenarios/utils.js';

export default async function (test) {
    const { getRunner, getAuth } = await tarbarComponentsRegester(test);

    test.test('模式3: 按目录顺序执行所有用例', async () => {
        const runner = getRunner();
        const auth = getAuth();
        // ========================================
        // 注册子用例：活动资讯
        // ========================================
        runner.registerCase('活动资讯', '检查活动资讯有没有活动', verifyActivelist);

        // ========================================
        // 注册子用例：新版返佣
        // ========================================
        runner.registerCase('新版返佣', '检查新版返佣进入团队详情', async (page, auth, test) => {
            await clickDetailInCarousel(page);

            // 如果点击 Detail 会跳转页面
            await test.switchToPage('进入团队详情', {
                waitForSelector: 'text=Subordinate Data',
                waitTime: 1000,
                collectPreviousPage: true
            });

            // 点击切换后的页面的Level 1，Level 2，Level 3（依次执行）
            await clickIfTextExists(page, 'Level 1', { name: '新版返佣->团队详情' });
            await clickIfTextExists(page, 'Level 2', { name: '新版返佣->团队详情' });
            await clickIfTextExists(page, 'Level 3', { name: '新版返佣->团队详情' });
        });
        runner.registerCase('新版返佣', '检查新版返佣进入手动/自动领取佣金，佣金详情', async (page, auth, test) => {
            await Withdrawalrewards(page, test);
        });

        runner.registerCase('新版返佣', '检查新版返佣的邀请界面', async (page, auth, test) => {
            await earnInviteLink(page, test);
        });

        // ========================================
        // 执行顺序模式
        // ========================================
        const results = await runner.runSequential({
            // 按这个顺序执行
            tabOrder: ['活动资讯', '新版返佣', '菜单', '邀请转盘', '家'],
            defaultRetries: 3,  //- 默认重试次数
            retryDelay: 2000,  // - 重试间隔(ms)
            resetBeforeEachCase: true, // - 每个用例前是否回到当前目录页
            onCaseDone: async (index, name, status) => {
                const icon = status === 'passed' ? '✅' : '⏭️';
                console.log(`\n      ${icon} [${index}] ${name} → ${status}\n`);
            }
        });

        // 打印最终结果
        const passRate = ((results.passed / results.total) * 100).toFixed(1);
        console.log(`\n🏁 最终通过率: ${passRate}%`);
        console.log(`   通过: ${results.passed} / 失败: ${results.failed} / 跳过: ${results.skipped}`);

        // 如果通过率低于 80% 可以让测试失败
        if (parseFloat(passRate) < 80) {
            throw new Error(`通过率 ${passRate}% 低于 80% 阈值`);
        }
    });
}