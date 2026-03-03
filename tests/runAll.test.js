/**
 * 完整测试套件 - 按目录顺序执行所有用例
 * 
 * 这个文件负责：
 * 1. 初始化测试环境
 * 2. 注册所有子用例（通过模块化导入）
 * 3. 按指定顺序执行测试
 * 4. 生成测试报告
 */

import { tarbarComponentsRegester } from '../src/common/common.js';
import { registerAllCases } from '../scenarios/index.js';

export default async function (test) {
    const { getRunner, getAuth } = await tarbarComponentsRegester(test);

    test.test('模式3: 按目录顺序执行所有用例', async () => {
        const runner = getRunner();
        const auth = getAuth();

        // ========================================
        // 注册所有子用例
        // ========================================
        registerAllCases(runner);

        // 如果只想注册部分大类，可以使用：
        // registerAllCases(runner, { only: ['活动资讯', '新版返佣'] });

        // 如果想排除某些大类，可以使用：
        // registerAllCases(runner, { exclude: ['菜单'] });

        // ========================================
        // 执行顺序模式
        // ========================================
        const results = await runner.runSequential({
            // 按这个顺序执行
            // tabOrder: ['活动资讯', '新版返佣', '菜单', '邀请转盘', '家'],
            tabOrder: ['活动资讯', '菜单', '家'],
            defaultRetries: 3,              // 默认重试次数
            retryDelay: 2000,               // 重试间隔(ms)
            resetBeforeEachCase: true,      // 每个用例前是否回到当前目录页
            onCaseDone: async (index, name, status) => {
                const icon = status === 'passed' ? '✅' : '⏭️';
                console.log(`\n      ${icon} [${index}] ${name} → ${status}\n`);
            }
        });

        // ========================================
        // 打印最终结果
        // ========================================
        const passRate = ((results.passed / results.total) * 100).toFixed(1);
        console.log(`\n🏁 最终通过率: ${passRate}%`);
        console.log(`   通过: ${results.passed} / 失败: ${results.failed} / 跳过: ${results.skipped}`);

        // 如果通过率低于 80% 可以让测试失败
        if (parseFloat(passRate) < 80) {
            throw new Error(`通过率 ${passRate}% 低于 80% 阈值`);
        }
    });
}


