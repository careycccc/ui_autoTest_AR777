/**
 * 性能监控类，用于监控和分析网页性能指标
 */
export class PerformanceMonitor {
  /**
   * 构造函数
   * @param {Page} page - Playwright Page 对象
   * @param {Object} config - 配置选项
   */
  constructor(page, config) {
    this.page = page;
    this.config = config || {};
    this.cdpSession = null; // Chrome DevTools Protocol 会话
    this.isInitialized = false; // 是否已初始化
    this.startMetrics = null; // 初始性能指标
    this.startTimestamp = null; // 开始时间戳
    this.pageStartTime = null; // 页面加载开始时间
    this.resourcesBeforeSwitch = new Set(); // 页面切换前的资源集合
  }

  /**
   * 启动性能监控
   */
  async start() {
    try {
      // 只创建一次 CDP 会话（复用连接，避免重复创建的开销）
      if (!this.cdpSession) {
        this.cdpSession = await this.page.context().newCDPSession(this.page);
        await this.cdpSession.send('Performance.enable');
      }

      // 获取初始性能指标
      const { metrics } = await this.cdpSession.send('Performance.getMetrics');
      this.startMetrics = {};
      metrics.forEach(m => this.startMetrics[m.name] = m.value);
      this.startTimestamp = Date.now();
      this.pageStartTime = Date.now();

      this.isInitialized = true;
    } catch (e) {
      // CDP Session 可能失效，重新创建
      try {
        this.cdpSession = await this.page.context().newCDPSession(this.page);
        await this.cdpSession.send('Performance.enable');
        const { metrics } = await this.cdpSession.send('Performance.getMetrics');
        this.startMetrics = {};
        metrics.forEach(m => this.startMetrics[m.name] = m.value);
        this.startTimestamp = Date.now();
        this.pageStartTime = Date.now();
        this.isInitialized = true;
      } catch (e2) {
        console.warn('性能监控初始化失败:', e2.message);
      }
    }
  }

  // 重置性能监控（用于页面切换）
  // async reset() {
  //   try {
  //     // 记录当前已加载的资源
  //     const currentResources = await this.page.evaluate(() => {
  //       return performance.getEntriesByType('resource').map(r => r.name);
  //     });
  //     this.resourcesBeforeSwitch = new Set(currentResources);

  //     // 重置开始时间
  //     this.pageStartTime = Date.now();

  //     // 重置 CDP 指标基准
  //     if (this.cdpSession) {
  //       const { metrics } = await this.cdpSession.send('Performance.getMetrics');
  //       this.startMetrics = {};
  //       metrics.forEach(m => this.startMetrics[m.name] = m.value);
  //       this.startTimestamp = Date.now();
  //     }

  //     // 重置页面内的性能数据
  //     await this.page.evaluate(() => {
  //       window.__perfMonitorInitialized = false;
  //       window.__perfMonitor = null;
  //       window.__pageLoadStartTime = Date.now();
  //     });

  //   } catch (e) {
  //     console.warn('重置性能监控失败:', e.message);
  //   }
  // }
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
        // 记录页面切换的基准时间（performance.now() 和 entry.startTime 用同一个时间轴）
        window.__pageResetTime = performance.now();
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
    if (this.cdpSession) {
      const { metrics } = await this.cdpSession.send('Performance.getMetrics');
      this.startMetrics = {};
      metrics.forEach(m => this.startMetrics[m.name] = m.value);
    }
  }

  /**
   * 等待 LCP 记录完成（浏览器异步记录 LCP，最多等 2 秒）
   */
  async waitForLCP(timeout = 2000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const hasLCP = await this.page.evaluate(() => {
        return performance.getEntriesByType('largest-contentful-paint').length > 0;
      });
      if (hasLCP) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
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
        // try {
        //   const nav = performance.getEntriesByType('navigation')[0];
        //   if (nav) {
        //     window.__perfMonitor.navigation = {
        //       type: nav.type, // 'navigate', 'reload', 'back_forward', 'prerender'
        //       redirectTime: nav.redirectEnd - nav.redirectStart,
        //       dnsTime: nav.domainLookupEnd - nav.domainLookupStart,
        //       tcpTime: nav.connectEnd - nav.connectStart,
        //       sslTime: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
        //       ttfb: nav.responseStart,
        //       requestTime: nav.responseStart - nav.requestStart,
        //       responseTime: nav.responseEnd - nav.responseStart,
        //       downloadTime: nav.responseEnd - nav.responseStart,
        //       domParseTime: nav.domInteractive - nav.responseEnd,
        //       domContentLoadedTime: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        //       domInteractive: nav.domInteractive,
        //       domContentLoaded: nav.domContentLoadedEventEnd,
        //       domComplete: nav.domComplete,
        //       loadEventEnd: nav.loadEventEnd,
        //       totalTime: nav.loadEventEnd || nav.duration,
        //       transferSize: nav.transferSize,
        //       protocol: nav.nextHopProtocol
        //     };
        //     window.__perfMonitor.ttfb = nav.responseStart;
        //   }
        // } catch (e) { }
        // ====== 获取导航时序（仅首次加载有效）======
        try {
          const nav = performance.getEntriesByType('navigation')[0];

          // 只有首次 navigation 才有完整的 timing 数据
          if (nav && nav.type === 'navigate') {
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
            window.__perfMonitor.isFirstLoad = true;  // 标记首次加载
          } else {
            // SPA 切换或其他情况：清空 navigation 数据
            window.__perfMonitor.navigation = {};
            window.__perfMonitor.ttfb = null;
            window.__perfMonitor.isFirstLoad = false;  // 标记为非首次加载
          }
        } catch (e) {
          window.__perfMonitor.navigation = {};
          window.__perfMonitor.ttfb = null;
        }


        // ====== Paint Timing ======
        // try {
        //   const paints = performance.getEntriesByType('paint');
        //   for (const p of paints) {
        //     if (p.name === 'first-paint') {
        //       window.__perfMonitor.firstPaint = p.startTime;
        //     }
        //     if (p.name === 'first-contentful-paint') {
        //       window.__perfMonitor.fcp = p.startTime;
        //     }
        //   }
        // } catch (e) { }
        // ====== Paint Timing ======
        // ====== Paint Timing ======
        try {
          const paints = performance.getEntriesByType('paint');
          const pageLoadStart = window.__pageLoadStartTime || performance.now();

          for (const p of paints) {
            // 只采集本次页面加载后的 paint timing（相对于页面加载时间）
            const paintTime = p.startTime;
            if (paintTime >= 0 && paintTime < 60000) {  // 合理范围内的 paint
              if (p.name === 'first-paint') {
                window.__perfMonitor.firstPaint = paintTime;
              }
              if (p.name === 'first-contentful-paint') {
                window.__perfMonitor.fcp = paintTime;
              }
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
        // try {
        //   if (window.__lcpObserver) window.__lcpObserver.disconnect();
        //   window.__lcpObserver = new PerformanceObserver((list) => {
        //     const entries = list.getEntries();
        //     if (entries.length > 0) {
        //       const entry = entries[entries.length - 1];
        //       // 相对于页面切换时间计算
        //       const lcpTime = entry.startTime;
        //       window.__perfMonitor.lcp = lcpTime;

        //       if (entry.element) {
        //         const el = entry.element;
        //         const style = window.getComputedStyle(el);
        //         const rect = el.getBoundingClientRect();

        //         window.__perfMonitor.lcpElementDetails = {
        //           tag: el.tagName,
        //           id: el.id || null,
        //           class: el.className || null,
        //           isImage: el.tagName === 'IMG',
        //           imageSrc: el.tagName === 'IMG' ? el.src : null,
        //           imageNaturalSize: el.tagName === 'IMG' ? el.naturalWidth + 'x' + el.naturalHeight : null,
        //           hasBackgroundImage: style.backgroundImage !== 'none',
        //           backgroundImage: style.backgroundImage !== 'none' ? style.backgroundImage : null,
        //           isText: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV'].includes(el.tagName),
        //           textContent: el.innerText?.substring(0, 100) || null,
        //           fontFamily: style.fontFamily,
        //           rect: { width: Math.round(rect.width), height: Math.round(rect.height) }
        //         };

        //         if (el.tagName === 'IMG' && el.src) {
        //           const imgResource = performance.getEntriesByName(el.src)[0];
        //           if (imgResource) {
        //             window.__perfMonitor.lcpResourceTiming = {
        //               url: el.src,
        //               duration: imgResource.duration,
        //               transferSize: imgResource.transferSize || imgResource.encodedBodySize || 0,
        //               ttfb: imgResource.responseStart - imgResource.startTime,
        //               downloadTime: imgResource.responseEnd - imgResource.responseStart
        //             };
        //           }
        //         }
        //       }
        //     }
        //   });
        //   window.__lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        // } catch (e) { }
        // ====== LCP Observer（重新注册）======
        try {
          if (window.__lcpObserver) window.__lcpObserver.disconnect();

          // 重置 LCP 值
          window.__perfMonitor.lcp = null;
          window.__perfMonitor.lcpElementDetails = null;
          window.__perfMonitor.lcpResourceTiming = null;

          // 获取已有的 LCP 条目（Chrome DevTools 显示的就是 startTime）
          const existingLCP = performance.getEntriesByType('largest-contentful-paint');
          if (existingLCP.length > 0) {
            // 取最新的 LCP 条目（Chrome DevTools 显示的也是最新的）
            const entry = existingLCP[existingLCP.length - 1];
            // LCP 值就是 entry.startTime（Chrome DevTools 显示的值）
            window.__perfMonitor.lcp = entry.startTime;

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
                    startTime: imgResource.startTime,
                    responseEnd: imgResource.responseEnd,
                    duration: imgResource.duration,
                    transferSize: imgResource.transferSize || imgResource.encodedBodySize || 0,
                    ttfb: imgResource.responseStart - imgResource.startTime,
                    downloadTime: imgResource.responseEnd - imgResource.responseStart
                  };
                }
              }
            }
          }

          // 注册 observer 监听新的 LCP 条目（SPA 切换时可能触发）
          window.__lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
              // 取最新的 LCP
              window.__perfMonitor.lcp = entry.startTime;

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
              }
            }
          });
          window.__lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) { }

        // ====== FCP / First Paint ======
        try {
          const paints = performance.getEntriesByType('paint');

          for (const p of paints) {
            // 直接使用 entry.startTime（这就是 Chrome DevTools 显示的值）
            if (p.name === 'first-paint') {
              window.__perfMonitor.firstPaint = p.startTime;
            }
            if (p.name === 'first-contentful-paint') {
              window.__perfMonitor.fcp = p.startTime;
            }
          }
        } catch (e) { }

        // ====== CLS Observer（重置值）======
        try {
          if (window.__clsObserver) window.__clsObserver.disconnect();

          window.__perfMonitor.cls = 0;
          window.__perfMonitor.clsEntries = [];

          // 获取已有的 CLS 条目（Chrome DevTools 会累加所有 layout-shift）
          const existingCLS = performance.getEntriesByType('layout-shift');
          for (const entry of existingCLS) {
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
          window.__clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) { }


        // ====== FCP / First Paint ======
        try {
          const paints = performance.getEntriesByType('paint');

          for (const p of paints) {
            // 只采集本次页面加载后的 paint timing
            if (p.startTime >= pageLoadStart) {
              if (p.name === 'first-paint') {
                window.__perfMonitor.firstPaint = p.startTime - pageLoadStart;
              }
              if (p.name === 'first-contentful-paint') {
                window.__perfMonitor.fcp = p.startTime - pageLoadStart;
              }
            }
          }
        } catch (e) { }

        // ====== CLS Observer（重置值）======
        try {
          if (window.__clsObserver) window.__clsObserver.disconnect();

          window.__perfMonitor.cls = 0;
          window.__perfMonitor.clsEntries = [];

          // 获取已有的 CLS 条目
          const existingCLS = performance.getEntriesByType('layout-shift');
          for (const entry of existingCLS) {
            if (entry.startTime >= pageLoadStart && !entry.hadRecentInput) {
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

          window.__clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.startTime >= pageLoadStart && !entry.hadRecentInput) {
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
          window.__clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) { }



        // ====== CLS Observer（重置值）======
        // try {
        //   if (window.__clsObserver) window.__clsObserver.disconnect();
        //   window.__perfMonitor.cls = 0;
        //   window.__perfMonitor.clsEntries = [];

        //   window.__clsObserver = new PerformanceObserver((list) => {
        //     for (const entry of list.getEntries()) {
        //       if (!entry.hadRecentInput) {
        //         window.__perfMonitor.cls += entry.value;
        //         const sources = (entry.sources || []).map(s => {
        //           let el = 'unknown';
        //           if (s.node) {
        //             el = s.node.tagName || 'unknown';
        //             if (s.node.id) el += '#' + s.node.id;
        //             else if (s.node.className) el += '.' + (s.node.className.split?.(' ')?.[0] || '');
        //           }
        //           return { element: el };
        //         });
        //         window.__perfMonitor.clsEntries.push({ value: entry.value, time: entry.startTime, sources });
        //       }
        //     }
        //   });
        //   window.__clsObserver.observe({ type: 'layout-shift', buffered: false }); // 不要 buffered，只记录新的
        // } catch (e) { }
        // ====== CLS Observer（重置值）======
        try {
          if (window.__clsObserver) window.__clsObserver.disconnect();

          // 重置 CLS 相关数据
          window.__perfMonitor.cls = 0;
          window.__perfMonitor.clsEntries = [];

          const pageLoadStart = window.__pageLoadStartTime || performance.now();

          // 先获取已有的 CLS 条目（本次页面加载产生的）
          const existingEntries = performance.getEntriesByType('layout-shift');
          for (const entry of existingEntries) {
            if (entry.startTime >= pageLoadStart - 100 && !entry.hadRecentInput) {
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

          // 注册 observer 监听新的 CLS 条目
          window.__clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.startTime >= pageLoadStart - 100 && !entry.hadRecentInput) {
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
          window.__clsObserver.observe({ type: 'layout-shift', buffered: true });
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

  // ============================================================
  // SPA 性能监控：长任务监控
  // ============================================================
  async startLongTaskObserver() {
    await this.page.evaluate(() => {
      // 重置长任务数据
      window.__perfMonitor = window.__perfMonitor || {};
      window.__perfMonitor.longTasks = [];
      window.__perfMonitor.longTaskStartTime = performance.now();

      // 断开旧的 observer
      if (window.__longTaskObserver) {
        window.__longTaskObserver.disconnect();
      }

      // 创建新的长任务 observer
      window.__longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perfMonitor.longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      window.__longTaskObserver.observe({ type: 'longtask', buffered: true });
    });
  }

  async collectLongTasks() {
    return await this.page.evaluate(() => {
      const tasks = window.__perfMonitor?.longTasks || [];
      const startTime = window.__perfMonitor?.longTaskStartTime || 0;
      const endTime = performance.now();

      // 只统计从监控开始到现在产生的长任务
      const relevantTasks = tasks.filter(t => t.startTime >= startTime);

      // 计算总阻塞时间
      const totalBlockingTime = relevantTasks.reduce((sum, t) => sum + t.duration, 0);

      // 最长阻塞时间
      const maxBlockingTime = relevantTasks.length > 0
        ? Math.max(...relevantTasks.map(t => t.duration))
        : 0;

      // 超过 50ms 的长任务次数
      const jankyTaskCount = relevantTasks.filter(t => t.duration > 50).length;

      // 超过 100ms 的严重卡顿次数
      const severeTaskCount = relevantTasks.filter(t => t.duration > 100).length;

      return {
        count: relevantTasks.length,
        totalBlockingTime: totalBlockingTime,
        maxBlockingTime: maxBlockingTime,
        jankyTaskCount: jankyTaskCount,      // 超过 50ms，可能可察觉
        severeTaskCount: severeTaskCount,    // 超过 100ms，明显卡顿
        duration: endTime - startTime,       // 监控总时长
        isJanky: severeTaskCount > 0 || totalBlockingTime > 200  // 是否卡顿
      };
    });
  }

  // ============================================================
  // SPA 性能监控：INP 监控
  // ============================================================
  async startINPTracking() {
    await this.page.evaluate(() => {
      window.__perfMonitor = window.__perfMonitor || {};
      window.__perfMonitor.inp = null;
      window.__perfMonitor.interactions = [];
      window.__perfMonitor.inpStartTime = performance.now();

      // 断开旧的 observer
      if (window.__inpObserver) {
        window.__inpObserver.disconnect();
      }

      // INP observer
      window.__inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          // 更新 INP（取所有交互中的最大值）
          if (window.__perfMonitor.inp === null || duration > window.__perfMonitor.inp) {
            window.__perfMonitor.inp = duration;
          }
          // 记录所有交互
          window.__perfMonitor.interactions.push({
            type: entry.name,
            duration: duration,
            startTime: entry.startTime,
            inputDelay: entry.processingStart - entry.startTime,
            processingTime: entry.processingEnd - entry.processingStart
          });
        }
      });
      window.__inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    });
  }

  async collectINP() {
    return await this.page.evaluate(() => {
      const inp = window.__perfMonitor?.inp || null;
      const interactions = window.__perfMonitor?.interactions || [];
      const startTime = window.__perfMonitor?.inpStartTime || 0;

      // 只统计从监控开始后的交互
      const relevantInteractions = interactions.filter(i => i.startTime >= startTime);

      return {
        inp: inp,
        interactionCount: relevantInteractions.length,
        maxInteractionDuration: relevantInteractions.length > 0
          ? Math.max(...relevantInteractions.map(i => i.duration))
          : null,
        interactions: relevantInteractions,
        grade: inp === null ? 'N/A' : inp < 200 ? 'good' : inp < 500 ? 'needs-improvement' : 'poor'
      };
    });
  }

  // ============================================================
  // SPA 性能监控：自定义伪 LCP（元素渲染监控）
  // ============================================================
  async getLCPByElement(selector = 'body') {
    return await this.page.evaluate((sel) => {
      // 查找目标元素
      const element = document.querySelector(sel);

      if (!element) {
        return { found: false, message: `元素 ${sel} 未找到` };
      }

      // 尝试获取元素的渲染时间
      // 方法1: 通过 LargestContentfulPaint API（如果有）
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const elementLCP = lcpEntries.find(e => e.element === element);

      if (elementLCP) {
        return {
          found: true,
          method: 'LCP API',
          renderTime: elementLCP.startTime,
          element: element.tagName + (element.id ? '#' + element.id : '')
        };
      }

      // 方法2: 手动计算元素渲染时间
      // 通过记录元素可见的时间点
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);

      // 返回当前状态
      return {
        found: true,
        method: 'current-state',
        elementSize: { width: rect.width, height: rect.height },
        opacity: styles.opacity,
        visibility: styles.visibility,
        display: styles.display,
        message: '元素已渲染，具体渲染时间需要通过 PerformanceObserver 捕获'
      };
    }, selector);
  }

  // ============================================================
  // SPA 综合性能采集（替代传统 collect()）
  // ============================================================
  async collectSPAMetrics() {
    const longTasks = await this.collectLongTasks();
    const inpData = await this.collectINP();

    // 获取当前页面 URL 和标题
    const currentUrl = this.page.url();

    return {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      longTasks: longTasks,
      inp: inpData,
      // 兼容旧指标
      webVitals: {
        lcp: null,  // SPA 路由切换没有传统 LCP
        fcp: null,  // SPA 路由切换没有传统 FCP
        cls: null,  // SPA 路由切换需要单独计算
        inp: inpData.inp,
        ttfb: null  // SPA 路由切换没有真正的 TTFB
      }
    };
  }



  // 计算 SPA 页面的模拟性能指标
  async collectSPAMetrics() {
    return await this.page.evaluate(() => {
      var resetTime = window.__pageResetTime || 0;

      var result = {
        pageLoadTime: 0,
        newResourcesLoadTime: 0,
        largestNewResource: null,
        currentDomNodes: document.querySelectorAll('*').length,
        newResourcesCount: 0,
        newResourcesTotalSize: 0
      };

      // 只统计 resetTime 之后 3 秒内加载的资源（排除用户操作期间加载的资源）
      var cutoff = resetTime + 3000;
      var allResources = performance.getEntriesByType('resource');
      var newResources = [];
      for (var i = 0; i < allResources.length; i++) {
        if (allResources[i].startTime > resetTime && allResources[i].startTime < cutoff) {
          newResources.push(allResources[i]);
        }
      }

      result.newResourcesCount = newResources.length;

      if (newResources.length > 0) {
        var maxDuration = 0;
        var largestResource = null;
        var totalSize = 0;
        var latestEnd = 0;

        for (var j = 0; j < newResources.length; j++) {
          var r = newResources[j];
          var size = r.transferSize || r.encodedBodySize || 0;
          totalSize += size;
          if (r.duration > maxDuration) {
            maxDuration = r.duration;
            largestResource = { url: r.name.split('/').pop(), duration: r.duration, size: size };
          }
          var end = r.responseEnd;
          if (end > latestEnd) latestEnd = end;
        }

        result.newResourcesLoadTime = Math.round(maxDuration);
        result.largestNewResource = largestResource;
        result.newResourcesTotalSize = totalSize;
        // 切换耗时 = 最后一个初始资源完成时间 - 页面切换时间
        result.pageLoadTime = Math.round(latestEnd - resetTime);
      }

      return result;
    });
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
      longTaskStats: null,    // 新增
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
        // 计算 CPU 使用
        if (this.startMetrics) {
          const elapsed = Date.now() - this.startTimestamp;
          const scriptDelta = ((m.ScriptDuration || 0) - (this.startMetrics.ScriptDuration || 0)) * 1000;
          const taskDelta = ((m.TaskDuration || 0) - (this.startMetrics.TaskDuration || 0)) * 1000;

          // 🔥 修复：确保 CPU 使用率不为负数，并限制在 0-100 之间
          const rawCpuUsage = elapsed > 100
            ? (taskDelta / elapsed) * 100
            : (m.TaskDuration || 0) * 1000 / Math.max(elapsed, 1) * 100;

          // 确保 CPU 使用率在 0-100 之间
          const cpuUsage = Math.max(0, Math.min(100, Math.round(rawCpuUsage)));

          result.cpu = {
            scriptDuration: Math.round(Math.max(0, scriptDelta)),
            taskDuration: Math.round(Math.max(0, taskDelta)),
            usage: cpuUsage
          };
        }

        result.memory = {
          usedJSHeapSize: m.JSHeapUsedSize,
          totalJSHeapSize: m.JSHeapTotalSize,
          usedJSHeapMB: m.JSHeapUsedSize ? (m.JSHeapUsedSize / 1024 / 1024).toFixed(2) : null
        };
      }

      // 页面数据
      // const pageData = await this.page.evaluate(() => {
      //   const pm = window.__perfMonitor || {};
      //   const perf = performance;

      //   let memory = null;
      //   if (perf.memory) {
      //     memory = {
      //       usedJSHeapSize: perf.memory.usedJSHeapSize,
      //       totalJSHeapSize: perf.memory.totalJSHeapSize,
      //       jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
      //     };
      //   }

      //   // 主动查询 LCP（对于 SPA 切换，Observer 不会触发）
      //   const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      //   const currentLCP = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;

      //   // 主动查询 FCP
      //   const paintEntries = performance.getEntriesByType('paint');
      //   let currentFCP = null;
      //   let currentFirstPaint = null;
      //   for (const p of paintEntries) {
      //     if (p.name === 'first-contentful-paint') {
      //       currentFCP = p.startTime;
      //     }
      //     if (p.name === 'first-paint') {
      //       currentFirstPaint = p.startTime;
      //     }
      //   }

      //   // 主动查询 CLS（累加所有 layout-shift）
      //   const clsEntries = performance.getEntriesByType('layout-shift');
      //   let currentCLS = 0;
      //   for (const entry of clsEntries) {
      //     if (!entry.hadRecentInput) {
      //       currentCLS += entry.value;
      //     }
      //   }

      //   return {
      //     webVitals: {
      //       lcp: currentLCP || pm.lcp,
      //       fcp: currentFCP || pm.fcp,
      //       cls: currentCLS || pm.cls,
      //       fid: pm.fid,
      //       inp: pm.inp,
      //       ttfb: pm.ttfb || pm.navigation?.ttfb
      //     },
      //     navigation: pm.navigation || {},
      //     memory,
      //     firstPaint: currentFirstPaint || pm.firstPaint,
      //     lcpElementDetails: pm.lcpElementDetails,
      //     lcpResourceTiming: pm.lcpResourceTiming,
      //     clsEntries: pm.clsEntries || [],
      //     fidDetails: pm.fidDetails,
      //     longTasks: pm.longTasks || [],
      //     interactions: pm.interactions || [],
      //     resources: pm.resources || [],
      //     resourcesByType: pm.resourcesByType || {},
      //     resourceStats: pm.resourceStats || {},
      //     slowResources: pm.slowResources || [],
      //     largeResources: pm.largeResources || [],
      //     blockingResources: pm.blockingResources || [],
      //     newResources: pm.newResources || [],
      //     domStats: pm.domStats || {},
      //     heavyElements: pm.heavyElements || {}
      //   };
      // });
      const pageData = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        const perf = performance;

        // 查询长任务（兼容旧代码）
        const longTasks = pm.longTasks || [];
        const longTaskCount = longTasks.length;
        const maxLongTask = longTasks.length > 0
          ? Math.max(...longTasks.map(t => t.duration))
          : 0;
        const severeLongTasks = longTasks.filter(t => t.duration > 100);

        // 查询 INP
        const inp = pm.inp || null;

        // 页面切换基准时间（用来区分哪些数据属于当前页面）
        var resetTime = window.__pageResetTime || 0;
        var isFirstPage = (resetTime === 0);

        // ====== LCP ======
        // LCP 的 startTime 是从 navigationStart 算起的绝对时间
        // 首页：直接用（因为 navigationStart 就是首页开始）
        // SPA页面：找 resetTime 之后产生的 LCP 条目
        var lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        var currentLCP = null;
        if (isFirstPage) {
          // 首页：取最新的 LCP
          if (lcpEntries.length > 0) {
            currentLCP = lcpEntries[lcpEntries.length - 1].startTime;
          }
        } else {
          // SPA 页面：找 resetTime 之后的 LCP
          for (var i = lcpEntries.length - 1; i >= 0; i--) {
            if (lcpEntries[i].startTime > resetTime) {
              currentLCP = lcpEntries[i].startTime - resetTime;
              break;
            }
          }
        }

        // 如果 LCP 为空，尝试用视口内最大图片的加载时间
        if (currentLCP === null) {
          try {
            var largestArea = 0;
            var largestImg = null;
            document.querySelectorAll('img').forEach(function (el) {
              var rect = el.getBoundingClientRect();
              if (rect.top < window.innerHeight && rect.bottom > 0) {
                var area = rect.width * rect.height;
                if (area > largestArea && el.src) {
                  largestArea = area;
                  largestImg = el;
                }
              }
            });
            if (largestImg) {
              var imgRes = performance.getEntriesByName(largestImg.src);
              if (imgRes.length > 0) {
                var endTime = imgRes[imgRes.length - 1].responseEnd;
                currentLCP = isFirstPage ? endTime : Math.max(0, endTime - resetTime);
              }
            }
          } catch (e) { }
        }

        // ====== FCP ======
        // FCP 只在首次页面加载时记录，SPA 切换不会有新的
        var paintEntries = performance.getEntriesByType('paint');
        var currentFCP = null;
        if (isFirstPage) {
          for (var j = 0; j < paintEntries.length; j++) {
            if (paintEntries[j].name === 'first-contentful-paint') {
              currentFCP = paintEntries[j].startTime;
              break;
            }
          }
        }
        // SPA 页面 FCP 为 null（正确行为）

        // ====== CLS ======
        // 累加 resetTime 之后的 layout-shift
        var clsEntries = performance.getEntriesByType('layout-shift');
        var currentCLS = 0;
        for (var k = 0; k < clsEntries.length; k++) {
          var entry = clsEntries[k];
          if (!entry.hadRecentInput) {
            if (isFirstPage || entry.startTime > resetTime) {
              currentCLS += entry.value;
            }
          }
        }

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
            lcp: currentLCP,
            fcp: currentFCP,
            cls: currentCLS,
            inp: inp,
            ttfb: pm.ttfb || pm.navigation?.ttfb
          },
          // 新增：长任务数据
          longTasks: {
            count: longTaskCount,
            maxDuration: maxLongTask,
            severeCount: severeLongTasks.length,
            totalBlockingTime: severeLongTasks.reduce((sum, t) => sum + t.duration, 0),
            isJanky: severeLongTasks.length > 0 || maxLongTask > 100
          },
          // 新增：INP 数据
          inpDetails: {
            inp: inp,
            interactionCount: pm.interactions?.length || 0,
            entries: pm.interactions || [],
            grade: inp === null ? 'N/A' : inp < 200 ? 'good' : inp < 500 ? 'needs-improvement' : 'poor'
          },
          navigation: pm.navigation || {},
          memory,
          firstPaint: pm.firstPaint,
          lcpElementDetails: pm.lcpElementDetails,
          lcpResourceTiming: pm.lcpResourceTiming,
          clsEntries: pm.clsEntries || [],
          fidDetails: pm.fidDetails,
          longTasksOld: pm.longTasks || [],
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
      result.longTaskStats = pageData.longTasks;
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
