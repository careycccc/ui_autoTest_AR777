// src/monitor/NetworkMonitor.js
import { EventEmitter } from 'events';

export class NetworkMonitor extends EventEmitter {
  constructor(page, config) {
    super();
    this.page = page;
    this.config = {
      enabled: true,
      captureBody: true,
      maxBodySize: 100000,
      urlFilter: null,
      // 新增：资源类型过滤（只保留 API 请求）
      resourceTypeFilter: ['XHR', 'Fetch', 'Document'],
      // 新增：排除的文件扩展名
      excludeExtensions: ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.webm'],
      ...config
    };
    this.cdpSession = null;
    this.pendingRequests = new Map();
    this.allRequests = [];
    this.apiRequests = [];  // 只存储 API 请求
  }

  // 检查是否是 API 请求
  isApiRequest(url, resourceType) {
    // 检查资源类型
    const allowedTypes = this.config.resourceTypeFilter || ['XHR', 'Fetch'];
    if (!allowedTypes.includes(resourceType)) {
      return false;
    }

    // 检查文件扩展名
    const urlLower = url.toLowerCase();
    const excludeExts = this.config.excludeExtensions || [];
    for (const ext of excludeExts) {
      if (urlLower.includes(ext)) {
        return false;
      }
    }

    // 检查 URL 过滤器
    if (this.config.urlFilter) {
      return this.matchUrlFilter(url);
    }

    return true;
  }

  matchUrlFilter(url) {
    if (!this.config.urlFilter) return true;

    const filters = Array.isArray(this.config.urlFilter)
      ? this.config.urlFilter
      : [this.config.urlFilter];

    for (const filter of filters) {
      if (filter instanceof RegExp) {
        if (filter.test(url)) return true;
      } else if (typeof filter === 'function') {
        if (filter(url)) return true;
      } else if (typeof filter === 'string') {
        if (url.includes(filter)) return true;
      }
    }
    return false;
  }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Network.enable');
      this.cdpSession.on('Network.requestWillBeSent', (params) => this.onRequestStart(params));
      this.cdpSession.on('Network.responseReceived', (params) => this.onResponseReceived(params));
      this.cdpSession.on('Network.loadingFinished', (params) => this.onLoadingFinished(params));
      this.cdpSession.on('Network.loadingFailed', (params) => this.onLoadingFailed(params));
    } catch (e) {
      console.warn('网络监控初始化失败:', e.message);
    }
  }

  onRequestStart(params) {
    const { requestId, request, timestamp, type, initiator } = params;

    this.pendingRequests.set(requestId, {
      requestId,
      url: request.url,
      method: request.method,
      resourceType: type,
      startTime: timestamp * 1000,
      status: 'pending',
      headers: request.headers,
      postData: request.postData,
      initiator: initiator,
      isApi: this.isApiRequest(request.url, type),
      error: null,
      errorDetails: null
    });
  }

  onResponseReceived(params) {
    const { requestId, response } = params;
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.response = {
        status: response.status,
        statusText: response.statusText,
        mimeType: response.mimeType,
        headers: response.headers,
        remoteIPAddress: response.remoteIPAddress,
        remotePort: response.remotePort,
        protocol: response.protocol
      };
    }
  }

  async onLoadingFinished(params) {
    const { requestId, timestamp, encodedDataLength } = params;
    const request = this.pendingRequests.get(requestId);
    if (!request) return;

    request.endTime = timestamp * 1000;
    request.duration = request.endTime - request.startTime;
    request.size = encodedDataLength;
    request.status = 'completed';

    // 获取响应体
    if (this.config.captureBody && request.isApi) {
      try {
        const mimeType = request.response?.mimeType || '';
        const isTextType = mimeType.includes('json') || mimeType.includes('text') || mimeType.includes('xml');

        if (isTextType && request.size < this.config.maxBodySize) {
          const { body, base64Encoded } = await this.cdpSession.send('Network.getResponseBody', { requestId });
          if (!base64Encoded) {
            if (mimeType.includes('json')) {
              try {
                request.responseBody = JSON.parse(body);
              } catch (e) {
                request.responseBody = body;
              }
            } else {
              request.responseBody = body;
            }
          }
        }
      } catch (e) { }
    }

    // 分析错误
    this.analyzeRequestError(request);

    // 保存
    this.allRequests.push(request);
    if (request.isApi) {
      this.apiRequests.push(request);
      this.emit('request', request);
    }
    this.emit('allRequest', request);

    this.pendingRequests.delete(requestId);
  }

  onLoadingFailed(params) {
    const { requestId, timestamp, errorText, canceled, blockedReason } = params;
    const request = this.pendingRequests.get(requestId);
    if (!request) return;

    request.endTime = timestamp * 1000;
    request.duration = request.endTime - request.startTime;
    request.status = 'failed';
    request.error = {
      type: 'network_error',
      message: errorText,
      canceled: canceled,
      blockedReason: blockedReason
    };
    request.errorDetails = `网络错误: ${errorText}`;

    this.allRequests.push(request);
    if (request.isApi) {
      this.apiRequests.push(request);
      this.emit('request', request);
    }
    this.emit('allRequest', request);

    this.pendingRequests.delete(requestId);
  }

  // 分析请求错误
  analyzeRequestError(request) {
    if (!request.response) return;

    const status = request.response.status;
    const url = request.url;

    // HTTP 错误
    if (status >= 500) {
      request.error = {
        type: 'server_error',
        level: 'critical',
        message: `服务器错误 ${status}: ${request.response.statusText}`,
        status: status
      };
      request.errorDetails = `🔴 服务器错误 (${status})\n${request.response.statusText}`;
    } else if (status >= 400) {
      request.error = {
        type: 'client_error',
        level: 'warning',
        message: `客户端错误 ${status}: ${request.response.statusText}`,
        status: status
      };
      request.errorDetails = `🟡 客户端错误 (${status})\n${request.response.statusText}`;
    }

    // 业务错误（检查响应体）
    if (status >= 200 && status < 300 && request.responseBody) {
      const body = request.responseBody;

      // 检查 code 字段
      if (body.code !== undefined && body.code !== 0) {
        request.error = {
          type: 'api_error',
          level: 'error',
          message: `API 错误: code=${body.code}, msg=${body.msg || 'N/A'}`,
          code: body.code,
          apiMsg: body.msg
        };
        request.errorDetails = `🟠 API 业务错误\ncode: ${body.code}\nmsg: ${body.msg || 'N/A'}`;
        if (body.data) {
          request.errorDetails += `\ndata: ${JSON.stringify(body.data, null, 2).substring(0, 500)}`;
        }
      }

      // 检查 success 字段
      if (body.success === false) {
        request.error = {
          type: 'api_error',
          level: 'error',
          message: `API 错误: ${body.message || body.msg || 'Unknown'}`,
          apiMsg: body.message || body.msg
        };
        request.errorDetails = `🟠 API 业务错误\nmessage: ${body.message || body.msg || 'Unknown'}`;
      }

      // 检查 error 字段
      if (body.error) {
        request.error = {
          type: 'api_error',
          level: 'error',
          message: `API 错误: ${body.error.message || body.error}`,
          apiError: body.error
        };
        request.errorDetails = `🟠 API 错误\n${JSON.stringify(body.error, null, 2).substring(0, 500)}`;
      }
    }
  }

  getApiRequests() {
    return this.apiRequests;
  }

  getAllRequests() {
    return this.allRequests;
  }

  clear() {
    this.allRequests = [];
    this.apiRequests = [];
    this.pendingRequests.clear();
  }

  async stop() {
    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Network.disable');
      } catch (e) { }
    }
  }
}