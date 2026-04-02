/**
 * 活动资讯 - 增强版子用例模块
 * 解决活动列表在处理过程中消失的问题
 */
import { verifyActivelist, verifyActivityApiConsistency } from './promo.js';
import { verifyAllActivitiesEnhanced } from './promo-enhanced.js';

/**
 * 注册活动资讯的所有子用例（增强版）
 * @param {Object} runner - TestRunner 实例
 */
export function registerPromoCasesEnhanced(runner) {
    // 检查活动资讯有没有活动
    runner.registerCase('活动资讯', '检查活动资讯有没有活动', verifyActivelist);

    // 验证活动资讯接口与页面一致性
    runner.registerCase('活动资讯', '验证活动资讯接口与页面一致性', verifyActivityApiConsistency);

    // 🔥 增强版：验证各个活动资讯活动（解决活动列表消失问题）
    runner.registerCase('活动资讯', '验证各个活动资讯活动（增强版）', verifyAllActivitiesEnhanced);
}
