// src/utils/hooks.js
import { AuthHelper } from './auth.js';
import { dataConfig } from '../../config.js';

export class TestHooks {
    constructor(testCase) {
        this.t = testCase;
        this.auth = new AuthHelper(testCase);
    }

    setupNetworkFilter(filters = null) {
        const defaultFilters = [
            /^https:\/\/arplatsaassit4\.club\/api\/.*/i,
            /\/api\//i
        ];
        this.t.setNetworkFilter(filters || defaultFilters);
    }

    /**
     * 标准前置处理
     * 产生页面：首页 → 登录页 → 登录成功页（弹窗已自动清理）
     *
     * 完成后：页面处于干净的已登录首页状态 ✅
     */
    async standardSetup(options = {}) {
        const { needLogin = true, networkFilters = null } = options;

        this.setupNetworkFilter(networkFilters);

        if (needLogin) {
            // login() 内部已包含弹窗处理，无需额外调用
            const success = await this.auth.login();
            if (!success) throw new Error('登录失败');
        }

        return this.auth;
    }

    /**
     * 只访问首页（不登录）
     */
    async gotoHomePageOnly() {
        this.setupNetworkFilter();
        await this.t.goto(dataConfig.url, { pageName: '首页' });
        await this.auth.handlePopups();
    }

    /**
     * 完成当前页面
     */
    async finishCurrentPage() {
        await this.t.finishCurrentPage(true);
    }
}