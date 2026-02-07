// src/utils/ApiAnalyzer.js

/**
 * API 响应分析器
 * 统一处理所有 API 请求的响应判断逻辑
 */
export class ApiAnalyzer {
    constructor(options = {}) {
        // 成功的 code 值列表
        this.successCodes = options.successCodes || [0, 200, '0', '200'];

        // 成功的 msg 值列表
        this.successMessages = options.successMessages || [
            'Success', 'Succeed', 'success', 'succeed', 'ok', 'OK', ''
        ];

        // 需要忽略的 URL 模式
        this.ignorePatterns = options.ignorePatterns || [
            /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i,
            /\.(css|js|woff|woff2|ttf|eot)$/i,
            /\.(mp4|mp3|webm|ogg)$/i,
            /google-analytics/i,
            /facebook/i,
            /hotjar/i
        ];

        // 错误级别配置
        this.errorLevels = {
            server_error: 'critical',    // 5xx
            client_error: 'warning',     // 4xx
            api_error: 'error',          // 业务错误
            network_error: 'critical'    // 网络错误
        };
    }

    /**
     * 检查是否应该忽略此请求
     */
    shouldIgnore(url) {
        return this.ignorePatterns.some(pattern => pattern.test(url));
    }

    /**
     * 分析请求结果
     * @param {Object} request - 请求对象
     * @returns {Object|null} - 返回错误对象或 null（无错误）
     */
    analyze(request) {
        if (!request) return null;
        if (this.shouldIgnore(request.url)) return null;

        const result = {
            hasError: false,
            error: null,
            summary: null
        };

        // 1. 检查网络错误
        if (request.status === 'failed') {
            result.hasError = true;
            result.error = this.createError({
                type: 'network_error',
                level: this.errorLevels.network_error,
                message: `网络请求失败: ${request.error || 'Unknown'}`,
                request
            });
            return result;
        }

        // 2. 检查 HTTP 状态码
        const httpStatus = request.response?.status;
        if (httpStatus) {
            const httpError = this.analyzeHttpStatus(httpStatus, request);
            if (httpError) {
                result.hasError = true;
                result.error = httpError;
                return result;
            }
        }

        // 3. 检查业务响应
        if (request.responseBody && typeof request.responseBody === 'object') {
            const bizError = this.analyzeBusinessResponse(request.responseBody, request);
            if (bizError) {
                result.hasError = true;
                result.error = bizError;
                return result;
            }
        }

        // 4. 生成成功摘要
        result.summary = this.createSuccessSummary(request);
        return result;
    }

    /**
     * 分析 HTTP 状态码
     */
    analyzeHttpStatus(status, request) {
        if (status >= 500) {
            return this.createError({
                type: 'server_error',
                level: this.errorLevels.server_error,
                message: `服务器错误 ${status}: ${request.response?.statusText || ''}`,
                httpStatus: status,
                request
            });
        }

        if (status >= 400) {
            return this.createError({
                type: 'client_error',
                level: this.errorLevels.client_error,
                message: `客户端错误 ${status}: ${request.response?.statusText || ''}`,
                httpStatus: status,
                request
            });
        }

        // 3xx 重定向，记录但不算错误
        if (status >= 300) {
            console.log(`      🔵 重定向 ${status}: ${this.shortenUrl(request.url)}`);
        }

        return null;
    }

    /**
     * 分析业务响应
     */
    analyzeBusinessResponse(body, request) {
        // 检查常见的错误字段

        // 1. 检查 code 字段
        if (body.code !== undefined) {
            if (!this.successCodes.includes(body.code)) {
                return this.createError({
                    type: 'api_error',
                    level: this.errorLevels.api_error,
                    message: `API错误 [code: ${body.code}]: ${body.msg || body.message || 'N/A'}`,
                    apiCode: body.code,
                    apiMsg: body.msg || body.message,
                    request
                });
            }
        }

        // 2. 检查 success 字段
        if (body.success === false) {
            return this.createError({
                type: 'api_error',
                level: this.errorLevels.api_error,
                message: `API失败: ${body.message || body.msg || body.error || 'Unknown'}`,
                apiMsg: body.message || body.msg,
                request
            });
        }

        // 3. 检查 error 字段
        if (body.error && typeof body.error === 'object') {
            return this.createError({
                type: 'api_error',
                level: this.errorLevels.api_error,
                message: `API错误: ${body.error.message || body.error.msg || JSON.stringify(body.error)}`,
                apiError: body.error,
                request
            });
        }

        // 4. 检查 status 字段（某些API用status表示业务状态）
        if (body.status !== undefined && typeof body.status === 'number') {
            if (body.status !== 0 && body.status !== 200 && body.status !== 1) {
                return this.createError({
                    type: 'api_error',
                    level: this.errorLevels.api_error,
                    message: `API状态异常 [status: ${body.status}]: ${body.msg || body.message || 'N/A'}`,
                    apiStatus: body.status,
                    apiMsg: body.msg || body.message,
                    request
                });
            }
        }

        return null;
    }

    /**
     * 创建错误对象
     */
    createError(options) {
        const { type, level, message, request, ...extra } = options;

        return {
            type,
            level,
            message,
            url: request.url,
            method: request.method,
            duration: request.duration,
            size: request.size,
            httpStatus: request.response?.status,
            timestamp: new Date().toISOString(),
            requestBody: request.postData,
            responseBody: request.responseBody,
            ...extra,

            // 格式化的详情（用于报告展示）
            details: this.formatErrorDetails(options, request)
        };
    }

    /**
     * 格式化错误详情
     */
    formatErrorDetails(options, request) {
        const lines = [];
        const icon = options.level === 'critical' ? '🔴' : options.level === 'warning' ? '🟡' : '🟠';

        lines.push(`${icon} ${options.message}`);
        lines.push(`URL: ${request.url}`);
        lines.push(`Method: ${request.method}`);
        lines.push(`Duration: ${request.duration?.toFixed(0) || 'N/A'}ms`);

        if (request.response?.status) {
            lines.push(`HTTP Status: ${request.response.status}`);
        }

        if (options.apiCode !== undefined) {
            lines.push(`API Code: ${options.apiCode}`);
        }

        if (options.apiMsg) {
            lines.push(`API Message: ${options.apiMsg}`);
        }

        if (request.responseBody) {
            lines.push(`\nResponse Body:`);
            lines.push(JSON.stringify(request.responseBody, null, 2).substring(0, 1000));
        }

        return lines.join('\n');
    }

    /**
     * 创建成功摘要
     */
    createSuccessSummary(request) {
        return {
            url: request.url,
            method: request.method,
            status: request.response?.status,
            duration: request.duration,
            size: request.size
        };
    }

    /**
     * 缩短 URL 显示
     */
    shortenUrl(url, maxLength = 60) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname + urlObj.search;
            return path.length > maxLength ? path.substring(0, maxLength) + '...' : path;
        } catch (e) {
            return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
        }
    }

    /**
     * 打印错误到控制台
     */
    printError(error) {
        const icon = error.level === 'critical' ? '🔴' : error.level === 'warning' ? '🟡' : '🟠';
        console.log(`      ${icon} ${error.message}`);
        console.log(`         → ${this.shortenUrl(error.url)}`);
    }

    /**
     * 打印成功请求到控制台（调试用）
     */
    printSuccess(summary) {
        console.log(`      ✅ ${summary.method} ${this.shortenUrl(summary.url)} [${summary.status}] ${summary.duration?.toFixed(0)}ms`);
    }
}

// 默认实例
export const defaultApiAnalyzer = new ApiAnalyzer();