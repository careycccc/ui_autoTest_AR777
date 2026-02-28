/**
 * Menu 模块使用示例
 * Menu Module Usage Examples
 * 
 * 展示如何使用 Menu 模块进行测试
 */

import { test } from '@playwright/test';
import { TestCase } from '../../src/core/TestCase.js';
import { AuthHelper } from '../../src/utils/auth.js';
import { createMenuModule, registerMenuCases, openMenu, closeMenu } from './menu-index.js';
import { createWalletModule, registerWalletCases } from './wallet-index.js';

// ========================================
// 示例 1: 完整的 Menu 功能测试
// ========================================
test('示例1: Menu 完整功能测试', async ({ page }) => {
    const testCase = new TestCase(page);
    const auth = new AuthHelper(page, testCase);

    // 登录
    await auth.login({
        mobile: '1234567890',
        password: '123456'
    });

    // 创建 Menu 模块
    const menuModule = createMenuModule(testCase);

    // 注册所有用例
    await registerMenuCases(menuModule);

    // 执行所有 Menu 相关用例
    await menuModule.runAllCases();
});

// ========================================
// 示例 2: 测试特定功能（通知）
// ========================================
test('示例2: 测试通知功能', async ({ page }) => {
    const testCase = new TestCase(page);
    const auth = new AuthHelper(page, testCase);

    await auth.login({
        mobile: '1234567890',
        password: '123456'
    });

    // 打开 Menu
    await openMenu(page, testCase);

    // 创建模块并注册用例
    const menuModule = createMenuModule(testCase);
    await registerMenuCases(menuModule);

    // 只执行通知相关用例
    await menuModule.runTabCases('Notifications 通知');

    // 关闭 Menu
    await closeMenu(page);
});

// ========================================
// 示例 3: Menu + Wallet 集成测试
// ========================================
test('示例3: Menu + Wallet 集成测试', async ({ page }) => {
    const testCase = new TestCase(page);
    const auth = new AuthHelper(page, testCase);

    await auth.login({
        mobile: '1234567890',
        password: '123456'
    });

    // 创建 Menu 模块
    const menuModule = createMenuModule(testCase);
    await registerMenuCases(menuModule);

    // 创建 Wallet 模块
    const walletModule = createWalletModule(testCase);
    await registerWalletCases(walletModule);

    // 1. 打开 Menu
    await menuModule.navigateToTab('Menu 页面');

    // 2. 点击 Withdraw 进入提现页面
    await menuModule.navigateToTab('Withdraw 提现');

    // 3. 执行提现相关用例
    await walletModule.runTabCases('提现页面');

    // 4. 返回 Menu
    await openMenu(page, testCase);

    // 5. 点击 Deposit 进入充值页面
    await menuModule.navigateToTab('Deposit 充值');

    // 6. 执行充值相关用例
    await walletModule.runTabCases('充值页面');
});

// ========================================
// 示例 4: 测试多个子功能
// ========================================
test('示例4: 测试多个子功能', async ({ page }) => {
    const testCase = new TestCase(page);
    const auth = new AuthHelper(page, testCase);

    await auth.login({
        mobile: '1234567890',
        password: '123456'
    });

    const menuModule = createMenuModule(testCase);
    await registerMenuCases(menuModule);

    // 测试通知
    await menuModule.runTabCases('Notifications 通知');

    // 返回 Menu
    await openMenu(page, testCase);

    // 测试余额记录
    await menuModule.runTabCases('Balance records 余额记录');

    // 返回 Menu
    await openMenu(page, testCase);

    // 测试账户安全
    await menuModule.runTabCases('Account & Security 账户安全');
});

// ========================================
// 示例 5: 自定义用例执行顺序
// ========================================
test('示例5: 自定义用例执行顺序', async ({ page }) => {
    const testCase = new TestCase(page);
    const auth = new AuthHelper(page, testCase);

    await auth.login({
        mobile: '1234567890',
        password: '123456'
    });

    const menuModule = createMenuModule(testCase);
    await registerMenuCases(menuModule);

    // 先测试 Menu 页面本身
    await menuModule.runTabCases('Menu 页面');

    // 然后按优先级测试各个功能
    const testOrder = [
        'Notifications 通知',
        'Balance records 余额记录',
        'Account & Security 账户安全',
        'Gifts 礼物',
        'Coupons 优惠券',
        'Settings 设置'
    ];

    for (const tabName of testOrder) {
        console.log(`\n🎯 开始测试: ${tabName}`);
        await openMenu(page, testCase);
        await menuModule.runTabCases(tabName);
    }
});

// ========================================
// 示例 6: 错误处理和重试
// ========================================
test('示例6: 错误处理和重试', async ({ page }) => {
    const testCase = new TestCase(page);
    const auth = new AuthHelper(page, testCase);

    await auth.login({
        mobile: '1234567890',
        password: '123456'
    });

    const menuModule = createMenuModule(testCase);
    await registerMenuCases(menuModule);

    // 尝试执行用例，如果失败则重试
    const maxRetries = 3;
    let success = false;

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`\n🔄 第 ${i + 1} 次尝试...`);
            await menuModule.runTabCases('Notifications 通知');
            success = true;
            break;
        } catch (error) {
            console.log(`❌ 第 ${i + 1} 次尝试失败: ${error.message}`);
            if (i < maxRetries - 1) {
                console.log('⏳ 等待 2 秒后重试...');
                await page.waitForTimeout(2000);
                // 重新打开 Menu
                await openMenu(page, testCase);
            }
        }
    }

    if (!success) {
        throw new Error('所有重试都失败了');
    }

    console.log('✅ 测试成功完成');
});

// ========================================
// 示例 7: 并行测试多个功能（不推荐，仅作演示）
// ========================================
test.describe.parallel('示例7: 并行测试', () => {
    test('测试通知', async ({ page }) => {
        const testCase = new TestCase(page);
        const auth = new AuthHelper(page, testCase);
        await auth.login({ mobile: '1234567890', password: '123456' });

        const menuModule = createMenuModule(testCase);
        await registerMenuCases(menuModule);
        await menuModule.runTabCases('Notifications 通知');
    });

    test('测试余额记录', async ({ page }) => {
        const testCase = new TestCase(page);
        const auth = new AuthHelper(page, testCase);
        await auth.login({ mobile: '1234567890', password: '123456' });

        const menuModule = createMenuModule(testCase);
        await registerMenuCases(menuModule);
        await menuModule.runTabCases('Balance records 余额记录');
    });

    test('测试账户安全', async ({ page }) => {
        const testCase = new TestCase(page);
        const auth = new AuthHelper(page, testCase);
        await auth.login({ mobile: '1234567890', password: '123456' });

        const menuModule = createMenuModule(testCase);
        await registerMenuCases(menuModule);
        await menuModule.runTabCases('Account & Security 账户安全');
    });
});
