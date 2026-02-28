/**
 * Menu 菜单模块 - 主入口
 * Menu Module - Main Entry
 * 
 * Menu 是一个导航中心，包含多个功能入口
 * 每个功能都会跳转到独立的页面，并有自己的子功能
 */

import { testModule } from '../../src/core/TestModle.js';

/**
 * 创建 Menu 模块
 * @param {TestCase} test - TestCase 实例
 * @returns {testModule} 返回 Menu 模块实例
 */
export function createMenuModule(test) {
    const menuModule = new testModule(test, 'Menu 菜单');

    // ========================================
    // 注册 Tab：Menu 页面本身
    // ========================================
    menuModule.registerTab('Menu 页面', {
        selector: '#menu',
        switchPage: true,
        pageName: 'Menu 页面',
        waitForSelector: '.menu-content, .uid',
        waitTime: 1000,
        collectPreviousPage: true
    });

    // ========================================
    // 注册 Tab：Menu 中的各个功能入口
    // 这些功能会跳转到独立的页面
    // ========================================

    // 1. Deposit (充值) - 跳转到钱包模块
    menuModule.registerTab('Deposit 充值', {
        selector: 'text=Deposit',
        switchPage: true,
        pageName: 'Deposit 充值页面',
        waitForSelector: 'text=Recharge, text=Deposit',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 2. Withdraw (提现) - 跳转到钱包模块
    menuModule.registerTab('Withdraw 提现', {
        selector: 'text=Withdraw',
        switchPage: true,
        pageName: 'Withdraw 提现页面',
        waitForSelector: 'text=Withdraw',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 3. Notifications (通知)
    menuModule.registerTab('Notifications 通知', {
        selector: 'text=Notifications',
        switchPage: true,
        pageName: 'Notifications 通知页面',
        waitForSelector: 'text=Notifications',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 4. Balance records (余额记录)
    menuModule.registerTab('Balance records 余额记录', {
        selector: 'text=Balance records',
        switchPage: true,
        pageName: 'Balance records 余额记录页面',
        waitForSelector: 'text=Balance, text=Records',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 5. Account & Security (账户与安全)
    menuModule.registerTab('Account & Security 账户安全', {
        selector: 'text=Account & Security',
        switchPage: true,
        pageName: 'Account & Security 账户安全页面',
        waitForSelector: 'text=Account, text=Security',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 6. Live Support (在线客服)
    menuModule.registerTab('Live Support 在线客服', {
        selector: 'text=Live Support',
        switchPage: true,
        pageName: 'Live Support 在线客服页面',
        waitForSelector: 'text=Support, text=Chat',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 7. Ranking (排行榜)
    menuModule.registerTab('Ranking 排行榜', {
        selector: 'text=Ranking',
        switchPage: true,
        pageName: 'Ranking 排行榜页面',
        waitForSelector: 'text=Ranking, text=Leaderboard',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 8. Gifts (礼物)
    menuModule.registerTab('Gifts 礼物', {
        selector: 'text=Gifts',
        switchPage: true,
        pageName: 'Gifts 礼物页面',
        waitForSelector: 'text=Gifts, text=Rewards',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 9. Coupons (优惠券)
    menuModule.registerTab('Coupons 优惠券', {
        selector: 'text=Coupons',
        switchPage: true,
        pageName: 'Coupons 优惠券页面',
        waitForSelector: 'text=Coupons',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 10. Settings (设置)
    menuModule.registerTab('Settings 设置', {
        selector: 'text=Settings',
        switchPage: true,
        pageName: 'Settings 设置页面',
        waitForSelector: 'text=Settings',
        waitTime: 2000,
        collectPreviousPage: true
    });

    // 11. Logout (登出) - 不跳转页面，只是操作
    menuModule.registerTab('Logout 登出', {
        selector: 'text=Logout',
        switchPage: false,  // 不跳转页面
        pageName: null,
        waitTime: 1000
    });

    return menuModule;
}

/**
 * 注册 Menu 模块的所有用例
 * @param {TestModle} menuModule - Menu 模块实例
 */
export async function registerMenuCases(menuModule) {
    // 导入各个子模块的用例注册函数
    const { registerMenuBasicCases } = await import('./menu-cases.js');
    const { registerNotificationsCases } = await import('./notifications/notifications-index.js');
    const { registerBalanceRecordsCases } = await import('./balance-records/balance-records-index.js');
    const { registerAccountSecurityCases } = await import('./account-security/account-security-index.js');
    const { registerLiveSupportCases } = await import('./live-support/live-support-index.js');
    const { registerRankingCases } = await import('./ranking/ranking-index.js');
    const { registerGiftsCases } = await import('./gifts/gifts-index.js');
    const { registerCouponsCases } = await import('./coupons/coupons-index.js');
    const { registerSettingsCases } = await import('./settings/settings-index.js');

    // 🔥 导入充值和提现模块的用例注册函数
    const { registerRechargeCases } = await import('./recharge/recharge-index.js');
    const { registerWithdrawCases } = await import('./withdraw/withdraw-index.js');

    // 注册 Menu 页面本身的用例
    await registerMenuBasicCases(menuModule);

    // 🔥 注册充值和提现用例（作为 Menu 的子用例）
    await registerRechargeCases(menuModule);
    await registerWithdrawCases(menuModule);

    // 注册各个子功能的用例
    await registerNotificationsCases(menuModule);
    await registerBalanceRecordsCases(menuModule);
    await registerAccountSecurityCases(menuModule);
    await registerLiveSupportCases(menuModule);
    await registerRankingCases(menuModule);
    await registerGiftsCases(menuModule);
    await registerCouponsCases(menuModule);
    await registerSettingsCases(menuModule);
}

/**
 * 快速导航：打开 Menu
 * @param {Page} page - Playwright page 对象
 * @param {TestCase} test - TestCase 实例
 * @returns {Promise<boolean>} 返回是否成功
 */
export async function openMenu(page, test) {
    console.log('    🎯 打开 Menu...');

    try {
        await page.locator('#menu').click();
        await page.waitForTimeout(1000);

        const success = await test.switchToPage('Menu 页面', {
            waitForSelector: '.menu-content, .uid',
            waitTime: 1000
        });

        if (success) {
            console.log('    ✅ Menu 已打开');
            return true;
        }

        return false;

    } catch (error) {
        console.log(`    ❌ 打开 Menu 失败: ${error.message}`);
        return false;
    }
}

/**
 * 关闭 Menu
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<boolean>} 返回是否成功
 */
export async function closeMenu(page) {
    console.log('    🎯 关闭 Menu...');

    try {
        // 尝试多种关闭方式
        const closeSelectors = [
            '.close-btn',
            'button:has-text("Close")',
            '.menu-overlay',
            '.mask'
        ];

        for (const selector of closeSelectors) {
            const element = page.locator(selector).first();
            const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);

            if (isVisible) {
                await element.click();
                await page.waitForTimeout(500);
                console.log('    ✅ Menu 已关闭');
                return true;
            }
        }

        // 如果没有找到关闭按钮，尝试按 ESC 键
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        console.log('    ✅ Menu 已关闭 (ESC)');
        return true;

    } catch (error) {
        console.log(`    ❌ 关闭 Menu 失败: ${error.message}`);
        return false;
    }
}
