export class PerformanceMonitor {
  constructor(page, config) {
    this.page = page;
    this.config = config || {};
    this.cdpSession = null;
    this.isInitialized = false;
    this.startMetrics = null;
    this.startTimestamp = null;
    this.pageStartTime = null;
    this.resourcesBeforeSwitch = new Set();
  }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Performance.enable');

      const { metrics } = await this.cdpSession.send('Performance.getMetrics');
      this.startMetrics = {};
      metrics.forEach(m => this.startMetrics[m.name] = m.value);
      this.startTimestamp = Date.now();
      this.pageStartTime = Date.now();

      this.isInitialized = true;
    } catch (e) {
      console.warn('性能监控初始化失败:', e.message);
    }
  }

  // 重置性能监控（用于页面切换）
  async reset() {
    try {
      // 记录当前已加载的资源
      const currentResources = await this.page.evaluate(() => {
        return performance.getEntriesByType('resource').map(r => r.name);
      });
      this.resourcesBeforeSwitch = new Set(currentResources);

      // 重置开始时间
      this.pageStartTime = Date.now();

      // 重置 CDP 指标基准
      if (this.cdpSession) {
        const { metrics } = await this.cdpSession.send('Performance.getMetrics');
        this.startMetrics = {};
        metrics.forEach(m => this.startMetrics[m.name] = m.value);
        this.startTimestamp = Date.now();
      }

      // 重置页面内的性能数据
      await this.page.evaluate(() => {
        window.__perfMonitorInitialized = false;
        window.__perfMonitor = null;
        window.__pageLoadStartTime = Date.now();
      });


    } catch (e) {
      console.warn('重置性能监控失败:', e.message);
    }
  }
  /**
 * 标记性能采集的真正起点（在所有 waitForTimeout 之后调用）
 */
  async markCollectStart() {
    this.pageStartTime = Date.now();
    this.startTimestamp = Date.now();

    // 重置 CDP 基准
    if (this.cdpSession) {
      const { metrics } = await this.cdpSession.send('Performance.getMetrics');
      this.startMetrics = {};
      metrics.forEach(m => this.startMetrics[m.name] = m.value);
    }
  }


  async injectWebVitals() {
    try {
      await this.page.evaluate(() => {
        // 强制重新初始化
        const startTime = window.__pageLoadStartTime || performance.now();

        window.__perfMonitor = {
          pageStartTime: startTime,

          // Web Vitals - 每个页面独立
          lcp: null,
          lcpElementDetails: null,
          lcpResourceTiming: null,
          fcp: null,
          firstPaint: null,
          cls: 0,
          clsEntries: [],
          fid: null,
          fidDetails: null,
          inp: null,
          ttfb: null,

          // 导航时序
          navigation: {},

          // 资源
          resources: [],
          resourcesByType: {},
          resourceStats: {},
          slowResources: [],
          largeResources: [],
          blockingResources: [],
          newResources: [], // 页面切换后新加载的资源

          // DOM
          domStats: {},
          heavyElements: [],

          // 长任务
          longTasks: [],
          longTasksAfterSwitch: [],

          // 交互
          interactions: []
        };

        // ====== 获取导航时序（仅首次加载有效）======
        try {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) {
            window.__perfMonitor.navigation = {
              type: nav.type, // 'navigate', 'reload', 'back_forward', 'prerender'
              redirectTime: nav.redirectEnd - nav.redirectStart,
              dnsTime: nav.domainLookupEnd - nav.domainLookupStart,
              tcpTime: nav.connectEnd - nav.connectStart,
              sslTime: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
              ttfb: nav.responseStart,
              requestTime: nav.responseStart - nav.requestStart,
              responseTime: nav.responseEnd - nav.responseStart,
              downloadTime: nav.responseEnd - nav.responseStart,
              domParseTime: nav.domInteractive - nav.responseEnd,
              domContentLoadedTime: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
              domInteractive: nav.domInteractive,
              domContentLoaded: nav.domContentLoadedEventEnd,
              domComplete: nav.domComplete,
              loadEventEnd: nav.loadEventEnd,
              totalTime: nav.loadEventEnd || nav.duration,
              transferSize: nav.transferSize,
              protocol: nav.nextHopProtocol
            };
            window.__perfMonitor.ttfb = nav.responseStart;
          }
        } catch (e) { }

        // ====== Paint Timing ======
        try {
          const paints = performance.getEntriesByType('paint');
          for (const p of paints) {
            if (p.name === 'first-paint') {
              window.__perfMonitor.firstPaint = p.startTime;
            }
            if (p.name === 'first-contentful-paint') {
              window.__perfMonitor.fcp = p.startTime;
            }
          }
        } catch (e) { }

        // ====== 资源分析 ======
        try {
          const resources = performance.getEntriesByType('resource');
          const resourcesByType = { script: [], css: [], image: [], font: [], xhr: [], fetch: [], other: [] };
          let totalSize = 0;

          // 获取之前的资源列表（用于识别新资源）
          const existingResources = window.__existingResources || new Set();

          for (const r of resources) {
            const isNew = !existingResources.has(r.name);
            let size = r.transferSize || r.encodedBodySize || 0;

            const info = {
              url: r.name,
              shortUrl: r.name.split('?')[0].split('/').pop() || r.name.substring(0, 50),
              type: r.initiatorType,
              startTime: r.startTime,
              duration: r.duration,
              dnsTime: r.domainLookupEnd - r.domainLookupStart,
              tcpTime: r.connectEnd - r.connectStart,
              ttfb: r.responseStart - r.requestStart,
              downloadTime: r.responseEnd - r.responseStart,
              transferSize: size,
              decodedSize: r.decodedBodySize,
              fromCache: r.transferSize === 0 && r.decodedBodySize > 0,
              renderBlocking: r.renderBlockingStatus === 'blocking',
              protocol: r.nextHopProtocol,
              isNew: isNew
            };

            totalSize += size || 0;
            window.__perfMonitor.resources.push(info);

            if (isNew) {
              window.__perfMonitor.newResources.push(info);
            }

            // 分类
            const type = r.initiatorType;
            if (type === 'script') resourcesByType.script.push(info);
            else if (type === 'link' || type === 'css') resourcesByType.css.push(info);
            else if (type === 'img' || type === 'image') resourcesByType.image.push(info);
            else if (type === 'font' || r.name.match(/\.(woff|woff2|ttf|eot|otf)/i)) resourcesByType.font.push(info);
            else if (type === 'xmlhttprequest') resourcesByType.xhr.push(info);
            else if (type === 'fetch') resourcesByType.fetch.push(info);
            else resourcesByType.other.push(info);

            if (r.duration > 500) window.__perfMonitor.slowResources.push(info);
            if (size > 100 * 1024) window.__perfMonitor.largeResources.push(info);
            if (r.renderBlockingStatus === 'blocking') window.__perfMonitor.blockingResources.push(info);
          }

          window.__perfMonitor.resourcesByType = resourcesByType;
          window.__perfMonitor.resourceStats = {
            total: resources.length,
            totalSize: totalSize,
            newResourcesCount: window.__perfMonitor.newResources.length,
            byType: {
              script: { count: resourcesByType.script.length, size: resourcesByType.script.reduce((s, r) => s + (r.transferSize || 0), 0) },
              css: { count: resourcesByType.css.length, size: resourcesByType.css.reduce((s, r) => s + (r.transferSize || 0), 0) },
              image: { count: resourcesByType.image.length, size: resourcesByType.image.reduce((s, r) => s + (r.transferSize || 0), 0) },
              font: { count: resourcesByType.font.length, size: resourcesByType.font.reduce((s, r) => s + (r.transferSize || 0), 0) },
              xhr: { count: resourcesByType.xhr.length, size: resourcesByType.xhr.reduce((s, r) => s + (r.transferSize || 0), 0) },
              fetch: { count: resourcesByType.fetch.length, size: resourcesByType.fetch.reduce((s, r) => s + (r.transferSize || 0), 0) }
            }
          };

          // 更新已存在的资源列表
          window.__existingResources = new Set(resources.map(r => r.name));
        } catch (e) { }

        // ====== DOM 分析 ======
        try {
          const allElements = document.querySelectorAll('*');
          const tagCounts = {};
          let maxDepth = 0;
          let deepestElement = null;
          let maxChildren = 0;
          let widestElement = null;

          allElements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;

            let depth = 0;
            let parent = el;
            while (parent.parentElement) {
              depth++;
              parent = parent.parentElement;
            }
            if (depth > maxDepth) {
              maxDepth = depth;
              deepestElement = { tag: el.tagName, id: el.id, class: el.className?.split?.(' ')?.[0] || '', depth };
            }

            if (el.children.length > maxChildren) {
              maxChildren = el.children.length;
              widestElement = { tag: el.tagName, id: el.id, class: el.className?.split?.(' ')?.[0] || '', children: maxChildren };
            }
          });

          const heavyElements = [];
          allElements.forEach(el => {
            const childCount = el.querySelectorAll('*').length;
            if (childCount > 50) {
              const rect = el.getBoundingClientRect();
              heavyElements.push({
                tag: el.tagName,
                id: el.id || null,
                class: el.className?.split?.(' ')?.[0] || null,
                childCount,
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              });
            }
          });
          heavyElements.sort((a, b) => b.childCount - a.childCount);

          window.__perfMonitor.heavyElements = heavyElements.slice(0, 10);
          window.__perfMonitor.domStats = {
            totalNodes: allElements.length,
            maxDepth,
            deepestElement,
            widestElement,
            maxChildren,
            tagCounts,
            issues: []
          };

          if (allElements.length > 1500) {
            window.__perfMonitor.domStats.issues.push({ type: 'too_many_nodes', message: `DOM 节点过多: ${allElements.length} 个` });
          }
          if (maxDepth > 15) {
            window.__perfMonitor.domStats.issues.push({ type: 'too_deep', message: `DOM 嵌套过深: ${maxDepth} 层` });
          }

          const imagesWithoutSize = document.querySelectorAll('img:not([width]):not([height])');
          if (imagesWithoutSize.length > 0) {
            window.__perfMonitor.domStats.issues.push({
              type: 'images_no_size',
              message: `${imagesWithoutSize.length} 个图片未设置尺寸`,
              images: Array.from(imagesWithoutSize).slice(0, 5).map(img => ({ src: img.src?.split('/').pop()?.substring(0, 30) || 'unknown' }))
            });
          }
        } catch (e) { }

        // ====== LCP Observer（重新注册）======
        try {
          if (window.__lcpObserver) window.__lcpObserver.disconnect();
          window.__lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              const entry = entries[entries.length - 1];
              // 相对于页面切换时间计算
              const lcpTime = entry.startTime;
              window.__perfMonitor.lcp = lcpTime;

              if (entry.element) {
                const el = entry.element;
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();

                window.__perfMonitor.lcpElementDetails = {
                  tag: el.tagName,
                  id: el.id || null,
                  class: el.className || null,
                  isImage: el.tagName === 'IMG',
                  imageSrc: el.tagName === 'IMG' ? el.src : null,
                  imageNaturalSize: el.tagName === 'IMG' ? el.naturalWidth + 'x' + el.naturalHeight : null,
                  hasBackgroundImage: style.backgroundImage !== 'none',
                  backgroundImage: style.backgroundImage !== 'none' ? style.backgroundImage : null,
                  isText: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV'].includes(el.tagName),
                  textContent: el.innerText?.substring(0, 100) || null,
                  fontFamily: style.fontFamily,
                  rect: { width: Math.round(rect.width), height: Math.round(rect.height) }
                };

                if (el.tagName === 'IMG' && el.src) {
                  const imgResource = performance.getEntriesByName(el.src)[0];
                  if (imgResource) {
                    window.__perfMonitor.lcpResourceTiming = {
                      url: el.src,
                      duration: imgResource.duration,
                      transferSize: imgResource.transferSize || imgResource.encodedBodySize || 0,
                      ttfb: imgResource.responseStart - imgResource.startTime,
                      downloadTime: imgResource.responseEnd - imgResource.responseStart
                    };
                  }
                }
              }
            }
          });
          window.__lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) { }

        // ====== CLS Observer（重置值）======
        try {
          if (window.__clsObserver) window.__clsObserver.disconnect();
          window.__perfMonitor.cls = 0;
          window.__perfMonitor.clsEntries = [];

          window.__clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.__perfMonitor.cls += entry.value;
                const sources = (entry.sources || []).map(s => {
                  let el = 'unknown';
                  if (s.node) {
                    el = s.node.tagName || 'unknown';
                    if (s.node.id) el += '#' + s.node.id;
                    else if (s.node.className) el += '.' + (s.node.className.split?.(' ')?.[0] || '');
                  }
                  return { element: el };
                });
                window.__perfMonitor.clsEntries.push({ value: entry.value, time: entry.startTime, sources });
              }
            }
          });
          window.__clsObserver.observe({ type: 'layout-shift', buffered: false }); // 不要 buffered，只记录新的
        } catch (e) { }

        // ====== FID Observer ======
        try {
          if (window.__fidObserver) window.__fidObserver.disconnect();
          window.__fidObserver = new PerformanceObserver((list) => {
            const entry = list.getEntries()[0];
            if (entry) {
              window.__perfMonitor.fid = entry.processingStart - entry.startTime;
              window.__perfMonitor.fidDetails = {
                eventType: entry.name,
                delay: entry.processingStart - entry.startTime,
                processingTime: entry.processingEnd - entry.processingStart
              };
            }
          });
          window.__fidObserver.observe({ type: 'first-input', buffered: false });
        } catch (e) { }

        // ====== INP Observer（重置）======
        try {
          if (window.__inpObserver) window.__inpObserver.disconnect();
          window.__perfMonitor.inp = null;
          window.__perfMonitor.interactions = [];

          window.__inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const duration = entry.duration;
              if (window.__perfMonitor.inp === null || duration > window.__perfMonitor.inp) {
                window.__perfMonitor.inp = duration;
              }
              window.__perfMonitor.interactions.push({
                type: entry.name,
                duration: duration,
                startTime: entry.startTime,
                inputDelay: entry.processingStart - entry.startTime,
                processingTime: entry.processingEnd - entry.processingStart
              });
            }
          });
          window.__inpObserver.observe({ type: 'event', buffered: false, durationThreshold: 16 });
        } catch (e) { }

        // ====== Long Tasks Observer（重置）======
        try {
          if (window.__longTaskObserver) window.__longTaskObserver.disconnect();
          window.__perfMonitor.longTasks = [];

          window.__longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              let source = 'unknown';
              if (entry.attribution && entry.attribution.length > 0) {
                const attr = entry.attribution[0];
                source = attr.containerSrc || attr.containerName || attr.containerType || 'script';
              }
              window.__perfMonitor.longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
                source: source
              });
            }
          });
          window.__longTaskObserver.observe({ type: 'longtask', buffered: false });
        } catch (e) { }

        window.__perfMonitorInitialized = true;
      });

      await this.page.waitForTimeout(500);
    } catch (e) {
      console.warn('注入性能监控失败:', e.message);
    }
  }

  // 计算 SPA 页面的模拟性能指标
  async collectSPAMetrics() {
    const now = Date.now();
    const pageLoadTime = now - this.pageStartTime;

    return await this.page.evaluate((loadTime) => {
      const pm = window.__perfMonitor || {};

      // 对于 SPA 页面切换，模拟一些关键指标
      const result = {
        // 页面切换后的新资源加载时间
        pageLoadTime: loadTime,
        newResourcesLoadTime: 0,
        largestNewResource: null,

        // 当前 DOM 状态
        currentDomNodes: document.querySelectorAll('*').length,

        // 新加载的资源统计
        newResourcesCount: pm.newResources?.length || 0,
        newResourcesTotalSize: 0
      };

      if (pm.newResources && pm.newResources.length > 0) {
        // 计算新资源的最大加载时间
        let maxDuration = 0;
        let largestResource = null;
        let totalSize = 0;

        pm.newResources.forEach(r => {
          totalSize += r.transferSize || 0;
          if (r.duration > maxDuration) {
            maxDuration = r.duration;
            largestResource = r;
          }
        });

        result.newResourcesLoadTime = maxDuration;
        result.largestNewResource = largestResource;
        result.newResourcesTotalSize = totalSize;
      }

      return result;
    }, pageLoadTime);
  }

  async collect() {
    const result = {
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      isSPA: false,
      pageLoadTime: Date.now() - this.pageStartTime,

      webVitals: { lcp: null, fcp: null, cls: null, fid: null, inp: null, ttfb: null },
      navigation: {},
      memory: {},
      dom: {},
      render: {},
      cpu: {},
      fps: {},

      firstPaint: null,
      lcpElementDetails: null,
      lcpResourceTiming: null,
      clsEntries: [],
      fidDetails: null,
      longTasks: [],
      interactions: [],

      resources: [],
      resourcesByType: {},
      resourceStats: {},
      slowResources: [],
      largeResources: [],
      blockingResources: [],
      newResources: [],

      domStats: {},
      heavyElements: [],

      // SPA 特有指标
      spaMetrics: null
    };

    try {
      // CDP 指标
      if (this.cdpSession) {
        const { metrics } = await this.cdpSession.send('Performance.getMetrics');
        const m = {};
        metrics.forEach(metric => m[metric.name] = metric.value);

        result.dom = {
          nodes: Math.round(m.Nodes || 0),
          documents: Math.round(m.Documents || 0),
          frames: Math.round(m.Frames || 0),
          jsEventListeners: Math.round(m.JSEventListeners || 0)
        };

        result.render = {
          layoutCount: Math.round(m.LayoutCount || 0),
          recalcStyleCount: Math.round(m.RecalcStyleCount || 0),
          layoutDuration: Math.round((m.LayoutDuration || 0) * 1000),
          recalcStyleDuration: Math.round((m.RecalcStyleDuration || 0) * 1000)
        };

        // 计算相对于页面切换后的 CPU 使用
        if (this.startMetrics) {
          const elapsed = Date.now() - this.startTimestamp;
          const scriptDelta = ((m.ScriptDuration || 0) - (this.startMetrics.ScriptDuration || 0)) * 1000;
          const taskDelta = ((m.TaskDuration || 0) - (this.startMetrics.TaskDuration || 0)) * 1000;

          result.cpu = {
            scriptDuration: Math.round(scriptDelta),
            taskDuration: Math.round(taskDelta),
            usage: elapsed > 0 ? Math.min(100, Math.round((scriptDelta / elapsed) * 100)) : 0
          };

          // 计算相对于页面切换后的渲染指标
          result.render.layoutCountSinceSwitch = Math.round((m.LayoutCount || 0) - (this.startMetrics.LayoutCount || 0));
          result.render.recalcStyleCountSinceSwitch = Math.round((m.RecalcStyleCount || 0) - (this.startMetrics.RecalcStyleCount || 0));
        }

        result.memory = {
          usedJSHeapSize: m.JSHeapUsedSize,
          totalJSHeapSize: m.JSHeapTotalSize,
          usedJSHeapMB: m.JSHeapUsedSize ? (m.JSHeapUsedSize / 1024 / 1024).toFixed(2) : null
        };
      }

      // 页面数据
      const pageData = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        const perf = performance;

        let memory = null;
        if (perf.memory) {
          memory = {
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            totalJSHeapSize: perf.memory.totalJSHeapSize,
            jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
          };
        }

        return {
          webVitals: {
            lcp: pm.lcp,
            fcp: pm.fcp,
            cls: pm.cls,
            fid: pm.fid,
            inp: pm.inp,
            ttfb: pm.ttfb || pm.navigation?.ttfb
          },
          navigation: pm.navigation || {},
          memory,
          firstPaint: pm.firstPaint,
          lcpElementDetails: pm.lcpElementDetails,
          lcpResourceTiming: pm.lcpResourceTiming,
          clsEntries: pm.clsEntries || [],
          fidDetails: pm.fidDetails,
          longTasks: pm.longTasks || [],
          interactions: pm.interactions || [],
          resources: pm.resources || [],
          resourcesByType: pm.resourcesByType || {},
          resourceStats: pm.resourceStats || {},
          slowResources: pm.slowResources || [],
          largeResources: pm.largeResources || [],
          blockingResources: pm.blockingResources || [],
          newResources: pm.newResources || [],
          domStats: pm.domStats || {},
          heavyElements: pm.heavyElements || []
        };
      });

      // 判断是否是 SPA 页面（通过检查是否有 navigation timing）
      const hasNavigation = pageData.navigation && pageData.navigation.loadEventEnd;
      result.isSPA = !hasNavigation || this.resourcesBeforeSwitch.size > 0;

      // 合并数据
      Object.assign(result.webVitals, pageData.webVitals);
      Object.assign(result.navigation, pageData.navigation);

      if (pageData.memory) {
        result.memory = { ...result.memory, ...pageData.memory };
        if (pageData.memory.usedJSHeapSize) {
          result.memory.usedJSHeapMB = (pageData.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        }
      }

      result.firstPaint = pageData.firstPaint;
      result.lcpElementDetails = pageData.lcpElementDetails;
      result.lcpResourceTiming = pageData.lcpResourceTiming;
      result.clsEntries = pageData.clsEntries;
      result.fidDetails = pageData.fidDetails;
      result.longTasks = pageData.longTasks;
      result.interactions = pageData.interactions;
      result.resources = pageData.resources;
      result.resourcesByType = pageData.resourcesByType;
      result.resourceStats = pageData.resourceStats;
      result.slowResources = pageData.slowResources;
      result.largeResources = pageData.largeResources;
      result.blockingResources = pageData.blockingResources;
      result.newResources = pageData.newResources;
      result.domStats = pageData.domStats;
      result.heavyElements = pageData.heavyElements;

      // 收集 SPA 特有指标
      if (result.isSPA) {
        result.spaMetrics = await this.collectSPAMetrics();
      }

      // FPS
      try {
        result.fps.current = await this.measureFPS();
      } catch (e) { }

    } catch (e) {
      console.warn('采集性能数据失败:', e.message);
    }

    return result;
  }

  async measureFPS() {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        function countFrame(currentTime) {
          frameCount++;
          if (currentTime - startTime >= 500) {
            resolve(Math.round(frameCount / ((currentTime - startTime) / 1000)));
          } else {
            requestAnimationFrame(countFrame);
          }
        }
        requestAnimationFrame(countFrame);
        setTimeout(() => resolve(60), 1000);
      });
    });
  }

  async stop() {
    if (this.cdpSession) {
      try { await this.cdpSession.send('Performance.disable'); } catch (e) { }
    }
  }
}
