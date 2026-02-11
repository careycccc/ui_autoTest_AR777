/**
 * 活动资讯 - 子用例模块
 */
import { verifyActivelist } from './promo.js';

/**
 * 注册活动资讯的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerPromoCases(runner) {
    // 检查活动资讯有没有活动
    runner.registerCase('活动资讯', '检查活动资讯有没有活动', verifyActivelist);
}
