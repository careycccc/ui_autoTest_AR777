/**
 * Menu 基础用例
 * Menu Basic Test Cases
 */

/**
 * 注册 Menu 页面本身的基础用例
 * @param {TestModle} menuModule - Menu 模块实例
 */
export async function registerMenuBasicCases(menuModule) {

    // ========================================
    // 用例 1: Menu 页面加载验证
    // ========================================
    menuModule.registerCase('Menu 页面', 'Menu 页面加载验证', async (page, auth, test) => {
        console.log('      🔍 验证 Menu 页面加载...');

        // 验证用户信息区域
        const hasUserInfo = await page.locator('.uid, [class*="member"]').isVisible({ timeout: 3000 });
        if (!hasUserInfo) {
            throw new Error('用户信息区域未加载');
        }

        // 验证 VIP 信息
        const hasVipInfo = await page.locator('text=VIP').isVisible({ timeout: 3000 });
        if (!hasVipInfo) {
            console.log('      ⚠️ VIP 信息未显示');
        }

        // 验证 Deposit 和 Withdraw 按钮
        const hasDeposit = await page.locator('text=Deposit').isVisible({ timeout: 3000 });
        const hasWithdraw = await page.locator('text=Withdraw').isVisible({ timeout: 3000 });

        if (!hasDeposit || !hasWithdraw) {
            throw new Error('Deposit/Withdraw 按钮未加载');
        }

        console.log('      ✅ Menu 页面加载验证通过');
    });

    // ========================================
    // 用例 2: 获取用户信息
    // ========================================
    menuModule.registerCase('Menu 页面', '获取用户信息', async (page, auth, test) => {
        console.log('      🔍 获取用户信息...');

        // 获取 UID
        const uidText = await page.locator('.uid, [class*="uid"]')
            .textContent({ timeout: 3000 })
            .catch(() => '');

        const uidMatch = uidText.match(/uid[:\s]*(\d+)/i);
        const uid = uidMatch ? uidMatch[1] : null;

        // 获取用户名
        const usernameText = await page.locator('.username, [class*="member"]')
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => '');

        // 获取余额
        const balanceText = await page.locator('.balance, [class*="balance"]')
            .textContent({ timeout: 3000 })
            .catch(() => '');

        console.log('      📊 用户信息:');
        console.log(`         UID: ${uid || 'N/A'}`);
        console.log(`         用户名: ${usernameText.substring(0, 20) || 'N/A'}`);
        console.log(`         余额: ${balanceText || 'N/A'}`);

        console.log('      ✅ 用户信息获取完成');
    });

    // ========================================
    // 用例 3: 验证所有菜单项
    // ========================================
    menuModule.registerCase('Menu 页面', '验证所有菜单项', async (page, auth, test) => {
        console.log('      🔍 验证所有菜单项...');

        const menuItems = [
            'Deposit',
            'Withdraw',
            'Notifications',
            'Balance records',
            'Account & Security',
            'Live Support',
            'Ranking',
            'Gifts',
            'Coupons',
            'Settings',
            'Logout'
        ];

        const missingItems = [];

        for (const item of menuItems) {
            const isVisible = await page.locator(`text=${item}`)
                .isVisible({ timeout: 2000 })
                .catch(() => false);

            if (!isVisible) {
                missingItems.push(item);
                console.log(`      ⚠️ 菜单项缺失: ${item}`);
            }
        }

        if (missingItems.length > 0) {
            console.log(`      ⚠️ 共有 ${missingItems.length} 个菜单项缺失`);
        } else {
            console.log('      ✅ 所有菜单项验证通过');
        }
    });
}
