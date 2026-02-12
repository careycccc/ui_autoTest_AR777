/**
 * SPA 页面切换性能测量器
 * 精确测量 SPA 路由切换的各个阶段耗时
 */

// 🔥 注入到页面的监控脚本
const PERFORMANCE_INJECT_SCRIPT = `
(function() {
  if (window.__spaMetrics) return; // 避免重复注入
  
  window.__spaMetrics = {
    // 时间戳
    navStart: 0,              // 导航开始时间
    routeResolved: 0,         // 路由解析完成时间
    componentLoaded: 0,       // 组件加载完成时间
    firstRequest: 0,          // 首次请求时间
    lastResponse: 0,          // 最后响应时间
    domUpdated: 0,            // DOM 首次更新时间
    renderComplete: 0,        // 渲染完成时间
    
    // 详细信息
    requests: [],             // 请求列表
    mutationCount: 0,         // DOM 变化次数
    isCollecting: false       // 是否正在收集
  };
  
  // 🔥 监听 XHR 和 Fetch 请求
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  window.fetch = function(...args) {
    if (!window.__spaMetrics.isCollecting) return originalFetch.apply(this, args);
    
    const startTime = performance.now();
    if (!window.__spaMetrics.firstRequest) {
      window.__spaMetrics.firstRequest = startTime;
    }
    
    return originalFetch.apply(this, args).then(response => {
      const endTime = performance.now();
      window.__spaMetrics.lastResponse = endTime;
      window.__spaMetrics.requests.push({
        url: args[0],
        method: args[1]?.method || 'GET',
        duration: endTime - startTime,
        startTime: startTime,
        endTime: endTime
      });
      return response;
    }).catch(error => {
      const endTime = performance.now();
      window.__spaMetrics.lastResponse = endTime;
      window.__spaMetrics.requests.push({
        url: args[0],
        method: args[1]?.method || 'GET',
        duration: endTime - startTime,
        startTime: startTime,
        endTime: endTime,
        error: true
      });
      throw error;
    });
  };
  
  // 🔥 监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    if (!window.__spaMetrics.isCollecting) return;
    
    const now = performance.now();
    
    // 记录首次 DOM 更新
    if (!window.__spaMetrics.domUpdated && mutations.length > 0) {
      window.__spaMetrics.domUpdated = now;
    }
    
    // 记录最后一次 DOM 更新（作为渲染完成的标志）
    window.__spaMetrics.renderComplete = now;
    window.__spaMetrics.mutationCount += mutations.length;
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  
  // 🔥 监听路由变化（适配常见路由库）
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    if (window.__spaMetrics.isCollecting && !window.__spaMetrics.routeResolved) {
      window.__spaMetrics.routeResolved = performance.now();
    }
    return originalPushState.apply(this, args);
  };
  
  history.replaceState = function(...args) {
    if (window.__spaMetrics.isCollecting && !window.__spaMetrics.routeResolved) {
      window.__spaMetrics.routeResolved = performance.now();
    }
    return originalReplaceState.apply(this, args);
  };
  
  window.addEventListener('popstate', function() {
    if (window.__spaMetrics.isCollecting && !window.__spaMetrics.routeResolved) {
      window.__spaMetrics.routeResolved = performance.now();
    }
  });
  
  console.log('✅ SPA 性能监控已注入');
})();
`;

export class SPAPerformanceMeasurer {
    constructor(page) {
        this.page = page;
        this.injected = false;
    }

    /**
     * 注入监控代码（只需注入一次）
     */
    async inject() {
        if (!this.injected) {
            await this.page.evaluate(PERFORMANCE_INJECT_SCRIPT);
            this.injected = true;
        }
    }

    /**
     * 开始测量
     */
    async startMeasure() {
        await this.inject();

        await this.page.evaluate(() => {
            const metrics = window.__spaMetrics;
            // 重置所有指标
            metrics.navStart = performance.now();
            metrics.routeResolved = 0;
            metrics.componentLoaded = 0;
            metrics.firstRequest = 0;
            metrics.lastResponse = 0;
            metrics.domUpdated = 0;
            metrics.renderComplete = 0;
            metrics.requests = [];
            metrics.mutationCount = 0;
            metrics.isCollecting = true;
        });
    }

    /**
     * 结束测量并获取结果
     * @param {number} stableTime - DOM 稳定等待时间（毫秒）
     */
    async endMeasure(stableTime = 1000) {
        // 等待 DOM 稳定（没有新的变化）
        await this.waitForDOMStable(stableTime);

        // 停止收集
        await this.page.evaluate(() => {
            window.__spaMetrics.isCollecting = false;
        });

        // 获取所有指标
        const metrics = await this.page.evaluate(() => {
            return JSON.parse(JSON.stringify(window.__spaMetrics));
        });

        // 计算各阶段耗时
        return this.calculateMetrics(metrics);
    }

    /**
     * 等待 DOM 稳定
     */
    async waitForDOMStable(stableTime = 1000, checkInterval = 200) {
        let lastRenderTime = 0;
        let stableCount = 0;
        const requiredStableChecks = Math.ceil(stableTime / checkInterval);

        while (stableCount < requiredStableChecks) {
            const currentRenderTime = await this.page.evaluate(() => {
                return window.__spaMetrics.renderComplete;
            });

            if (currentRenderTime === lastRenderTime && currentRenderTime > 0) {
                stableCount++;
            } else {
                stableCount = 0;
                lastRenderTime = currentRenderTime;
            }

            await this.page.waitForTimeout(checkInterval);
        }
    }

    /**
     * 计算各阶段指标
     */
    calculateMetrics(raw) {
        const { navStart, routeResolved, firstRequest, lastResponse, domUpdated, renderComplete, requests } = raw;

        const result = {
            // ===== 各阶段耗时 =====
            routeResolveTime: routeResolved ? routeResolved - navStart : 0,

            componentLoadTime: (() => {
                // 组件加载 = 首次DOM变化 - 路由解析完成
                const start = routeResolved || navStart;
                const end = domUpdated || renderComplete;
                return end ? end - start : 0;
            })(),

            dataRequestTime: (() => {
                // 数据请求 = 最后响应 - 首次请求
                if (firstRequest && lastResponse) {
                    return lastResponse - firstRequest;
                }
                return 0;
            })(),

            domRenderTime: (() => {
                // DOM渲染 = 渲染完成 - 首次DOM变化
                if (domUpdated && renderComplete) {
                    return renderComplete - domUpdated;
                }
                return 0;
            })(),

            // ===== 总耗时 =====
            totalTime: renderComplete ? renderComplete - navStart : 0,

            // ===== 详细信息 =====
            requestCount: requests.length,
            mutationCount: raw.mutationCount,
            requests: requests.map(r => ({
                url: r.url,
                duration: Math.round(r.duration)
            })),

            // ===== 原始时间戳 =====
            timestamps: {
                navStart: Math.round(navStart),
                routeResolved: Math.round(routeResolved),
                firstRequest: Math.round(firstRequest),
                lastResponse: Math.round(lastResponse),
                domUpdated: Math.round(domUpdated),
                renderComplete: Math.round(renderComplete)
            }
        };

        // 四舍五入
        result.routeResolveTime = Math.round(result.routeResolveTime);
        result.componentLoadTime = Math.round(result.componentLoadTime);
        result.dataRequestTime = Math.round(result.dataRequestTime);
        result.domRenderTime = Math.round(result.domRenderTime);
        result.totalTime = Math.round(result.totalTime);

        return result;
    }

    /**
     * 获取详细的性能报告
     */
    async getDetailedReport() {
        const metrics = await this.endMeasure();

        return {
            summary: {
                totalTime: metrics.totalTime,
                breakdown: {
                    routeResolve: metrics.routeResolveTime,
                    componentLoad: metrics.componentLoadTime,
                    dataRequest: metrics.dataRequestTime,
                    domRender: metrics.domRenderTime
                }
            },
            details: {
                requestCount: metrics.requestCount,
                mutationCount: metrics.mutationCount,
                requests: metrics.requests
            },
            timestamps: metrics.timestamps
        };
    }
}
