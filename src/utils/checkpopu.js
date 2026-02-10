// src/utils/checkpopu.js
import { AuthHelper } from './auth.js';

/**
 * 专门处理首页的各种定制化弹窗（向后兼容入口）
 *
 *  推荐直接使用 AuthHelper，登录流程已内置弹窗处理
 *    此文件保留供不走登录流程的场景单独调用
 *
 * @param {*} test - testCase 实例
 */
export async function checkpopu(test) {
    const auth = new AuthHelper(test);
    await auth.handlePostLoginPopups();
}