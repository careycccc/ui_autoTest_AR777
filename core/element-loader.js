// ============================================================
// 元素定位加载器
// 负责读取指定版面的所有元素定位 YAML 文件
// 提供统一的 getSelector(elementKey) 接口
// ============================================================

import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

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

export class ElementLoader {
    constructor(brandName) {
        this.brandName = brandName;
        this.elements = {};
    }

    /**
     * 加载该版面 elements/ 目录下的所有 YAML 文件
     */
    async loadAll() {
        const yamlLib = await loadYaml();
        const elemDir = resolve(__dirname, '..', 'elements', this.brandName);

        if (!existsSync(elemDir)) {
            throw new Error(
                `元素定位目录不存在: ${elemDir}\n请先创建 elements/${this.brandName}/ 目录及其 YAML 文件`
            );
        }

        const files = readdirSync(elemDir).filter(
            f => f.endsWith('.yaml') || f.endsWith('.yml')
        );

        for (const file of files) {
            const filePath = join(elemDir, file);
            const raw = readFileSync(filePath, 'utf8');
            const data = yamlLib.load(raw);

            if (data && typeof data === 'object') {
                // 合并所有文件的元素到一个大对象
                Object.assign(this.elements, data);
            }
        }

        return this.elements;
    }

    /**
     * 获取元素的主 selector
     * @param {string} elementKey - 元素的 key，如 "login_btn"
     * @returns {string} CSS/Playwright selector
     */
    getSelector(elementKey) {
        const el = this.elements[elementKey];

        if (!el) {
            throw new Error(
                `元素 "${elementKey}" 在版面 "${this.brandName}" 中未找到\n` +
                `请检查 elements/${this.brandName}/ 下的 YAML 文件`
            );
        }

        return el.selector || el.backup;
    }

    /**
     * 获取备用 selector（当主 selector 找不到时用）
     */
    getBackupSelector(elementKey) {
        const el = this.elements[elementKey];
        return el ? el.backup : null;
    }

    /**
     * 在 page 上查找元素，自动尝试主 selector 和备用 selector
     * @param {import('@playwright/test').Page} page
     * @param {string} elementKey
     * @returns {import('@playwright/test').Locator}
     */
    locate(page, elementKey) {
        const primary = this.getSelector(elementKey);
        return page.locator(primary);
    }

    /**
     * 智能查找：先试主selector，失败则试备用
     */
    async smartLocate(page, elementKey, options = {}) {
        const { timeout = 5000 } = options;
        const primary = this.getSelector(elementKey);
        const backup = this.getBackupSelector(elementKey);

        try {
            const loc = page.locator(primary);
            await loc.waitFor({ state: 'visible', timeout });
            return loc;
        } catch {
            if (backup) {
                const backupLoc = page.locator(backup);
                await backupLoc.waitFor({ state: 'visible', timeout });
                return backupLoc;
            }
            throw new Error(`元素 "${elementKey}" 主备 selector 均未找到`);
        }
    }

    /**
     * 检查某个元素 key 是否已定义
     */
    has(elementKey) {
        return !!this.elements[elementKey];
    }

    /**
     * 获取元素描述
     */
    getDescription(elementKey) {
        const el = this.elements[elementKey];
        return el ? el.description : '';
    }
}
