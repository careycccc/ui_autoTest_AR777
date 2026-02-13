import { turntablePlay, rotateTurntable, clickCashOut } from '../turntable/turntable-index.js';


/**
 * 邀请转盘 - 子用例模块
 */

/**
 * 注册邀请转盘的所有子用例
 * @param {Object} runner - TestRunner 实例
 */
export function registerTurntableCases(runner) {
    // 🔥 新方案：将"邀请转盘页面加载"作为独立用例，可以采集性能和API数据
    runner.registerCase('邀请转盘', '转盘页面加载', async (page, auth, test) => {
        // 🔥 这个用例只负责验证页面加载和Canvas渲染
        console.log('        🎯 开始验证转盘页面加载...');

        // 🔥 步骤0: 验证当前是否在转盘页面
        const currentUrl = page.url();
        console.log(`        📍 当前 URL: ${currentUrl}`);

        if (currentUrl.includes('/activity') && !currentUrl.includes('/turntable')) {
            console.log('        ❌ 页面已被重定向回活动页');
            console.log('        ⚠️ 可能原因: 账号未开启转盘活动或活动已结束');
            auth.turntablePageFailed = true;
            throw new Error('转盘页面被重定向，账号可能未开启转盘活动');
        }

        if (!currentUrl.includes('/turntable')) {
            console.log('        ❌ 当前不在转盘页面');
            auth.turntablePageFailed = true;
            throw new Error(`当前页面不是转盘页面: ${currentUrl}`);
        }

        console.log('        ✅ 确认在转盘页面');

        // 🔥 步骤1: 智能识别页面状态并处理
        const initResult = await turntablePlay(page, test, auth);

        if (!initResult.success) {
            console.log('        ❌ 转盘初始化失败:', initResult.error);
            auth.turntablePageFailed = true;
            throw new Error(`转盘初始化失败: ${initResult.error}`);
        }

        console.log(`        ✅ 转盘初始化成功 (状态: ${initResult.state})`);
        if (initResult.giftSelected) {
            console.log('        🎁 本次测试已选择礼物');
        }

        // 🔥 步骤2: 增强的 Canvas 验证（多种方式）
        console.log('        🔍 开始验证 Canvas 加载...');

        // 方式1: 检查 Canvas 元素是否存在于 DOM
        const canvasCount = await page.locator('#turntable_canvas canvas').count();
        console.log(`        📊 Canvas 元素数量: ${canvasCount}`);

        if (canvasCount === 0) {
            console.log('        ❌ Canvas 元素不存在于 DOM');
            auth.turntablePageFailed = true;

            await page.screenshot({
                path: `reports/screenshots/turntable-canvas-not-found-${Date.now()}.png`
            }).catch(() => { });

            throw new Error('转盘 Canvas 元素不存在');
        }

        // 方式2: 检查 Canvas 的实际尺寸和可见性
        const canvasInfo = await page.evaluate(() => {
            const canvas = document.querySelector('#turntable_canvas canvas');
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            const parent = canvas.parentElement;
            const parentStyle = parent ? window.getComputedStyle(parent) : null;

            return {
                width: canvas.width,
                height: canvas.height,
                displayWidth: rect.width,
                displayHeight: rect.height,
                rectTop: rect.top,
                rectLeft: rect.left,
                isInViewport: rect.width > 0 && rect.height > 0 && rect.top >= 0,
                hasParent: !!parent,
                parentDisplay: parentStyle ? parentStyle.display : null,
                parentVisibility: parentStyle ? parentStyle.visibility : null,
                parentOpacity: parentStyle ? parentStyle.opacity : null
            };
        }).catch(() => null);

        if (canvasInfo) {
            console.log(`        📊 Canvas 信息:`);
            console.log(`           尺寸: ${canvasInfo.width}x${canvasInfo.height}`);
            console.log(`           显示尺寸: ${canvasInfo.displayWidth}x${canvasInfo.displayHeight}`);
            console.log(`           位置: (${canvasInfo.rectLeft}, ${canvasInfo.rectTop})`);
            console.log(`           父元素显示: ${canvasInfo.parentDisplay}`);
            console.log(`           父元素可见性: ${canvasInfo.parentVisibility}`);
            console.log(`           父元素透明度: ${canvasInfo.parentOpacity}`);

            // 如果 Canvas 有尺寸，就认为加载成功
            if (canvasInfo.width > 0 && canvasInfo.height > 0) {
                console.log('        ✅ Canvas 已加载（通过尺寸验证）');
                auth.turntablePageFailed = false;
                auth.turntableInitialized = true;
                console.log('        ✅ 转盘页面加载完成');
                return;
            }
        }

        // 如果尺寸验证失败，尝试等待可见性
        console.log('        ⏳ 尝试等待 Canvas 可见...');
        const canvas = page.locator('#turntable_canvas canvas');
        const canvasVisible = await canvas.isVisible({ timeout: 3000 }).catch(() => false);

        if (canvasVisible) {
            console.log('        ✅ Canvas 可见');
            auth.turntablePageFailed = false;
            auth.turntableInitialized = true;
            console.log('        ✅ 转盘页面加载完成');
            return;
        }

        // 所有验证都失败
        console.log('        ❌ 转盘 Canvas 未正确加载');
        auth.turntablePageFailed = true;

        // 截图
        try {
            await page.screenshot({
                path: `reports/screenshots/turntable-canvas-not-loaded-${Date.now()}.png`
            });
            console.log('        📸 已截取错误截图');
        } catch (e) {
            console.log('        ⚠️ 截图失败:', e.message);
        }

        throw new Error('转盘 Canvas 未正确加载');
    }, {
        timeout: 30000
    });

    // 检查转盘可以正常旋转或 CASH OUT
    runner.registerCase('邀请转盘', '转盘旋转功能', async (page, auth, test) => {
        // 🔥 检查转盘页面是否加载失败
        if (auth.turntablePageFailed) {
            console.log('        ⚠️ 转盘页面加载失败，跳过当前用例');
            return;
        }

        // 如果还没初始化，先执行初始化
        if (!auth.turntableInitialized) {
            console.log('        🎯 执行转盘初始化前置步骤...');
            await turntablePlay(page, test, auth);
            auth.turntableInitialized = true;
        }

        // 尝试旋转
        const rotateResult = await rotateTurntable(page, test);

        // 如果提示应该 CASH OUT，则点击 CASH OUT
        if (!rotateResult.success && rotateResult.error?.includes('应该点击 CASH OUT')) {
            console.log('        💰 检测到应该 CASH OUT，执行点击...');
            const cashOutResult = await clickCashOut(page, test);
            if (cashOutResult.success) {
                console.log('        ✅ CASH OUT 成功');
            } else {
                console.log('        ❌ CASH OUT 失败:', cashOutResult.error);
            }
        } else if (rotateResult.success) {
            console.log('        ✅ 转盘旋转成功');
        } else {
            console.log('        ⚠️ 转盘操作:', rotateResult.error);
        }
    }, {
        timeout: 60000
    });
}
