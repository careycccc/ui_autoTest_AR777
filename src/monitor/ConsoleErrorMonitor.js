import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';

/**
 * 控制台错误监控类
 * 监控页面控制台的错误信息，并在出现错误时自动截图
 */
export class ConsoleErrorMonitor extends EventEmitter {
    constructor(page, config = {}) {
        super();
        this.page = page;
        this.config = {
            enabled: true,
            // 截图配置
            screenshotDir: 'reports/console-errors',
            screenshotPrefix: 'console-error',
            // 大规模报错阈值（超过此数量时，每N个错误截一张图）
            massErrorThreshold: 10,
            massErrorScreenshotInterval: 10,
            // 错误类型过滤
            errorTypes: ['error'], // 只监控 error，不监控 warning
            // 忽略的错误模式（正则表达式）
            ignorePatterns: [],
            // 错误去重配置
            deduplicateErrors: true, // 启用错误去重
            ...config
        };

        this.errors = [];
        this.errorCount = 0;
        this.lastScreenshotCount = 0;
        this.isListening = false;
        // 用于去重的错误指纹集合
        this.errorFingerprints = new Set();
    }

    /**
     * 启动监控
     */
    async start() {
        if (!this.config.enabled || this.isListening) return;

        // 确保截图目录存在
        this.ensureScreenshotDir();

        // 监听控制台消息
        this.page.on('console', async (msg) => {
            await this.handleConsoleMessage(msg);
        });

        // 监听页面错误（未捕获的异常）
        this.page.on('pageerror', async (error) => {
            await this.handlePageError(error);
        });

        this.isListening = true;
        console.log('      🔍 控制台错误监控已启动');
    }

    /**
     * 处理控制台消息
     */
    async handleConsoleMessage(msg) {
        const type = msg.type();

        // 只处理配置的错误类型
        if (!this.config.errorTypes.includes(type)) return;

        const text = msg.text();
        const location = msg.location();

        // 检查是否应该忽略此错误
        if (this.shouldIgnoreError(text)) return;

        // 记录错误
        const errorInfo = {
            type,
            message: text,
            location: {
                url: location.url,
                lineNumber: location.lineNumber,
                columnNumber: location.columnNumber
            },
            timestamp: new Date().toISOString(),
            stackTrace: await this.extractStackTrace(msg)
        };

        // 生成错误指纹
        const fingerprint = this.generateErrorFingerprint(errorInfo);

        // 检查是否是重复错误
        const isDuplicate = this.errorFingerprints.has(fingerprint);
        errorInfo.isDuplicate = isDuplicate;

        // 记录错误指纹
        if (!isDuplicate) {
            this.errorFingerprints.add(fingerprint);
        }

        this.errors.push(errorInfo);
        this.errorCount++;

        // 触发错误事件
        this.emit('error', errorInfo);

        // 决定是否截图（重复错误不截图）
        await this.handleScreenshot(errorInfo);

        // 打印错误信息
        this.logError(errorInfo);
    }

    /**
     * 处理页面错误（未捕获的异常）
     */
    async handlePageError(error) {
        const errorInfo = {
            type: 'uncaught-exception',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        // 检查是否应该忽略此错误
        if (this.shouldIgnoreError(error.message)) return;

        // 生成错误指纹
        const fingerprint = this.generateErrorFingerprint(errorInfo);

        // 检查是否是重复错误
        const isDuplicate = this.errorFingerprints.has(fingerprint);
        errorInfo.isDuplicate = isDuplicate;

        // 记录错误指纹
        if (!isDuplicate) {
            this.errorFingerprints.add(fingerprint);
        }

        this.errors.push(errorInfo);
        this.errorCount++;

        // 触发错误事件
        this.emit('error', errorInfo);

        // 决定是否截图（重复错误不截图）
        await this.handleScreenshot(errorInfo);

        // 打印错误信息
        this.logError(errorInfo);
    }

    /**
     * 生成错误指纹（用于去重）
     * 基于错误消息和位置生成唯一标识
     */
    generateErrorFingerprint(errorInfo) {
        const message = errorInfo.message || '';
        const location = errorInfo.location;

        // 使用错误消息 + 文件路径 + 行号作为指纹
        if (location && location.url) {
            // 提取文件路径（去除查询参数和域名）
            const urlPath = location.url.split('?')[0].split('/').slice(-2).join('/');
            return `${message}|${urlPath}|${location.lineNumber}`;
        }

        // 如果没有位置信息，只使用错误消息
        return message;
    }

    /**
     * 决定是否需要截图
     */
    async handleScreenshot(errorInfo) {
        // 如果启用了去重且是重复错误，不截图
        if (this.config.deduplicateErrors && errorInfo.isDuplicate) {
            console.log(`      ⏭️  重复错误，跳过截图`);
            return;
        }

        const isMassError = this.errorCount >= this.config.massErrorThreshold;

        if (isMassError) {
            // 大规模报错：每N个错误截一张图
            const shouldTakeScreenshot =
                (this.errorCount - this.lastScreenshotCount) >= this.config.massErrorScreenshotInterval;

            if (shouldTakeScreenshot) {
                await this.takeScreenshot(errorInfo, `mass-error-${this.errorCount}`);
                this.lastScreenshotCount = this.errorCount;
            }
        } else {
            // 正常情况：每个错误都截图
            await this.takeScreenshot(errorInfo, `error-${this.errorCount}`);
        }
    }

    /**
     * 截图
     */
    async takeScreenshot(errorInfo, suffix) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${this.config.screenshotPrefix}-${suffix}-${timestamp}.png`;
            const filepath = path.join(this.config.screenshotDir, filename);

            await this.page.screenshot({
                path: filepath,
                fullPage: false // 只截当前视口，避免截图过大
            });

            errorInfo.screenshot = filepath;
            console.log(`      📸 错误截图: ${filename}`);

            return filepath;
        } catch (e) {
            console.warn(`      ⚠️ 截图失败: ${e.message}`);
            return null;
        }
    }

    /**
     * 提取堆栈跟踪信息
     */
    async extractStackTrace(msg) {
        try {
            const args = await Promise.all(
                msg.args().map(arg => arg.jsonValue().catch(() => null))
            );

            // 尝试从参数中提取堆栈信息
            for (const arg of args) {
                if (arg && typeof arg === 'object' && arg.stack) {
                    return arg.stack;
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 检查是否应该忽略此错误
     */
    shouldIgnoreError(message) {
        if (!message) return false;

        for (const pattern of this.config.ignorePatterns) {
            if (pattern instanceof RegExp) {
                if (pattern.test(message)) return true;
            } else if (typeof pattern === 'string') {
                if (message.includes(pattern)) return true;
            }
        }

        return false;
    }

    /**
     * 打印错误信息
     */
    logError(errorInfo) {
        const icon = this.getErrorIcon(errorInfo.type);
        const count = `[${this.errorCount}]`;
        const duplicateTag = errorInfo.isDuplicate ? ' (重复)' : '';

        console.log(`      ${icon} ${count} ${errorInfo.type.toUpperCase()}${duplicateTag}: ${errorInfo.message}`);

        if (errorInfo.location) {
            console.log(`         位置: ${errorInfo.location.url}:${errorInfo.location.lineNumber}:${errorInfo.location.columnNumber}`);
        }

        if (errorInfo.screenshot) {
            console.log(`         截图: ${errorInfo.screenshot}`);
        } else if (errorInfo.isDuplicate) {
            console.log(`         已跳过截图（重复错误）`);
        }
    }

    /**
     * 获取错误图标
     */
    getErrorIcon(type) {
        const icons = {
            'error': '🔴',
            'warning': '🟡',
            'info': '🔵',
            'log': '⚪',
            'uncaught-exception': '💥'
        };
        return icons[type] || '❓';
    }

    /**
     * 确保截图目录存在
     */
    ensureScreenshotDir() {
        if (!fs.existsSync(this.config.screenshotDir)) {
            fs.mkdirSync(this.config.screenshotDir, { recursive: true });
        }
    }

    /**
     * 获取所有错误
     */
    getErrors() {
        return this.errors;
    }

    /**
     * 获取错误统计
     */
    getStats() {
        const stats = {
            total: this.errorCount,
            byType: {}
        };

        this.errors.forEach(error => {
            const type = error.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        return stats;
    }

    /**
     * 清空错误记录
     */
    clear() {
        this.errors = [];
        this.errorCount = 0;
        this.lastScreenshotCount = 0;
        // 注意：不清空 errorFingerprints，保持跨页面的去重
        // 如果需要完全重置，可以调用 reset() 方法
    }

    /**
     * 完全重置监控器（包括错误指纹）
     */
    reset() {
        this.errors = [];
        this.errorCount = 0;
        this.lastScreenshotCount = 0;
        this.errorFingerprints.clear();
    }

    /**
     * 停止监控
     */
    async stop() {
        this.isListening = false;
        this.page.removeAllListeners('console');
        this.page.removeAllListeners('pageerror');
        console.log('      🔍 控制台错误监控已停止');
    }

    /**
     * 生成错误报告
     */
    generateReport() {
        const stats = this.getStats();

        return {
            summary: {
                totalErrors: this.errorCount,
                errorsByType: stats.byType,
                hasErrors: this.errorCount > 0,
                isMassError: this.errorCount >= this.config.massErrorThreshold
            },
            errors: this.errors.map(error => ({
                type: error.type,
                message: error.message,
                location: error.location,
                timestamp: error.timestamp,
                screenshot: error.screenshot,
                stackTrace: error.stackTrace
            }))
        };
    }
}
