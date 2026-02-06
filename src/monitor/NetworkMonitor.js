import { EventEmitter } from 'events';

/**
 * 网络监控类，用于监控和管理网络请求
 * 继承自EventEmitter，可以触发和监听网络相关事件
 */
export class NetworkMonitor extends EventEmitter {
  /**
   * 构造函数
   * @param {Page} page - 页面对象
   * @param {Object} config - 配置对象
   */
  constructor(page, config) {
    super();
    this.page = page; // 存储页面对象
    this.config = config; // 存储配置信息
    this.cdpSession = null; // 存储CDP会话
    this.pendingRequests = new Map(); // 存储待处理的请求
  }

  /**
   * 启动网络监控
   * 初始化CDP会话并设置网络事件监听器
   */
  async start() {
    try {
      // 创建新的CDP会话并启用网络域
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Network.enable');

      // 设置网络请求事件监听器
      this.cdpSession.on('Network.requestWillBeSent', (params) => {
        this.onRequestStart(params);
      });

      this.cdpSession.on('Network.responseReceived', (params) => {
        this.onResponseReceived(params);
      });

      this.cdpSession.on('Network.loadingFinished', (params) => {
        this.onLoadingFinished(params);
      });

      this.cdpSession.on('Network.loadingFailed', (params) => {
        this.onLoadingFailed(params);
      });

    } catch (e) {
      console.warn('网络监控初始化失败:', e.message);
    }
  }

  /**
   * 处理请求开始事件
   * @param {Object} params - 请求参数
   */
  onRequestStart(params) {
    const { requestId, request, timestamp, type, initiator } = params;

    // 将请求信息存储到pendingRequests中
    this.pendingRequests.set(requestId, {
      requestId,
      url: request.url,
      method: request.method,
      headers: request.headers,
      postData: request.postData,
      resourceType: type,
      initiator: initiator?.type,
      startTime: timestamp * 1000,
      status: 'pending'
    });
  }

  /**
   * 处理响应接收事件
   * @param {Object} params - 响应参数
   */
  onResponseReceived(params) {
    const { requestId, response } = params;

    // 获取并更新请求的响应信息
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        mimeType: response.mimeType,
        protocol: response.protocol,
        remoteIPAddress: response.remoteIPAddress
      };
    }
  }

  /**
   * 处理请求加载完成事件
   * @param {Object} params - 完成参数
   */
  async onLoadingFinished(params) {
    const { requestId, timestamp, encodedDataLength } = params;

    // 获取请求信息并更新
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.endTime = timestamp * 1000;
      request.duration = request.endTime - request.startTime;
      request.size = encodedDataLength;
      request.status = 'completed';

      // 尝试获取响应体
      if (this.config.captureBody) {
        try {
          const mimeType = request.response?.mimeType || '';
          if ((mimeType.includes('json') || mimeType.includes('text')) &&
            request.size < this.config.maxBodySize) {
            const { body, base64Encoded } = await this.cdpSession.send('Network.getResponseBody', { requestId });
            request.responseBody = base64Encoded ? '[Base64 Encoded]' : body;

            // 如果是JSON格式，尝试解析
            if (mimeType.includes('json') && !base64Encoded) {
              try {
                request.responseBody = JSON.parse(body);
              } catch (e) {
                // JSON解析失败，保持原始字符串
                console.warn('JSON解析失败:', e.message);
              }
            }
          }
        } catch (e) {
          console.warn('获取响应体失败:', e.message);
        }
      }

      this.emit('request', request);
      this.pendingRequests.delete(requestId);
    }
  }


  onLoadingFailed(params) {
    const { requestId, timestamp, errorText, canceled } = params;

    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.endTime = timestamp * 1000;
      request.duration = request.endTime - request.startTime;
      request.status = canceled ? 'canceled' : 'failed';
      request.error = errorText;

      this.emit('request', request);
      this.pendingRequests.delete(requestId);
    }
  }
}
