/**
 * 🔍 项目级通用元素查找器 (element-finder.js)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 查 找 优 先 级（充分发挥 Playwright 优势）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1️⃣  role        → getByRole()            ARIA 语义角色（最稳定、最语义化）
 * 2️⃣  text        → getByText()            用户可见文字
 * 2️⃣  label       → getByLabel()           表单 label 关联（与 text 同级）
 * 3️⃣  placeholder → getByPlaceholder()     输入框占位符
 * 3️⃣  altText     → getByAltText()         图片 alt（与 placeholder 同级）
 * 4️⃣  testId      → getByTestId()          data-testid 属性
 * 5️⃣  selector    → locator(css/xpath)     CSS / XPath（最后手段）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 查 找 范 围（容器 → 全局 → 重试）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Step 1  在 contextSelector 容器内按优先级查找
 * Step 2  找不到 → 升级到整个页面按优先级查找
 * Step 3  还是没有 → 等 3s 后完整重试（Step 1 + 2）
 * Step 4  两次都失败 → 截图 + 抛出 Error
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 使 用 示 例
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * import { findElement, elementExists } from '../../src/utils/element-finder.js';
 *
 * // 1️⃣ 文字定位（先在 .sheet-mask 内，找不到再全局）
 * const btn = await findElement(page, test, {
 *     text: 'Enable Now & Claim',
 *     contextSelector: '.sheet-mask'
 * });
 *
 * // 2️⃣ ARIA 角色定位
 * const dialog = await findElement(page, test, {
 *     role: 'dialog',
 *     roleOptions: { name: 'Enable Notifications' }
 * });
 *
 * // 3️⃣ 组合定位：CSS + 文字过滤
 * const panel = await findElement(page, test, {
 *     selector: '.sheet-panel',
 *     filterText: 'Enable Notifications',
 *     contextSelector: '.sheet-mask'
 * });
 *
 * // 4️⃣ 仅检查存在性，不抛错，返回 boolean
 * const exists = await elementExists(page, {
 *     text: 'Enable Notifications',
 *     contextSelector: '.sheet-mask',
 *     timeout: 3000
 * });
 */

// ─────────────────────────────────────────────────────────────────────────────
// 主函数：findElement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 🔥 通用元素查找函数 - 项目级标准
 *
 * @param {import('@playwright/test').Page} page         - Playwright page
 * @param {Object} test                                  - TestCase 实例（用于截图）
 * @param {Object} descriptor                            - 元素描述符（见下）
 *
 * descriptor 字段（按优先级顺序尝试，可组合使用）：
 * @param {string}  [descriptor.text]            ① 文字内容（getByText）
 * @param {boolean} [descriptor.exactText=false] ① text 是否精确匹配
 * @param {string}  [descriptor.role]            ② ARIA 角色（getByRole）如 'button','dialog'
 * @param {Object}  [descriptor.roleOptions]     ② getByRole 选项，如 { name: 'Submit' }
 * @param {string}  [descriptor.label]           ③ 关联 label 文字（getByLabel）
 * @param {string}  [descriptor.placeholder]     ④ input placeholder（getByPlaceholder）
 * @param {string}  [descriptor.altText]         ⑤ img alt 文字（getByAltText）
 * @param {string}  [descriptor.testId]          ⑥ data-testid 属性（getByTestId）
 * @param {string}  [descriptor.selector]        ⑦ CSS / XPath 选择器（locator）
 * @param {string}  [descriptor.filterText]      配合 selector/role 等做二次文字过滤
 * @param {string}  [descriptor.contextSelector] 优先搜索的容器 CSS 选择器
 * @param {number}  [descriptor.timeout=3000]    单次策略的等待超时 ms
 * @param {boolean} [descriptor.mustVisible=true] 是否要求元素可见
 *
 * @returns {Promise<import('@playwright/test').Locator>} 找到的 Locator
 * @throws  {Error} 两次查找都失败时抛出（并自动截图）
 */
export async function findElement(page, test, descriptor) {
    const label = _describeLabel(descriptor);
    console.log(`      🔍 [findElement] 查找: ${label}`);

    // ── 单次完整查找（容器 → 全局）────────────────────────────────────────
    async function attemptFind() {
        const { contextSelector } = descriptor;

        // Step 1: 容器内查找
        if (contextSelector) {
            console.log(`      🔍 [findElement] 在容器 "${contextSelector}" 内查找...`);
            const found = await _searchInRoot(
                page.locator(contextSelector).first(),
                descriptor
            );
            if (found) {
                console.log(`      ✅ [findElement] 容器内找到: ${label}`);
                return found;
            }
            console.log(`      ⚠️  [findElement] 容器内未找到，升级到全局...`);
        }

        // Step 2: 全局页面查找
        console.log(`      🔍 [findElement] 全局页面查找...`);
        const found = await _searchInRoot(page, descriptor);
        if (found) {
            console.log(`      ✅ [findElement] 全局找到: ${label}`);
            return found;
        }

        return null;
    }

    // ── 第一次查找 ─────────────────────────────────────────────────────────
    let result = await attemptFind();
    if (result) return result;

    // ── 等 3s 重试 ─────────────────────────────────────────────────────────
    console.log(`      ⏳ [findElement] 第一次未找到，等待 3s 后重试...`);
    await page.waitForTimeout(3000);

    result = await attemptFind();
    if (result) return result;

    // ── 两次失败，截图报错 ──────────────────────────────────────────────────
    console.log(`      ❌ [findElement] 两次查找均失败，整个页面都未找到: ${label}`);
    const screenshotName = `element-not-found-${label.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}`;
    await test.captureScreenshot(screenshotName);
    throw new Error(`[findElement] 整个页面均未找到元素: ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 快捷检测：elementExists（不抛错，返回 boolean）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 🔥 检测元素是否存在（不抛错）
 * 同样遵循优先级 text → role → label → placeholder → altText → testId → selector
 * 同样先容器后全局（无重试）
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} descriptor - 同 findElement 的 descriptor
 * @returns {Promise<boolean>}
 */
export async function elementExists(page, descriptor) {
    const { contextSelector } = descriptor;

    // 容器内
    if (contextSelector) {
        const found = await _searchInRoot(
            page.locator(contextSelector).first(),
            descriptor
        );
        if (found) return true;
    }

    // 全局
    const found = await _searchInRoot(page, descriptor);
    return !!found;
}

// ─────────────────────────────────────────────────────────────────────────────
// 私有：在指定 root 内按优先级顺序查找
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} root
 * @param {Object} descriptor
 * @returns {Promise<import('@playwright/test').Locator | null>}
 * @private
 */
async function _searchInRoot(root, descriptor) {
    const {
        text,
        exactText = false,
        role,
        roleOptions = {},
        label,
        placeholder,
        altText,
        testId,
        selector,
        filterText,
        timeout = 3000,
        mustVisible = true
    } = descriptor;

    // 按优先级依次尝试
    const strategies = [
        // 1️⃣ ARIA 角色（最稳定、最语义化）
        role && (() => root.getByRole(role, roleOptions)),

        // 2️⃣ 文字 / Label（同级，用户可见内容）
        text  && (() => root.getByText(text, { exact: exactText })),
        label && (() => root.getByLabel(label, { exact: false })),

        // 3️⃣ Placeholder / Alt Text（同级，属性内容）
        placeholder && (() => root.getByPlaceholder(placeholder, { exact: false })),
        altText     && (() => root.getByAltText(altText, { exact: false })),

        // 4️⃣ data-testid
        testId && (() => root.getByTestId(testId)),

        // 5️⃣ CSS / XPath（最后手段）
        selector && (() => root.locator(selector)),
    ].filter(Boolean);

    for (const buildLocator of strategies) {
        try {
            let locator = buildLocator();

            // 如果有 filterText 做二次过滤（适用于 role/selector 等情况）
            if (filterText && !text) {
                locator = locator.filter({ hasText: filterText });
            }

            // 取第一个匹配
            const first = locator.first();
            const ok = mustVisible
                ? await first.isVisible({ timeout }).catch(() => false)
                : await first.isAttached({ timeout: Math.min(timeout, 2000) }).catch(() => false);

            if (ok) return first;
        } catch {
            // 当前策略失败，继续下一个
        }
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 私有：生成可读的元素描述标签（用于日志）
// ─────────────────────────────────────────────────────────────────────────────
function _describeLabel(descriptor) {
    const { text, role, roleOptions, label, placeholder, altText, testId, selector, filterText, contextSelector } = descriptor;
    const parts = [];
    if (text)        parts.push(`text="${text}"`);
    if (role)        parts.push(`role="${role}"${roleOptions?.name ? `[name="${roleOptions.name}"]` : ''}`);
    if (label)       parts.push(`label="${label}"`);
    if (placeholder) parts.push(`placeholder="${placeholder}"`);
    if (altText)     parts.push(`alt="${altText}"`);
    if (testId)      parts.push(`testId="${testId}"`);
    if (selector)    parts.push(`selector="${selector}"`);
    if (filterText)  parts.push(`filter:hasText="${filterText}"`);
    if (contextSelector) parts.push(`in:"${contextSelector}"`);
    return parts.join(' + ') || '(no descriptor)';
}
