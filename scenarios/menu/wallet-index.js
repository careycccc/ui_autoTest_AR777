/**
 * 钱包功能模块 - 主入口
 * Wallet Module - Main Entry
 * 
 * 统一管理提现、充值等钱包相关功能
 * 作为独立的功能模块，可以从多个入口访问
 */

import { testModule } from '../../src/core/TestModle.js';

/**
 * 创建钱包功能模块
 * @param {TestCase} test - TestCase 实例
 * @returns {testModule} 返回钱包模块实例
 */
export function createWalletModule(test) {
    const walletModule = new testModule(test, '钱包功能');

    // ========================================
    // 注册 Tab：钱包功能的入口页面
    // ========================================

    // Tab 1: 提现页面（从 Menu 进入）
    walletModule.registerTab('提现页面', {
        selector: '.menu-item:has-text("Withdraw")',
        switchPage: true,
        pageName: '提现页面',
        waitForSelector: 'text=Withdraw',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // Tab 2: 充值页面（从 Menu 进入）
    walletModule.registerTab('充值页面', {
        selector: '.menu-item:has-text("Recharge")',
        switchPage: true,
        pageName: '充值页面',
        waitForSelector: 'text=Recharge',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // Tab 3: 钱包历史（从 Menu 进入）
    walletModule.registerTab('钱包历史', {
        selector: '.menu-item:has-text("Wallet History")',
        switchPage: true,
        pageName: '钱包历史页面',
        waitForSelector: 'text=Transaction History',
        waitTime: 2000,
        collectPreviousPage: true
    });

    return walletModule;
}

/**
 * 注册钱包功能的所有用例
 * @param {TestModle} walletModule - 钱包模块实例
 */
export async function registerWalletCases(walletModule) {
    // 动态导入用例定义
    const { registerWithdrawCases } = await import('../menu/withdraw/withdraw-index.js');
    const { registerRechargeCases } = await import('../menu/recharge/recharge-index.js');

    // 注册提现相关用例
    await registerWithdrawCases(walletModule);

    // 注册充值相关用例
    await registerRechargeCases(walletModule);
}

/**
 * 快速访问：从任意页面进入提现页面
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - AuthHelper 实例
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} 返回是否成功进入
 */
export async function navigateToWithdraw(page, auth, test, options = {}) {
    const { fromMenu = true } = options;

    console.log('    🎯 导航到提现页面...');

    try {
        if (fromMenu) {
            // 从 Menu 进入
            console.log('    📍 从 Menu 进入提现页面');

            // 点击 Menu
            await page.locator('#menu').click();
            await page.waitForTimeout(1000);

            // 切换到 Menu 页面
            await test.switchToPage('Menu 页面', {
                waitForSelector: '.menu-content',
                waitTime: 1000
            });

            // 点击 Withdraw
            await page.locator('.menu-item:has-text("Withdraw")').click();
            await page.waitForTimeout(1000);

            // 切换到提现页面
            const success = await test.switchToPage('提现页面', {
                waitForSelector: 'text=Withdraw',
                waitTime: 2000,
                collectPreviousPage: true
            });

            if (success) {
                console.log('    ✅ 成功进入提现页面');
                return true;
            }
        }

        return false;

    } catch (error) {
        console.log(`    ❌ 导航到提现页面失败: ${error.message}`);
        return false;
    }
}

/**
 * 快速访问：从任意页面进入充值页面
 * @param {Page} page - Playwright page 对象
 * @param {Object} auth - AuthHelper 实例
 * @param {TestCase} test - TestCase 实例
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} 返回是否成功进入
 */
export async function navigateToRecharge(page, auth, test, options = {}) {
    const { fromMenu = true, fromHome = false } = options;

    console.log('    🎯 导航到充值页面...');

    try {
        if (fromHome) {
            // 从首页充值按钮进入
            console.log('    📍 从首页进入充值页面');
            await page.locator('.recharge-btn, button:has-text("Recharge")').first().click();
            await page.waitForTimeout(1000);
        } else if (fromMenu) {
            // 从 Menu 进入
            console.log('    📍 从 Menu 进入充值页面');

            await page.locator('#menu').click();
            await page.waitForTimeout(1000);

            await test.switchToPage('Menu 页面', {
                waitForSelector: '.menu-content',
                waitTime: 1000
            });

            await page.locator('.menu-item:has-text("Recharge")').click();
            await page.waitForTimeout(1000);
        }

        // 切换到充值页面
        const success = await test.switchToPage('充值页面', {
            waitForSelector: 'text=Recharge',
            waitTime: 2000,
            collectPreviousPage: true
        });

        if (success) {
            console.log('    ✅ 成功进入充值页面');
            return true;
        }

        return false;

    } catch (error) {
        console.log(`    ❌ 导航到充值页面失败: ${error.message}`);
        return false;
    }
}
