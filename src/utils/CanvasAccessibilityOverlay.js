/**
 * Canvas 无障碍层注入工具
 * 在 Canvas 上方叠加透明 DOM 层，让自动化工具能识别 Canvas 内的元素
 */

export class CanvasAccessibilityOverlay {
    constructor(page) {
        this.page = page;
        this.overlayId = '__canvas_a11y_overlay__';
    }

    /**
     * 注入无障碍覆盖层到指定 Canvas
     * @param {string} canvasSelector - Canvas 选择器
     * @param {Object} options - 配置选项
     * @param {number} options.updateInterval - 覆盖层更新间隔（毫秒），默认 2000
     * @param {boolean} options.debug - 是否显示调试边框，默认 false
     */
    async inject(canvasSelector, options = {}) {
        const {
            updateInterval = 2000,
            debug = false
        } = options;

        console.log(`        🔧 注入 Canvas 无障碍层: ${canvasSelector}`);

        await this.page.evaluate(({ sel, overlayId, updateInterval, debug }) => {
            const canvas = document.querySelector(sel);
            if (!canvas) {
                console.warn(`Canvas not found: ${sel}`);
                return;
            }

            // 创建覆盖层容器
            let overlay = document.getElementById(overlayId);
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = overlayId;
                canvas.parentElement?.appendChild(overlay);
            }

            // 设置覆盖层样式
            const updateOverlayPosition = () => {
                const rect = canvas.getBoundingClientRect();
                overlay.style.cssText = `
                    position: absolute;
                    top: ${canvas.offsetTop}px;
                    left: ${canvas.offsetLeft}px;
                    width: ${canvas.clientWidth}px;
                    height: ${canvas.clientHeight}px;
                    pointer-events: none;
                    z-index: 10000;
                `;
            };
            updateOverlayPosition();

            // 存储捕获的元素
            const elements = [];

            // 获取 Canvas 2D Context
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.warn('Failed to get 2D context');
                return;
            }

            // 保存原始方法
            const originalFillText = ctx.fillText.bind(ctx);
            const originalStrokeText = ctx.strokeText.bind(ctx);
            const originalDrawImage = ctx.drawImage.bind(ctx);
            const originalFillRect = ctx.fillRect.bind(ctx);
            const originalStrokeRect = ctx.strokeRect.bind(ctx);
            const originalArc = ctx.arc.bind(ctx);

            // Hook fillText - 捕获文字绘制
            ctx.fillText = function (text, x, y, maxWidth) {
                const metrics = ctx.measureText(text);
                const fontSize = parseFloat(ctx.font) || 14;

                elements.push({
                    type: 'text',
                    text: String(text),
                    x: x,
                    y: y - fontSize,
                    width: metrics.width,
                    height: fontSize * 1.2,
                    timestamp: Date.now()
                });

                return originalFillText(text, x, y, maxWidth);
            };

            // Hook strokeText - 捕获描边文字
            ctx.strokeText = function (text, x, y, maxWidth) {
                const metrics = ctx.measureText(text);
                const fontSize = parseFloat(ctx.font) || 14;

                elements.push({
                    type: 'text',
                    text: String(text),
                    x: x,
                    y: y - fontSize,
                    width: metrics.width,
                    height: fontSize * 1.2,
                    timestamp: Date.now()
                });

                return originalStrokeText(text, x, y, maxWidth);
            };

            // Hook drawImage - 捕获图片/图标
            ctx.drawImage = function (...args) {
                if (args.length >= 5) {
                    const [img, dx, dy, dw, dh] = args;
                    elements.push({
                        type: 'image',
                        x: dx,
                        y: dy,
                        width: dw || (img?.width || 0),
                        height: dh || (img?.height || 0),
                        timestamp: Date.now()
                    });
                } else if (args.length >= 3) {
                    const [img, dx, dy] = args;
                    elements.push({
                        type: 'image',
                        x: dx,
                        y: dy,
                        width: img?.width || 0,
                        height: img?.height || 0,
                        timestamp: Date.now()
                    });
                }
                return originalDrawImage.apply(ctx, args);
            };

            // Hook fillRect - 捕获矩形（可能是按钮背景）
            ctx.fillRect = function (x, y, w, h) {
                // 只记录较大的矩形（可能是按钮）
                if (w > 30 && h > 20) {
                    elements.push({
                        type: 'rect',
                        x, y,
                        width: w,
                        height: h,
                        timestamp: Date.now()
                    });
                }
                return originalFillRect(x, y, w, h);
            };

            // Hook arc - 捕获圆形/圆弧（转盘可能用到）
            ctx.arc = function (x, y, radius, startAngle, endAngle, counterclockwise) {
                // 记录圆心位置
                if (radius > 20) {
                    elements.push({
                        type: 'circle',
                        x: x - radius,
                        y: y - radius,
                        width: radius * 2,
                        height: radius * 2,
                        centerX: x,
                        centerY: y,
                        radius: radius,
                        timestamp: Date.now()
                    });
                }
                return originalArc(x, y, radius, startAngle, endAngle, counterclockwise);
            };

            // 更新覆盖层 DOM
            const updateOverlay = () => {
                overlay.innerHTML = '';
                const scaleX = canvas.clientWidth / canvas.width;
                const scaleY = canvas.clientHeight / canvas.height;

                // 清理过期元素（超过 5 秒的）
                const now = Date.now();
                const validElements = elements.filter(el => now - el.timestamp < 5000);
                elements.length = 0;
                elements.push(...validElements);

                // 检测按钮（文字 + 矩形组合）
                const buttons = detectButtons(validElements);

                // 渲染所有元素
                validElements.forEach((el, index) => {
                    const div = document.createElement('div');
                    div.style.cssText = `
                        position: absolute;
                        left: ${el.x * scaleX}px;
                        top: ${el.y * scaleY}px;
                        width: ${el.width * scaleX}px;
                        height: ${el.height * scaleY}px;
                        pointer-events: auto;
                        cursor: pointer;
                        ${debug ? 'background: rgba(255,0,0,0.1); border: 1px solid red;' : ''}
                    `;

                    if (el.text) {
                        div.textContent = el.text;
                        div.style.color = 'transparent';
                        div.style.fontSize = '1px';
                        div.style.overflow = 'hidden';
                        div.setAttribute('role', 'button');
                        div.setAttribute('aria-label', el.text);
                        div.setAttribute('data-canvas-text', el.text);
                        div.setAttribute('data-testid', `canvas-text-${el.text.replace(/\s+/g, '-')}`);
                    } else if (el.type === 'image') {
                        div.setAttribute('role', 'img');
                        div.setAttribute('data-canvas-type', 'image');
                        div.setAttribute('data-testid', `canvas-image-${index}`);
                    } else if (el.type === 'circle') {
                        div.setAttribute('role', 'button');
                        div.setAttribute('data-canvas-type', 'circle');
                        div.setAttribute('data-testid', `canvas-circle-${index}`);
                    } else if (el.type === 'rect') {
                        div.setAttribute('role', 'button');
                        div.setAttribute('data-canvas-type', 'rect');
                        div.setAttribute('data-testid', `canvas-rect-${index}`);
                    }

                    overlay.appendChild(div);
                });
            };

            // 检测按钮（文字和矩形的组合）
            function detectButtons(elements) {
                const buttons = [];
                const texts = elements.filter(el => el.type === 'text');
                const rects = elements.filter(el => el.type === 'rect');

                texts.forEach(text => {
                    // 查找包含此文字的矩形
                    const containingRect = rects.find(rect => {
                        return text.x >= rect.x &&
                            text.y >= rect.y &&
                            text.x + text.width <= rect.x + rect.width &&
                            text.y + text.height <= rect.y + rect.height;
                    });

                    if (containingRect) {
                        buttons.push({
                            text: text.text,
                            ...containingRect
                        });
                    }
                });

                return buttons;
            }

            // 监听 Canvas 尺寸变化
            const resizeObserver = new ResizeObserver(() => {
                updateOverlayPosition();
                updateOverlay();
            });
            resizeObserver.observe(canvas);

            // 定期刷新覆盖层
            const intervalId = setInterval(() => {
                updateOverlay();
            }, updateInterval);

            // 首次更新
            setTimeout(updateOverlay, 500);

            // 暴露到 window 方便外部调用
            window.__canvasElements__ = elements;
            window.__updateCanvasOverlay__ = updateOverlay;
            window.__canvasOverlayCleanup__ = () => {
                clearInterval(intervalId);
                resizeObserver.disconnect();
                overlay?.remove();
            };

            console.log('✅ Canvas 无障碍层注入完成');

        }, { sel: canvasSelector, overlayId: this.overlayId, updateInterval, debug });

        console.log('        ✅ Canvas 无障碍层注入完成');
    }

    /**
     * 获取 Canvas 中捕获的所有元素
     * @returns {Promise<Array>} 元素列表
     */
    async getCanvasElements() {
        return await this.page.evaluate(() => {
            return window.__canvasElements__ || [];
        });
    }

    /**
     * 手动刷新覆盖层
     */
    async refreshOverlay() {
        await this.page.evaluate(() => {
            window.__updateCanvasOverlay__?.();
        });
    }

    /**
     * 查找包含指定文本的元素
     * @param {string} text - 要查找的文本
     * @returns {Promise<Object|null>} 找到的元素或 null
     */
    async findElementByText(text) {
        const elements = await this.getCanvasElements();
        return elements.find(el => el.text && el.text.includes(text)) || null;
    }

    /**
     * 点击包含指定文本的元素
     * @param {string} text - 要点击的文本
     * @returns {Promise<boolean>} 是否成功点击
     */
    async clickElementByText(text) {
        const element = await this.findElementByText(text);
        if (!element) {
            console.log(`        ❌ 未找到包含文本 "${text}" 的元素`);
            return false;
        }

        // 计算点击位置（元素中心）
        const clickX = element.x + element.width / 2;
        const clickY = element.y + element.height / 2;

        // 获取 Canvas 的位置
        const canvasBox = await this.page.locator('canvas').first().boundingBox();
        if (!canvasBox) {
            console.log('        ❌ 无法获取 Canvas 位置');
            return false;
        }

        // 计算绝对坐标
        const absoluteX = canvasBox.x + clickX;
        const absoluteY = canvasBox.y + clickY;

        console.log(`        🎯 点击元素 "${text}" at (${Math.round(absoluteX)}, ${Math.round(absoluteY)})`);
        await this.page.mouse.click(absoluteX, absoluteY);

        return true;
    }

    /**
     * 清理覆盖层
     */
    async cleanup() {
        await this.page.evaluate(() => {
            window.__canvasOverlayCleanup__?.();
        });
        console.log('        🧹 Canvas 无障碍层已清理');
    }
}
