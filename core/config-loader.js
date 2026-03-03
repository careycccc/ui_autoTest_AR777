// ============================================================
// 配置加载器
// 负责读取指定版面的 YAML 配置文件
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 动态导入 js-yaml
let yaml;
async function loadYaml() {
    if (!yaml) {
        const jsYaml = await import('js-yaml');
        yaml = jsYaml.default;
    }
    return yaml;
}

export class ConfigLoader {
    constructor(brandName) {
        this.brandName = brandName;
        this.config = null;
    }

    async load() {
        const yamlLib = await loadYaml();
        const configPath = resolve(__dirname, '..', 'configs', `${this.brandName}.yaml`);

        if (!existsSync(configPath)) {
            throw new Error(
                `配置文件不存在: ${configPath}\n请先创建 configs/${this.brandName}.yaml`
            );
        }

        const raw = readFileSync(configPath, 'utf8');
        this.config = yamlLib.load(raw);
        return this.config;
    }

    /** 获取项目基本信息 */
    getProjectInfo() {
        return this.config.project;
    }

    /** 获取 baseURL */
    getBaseURL() {
        return this.config.project.base_url;
    }

    /** 获取登录配置 */
    getLoginConfig() {
        return this.config.login;
    }

    /** 获取功能路由表 */
    getFeatureMap() {
        return this.config.feature_map || {};
    }

    /** 获取某个功能的路由配置 */
    getFeatureConfig(featureName) {
        const map = this.getFeatureMap();
        return map[featureName] || null;
    }

    /** 获取导航配置 */
    getNavigationConfig(pageName) {
        const nav = this.config.navigation || {};
        return nav[pageName] || null;
    }

    /** 获取全部导航配置 */
    getAllNavigationConfig() {
        return this.config.navigation || {};
    }

    /** 检查功能是否启用 */
    isFeatureEnabled(featureName) {
        const enabled = this.config.enabled_features || [];
        return enabled.includes(featureName);
    }

    /** 获取启用的功能列表 */
    getEnabledFeatures() {
        return this.config.enabled_features || [];
    }

    /** 获取额外配置 */
    getExtra(key) {
        const extra = this.config.extra || {};
        return key ? extra[key] : extra;
    }

    /** 获取设备配置 */
    getDevice() {
        return this.getExtra('device') || 'iphone14';
    }
}
