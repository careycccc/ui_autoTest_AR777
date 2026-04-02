/**
 * 子用例统一注册入口
 * 
 * 这个文件负责导入所有大类的子用例模块，并提供统一的注册接口
 */

import { registerPromoCases } from './promo/promo-cases.js';
import { registerPromoCasesEnhanced } from './promo/promo-cases-enhanced.js';
import { registerEarnCases } from './earn/earn-cases.js';
import { registerMenuCases } from './menu/menu-index.js';
import { registerTurntableCases } from './turntable/turntable-cases.js';
import { registerHomeCases } from './home/home-cases.js';
import { registerDepositCases } from './deposit/deposit-cases.js';

/**
 * 注册所有子用例
 * @param {Object} runner - TestRunner 实例
 * @param {Object} options - 可选配置
 * @param {Array<string>} options.only - 只注册指定的大类，例如 ['活动资讯', '新版返佣']
 * @param {Array<string>} options.exclude - 排除指定的大类
 * @param {boolean} options.useEnhanced - 是否使用增强版的活动资讯验证（默认 false）
 */
export function registerAllCases(runner, options = {}) {
    const { only = null, exclude = [], useEnhanced = false } = options;

    // 所有可用的大类及其注册函数
    const categories = {
        '活动资讯': useEnhanced ? registerPromoCasesEnhanced : registerPromoCases,
        '新版返佣': registerEarnCases,
        '菜单': registerMenuCases,
        '邀请转盘': registerTurntableCases,
        '家': registerHomeCases,
        '充值': registerDepositCases
    };

    // 确定要注册的大类
    let categoriesToRegister = only || Object.keys(categories);

    // 排除指定的大类
    if (exclude.length > 0) {
        categoriesToRegister = categoriesToRegister.filter(cat => !exclude.includes(cat));
    }

    // 注册子用例
    console.log(`\n📋 注册子用例: ${categoriesToRegister.join(', ')}`);

    categoriesToRegister.forEach(category => {
        const registerFn = categories[category];
        if (registerFn) {
            registerFn(runner);
            console.log(`   ✓ ${category}`);
        } else {
            console.warn(`   ⚠️ 未找到 "${category}" 的注册函数`);
        }
    });

    console.log('');
}

/**
 * 按大类单独注册子用例
 */
export {
    registerPromoCases,
    registerPromoCasesEnhanced,
    registerEarnCases,
    registerMenuCases,
    registerTurntableCases,
    registerHomeCases,
    registerDepositCases
};
