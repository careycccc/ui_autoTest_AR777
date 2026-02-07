#!/bin/bash

# ============================================================
# 修复脚本 - 解决多页面性能数据相同的问题
# 运行: chmod +x fix-multipage.sh && ./fix-multipage.sh
# ============================================================

set -e

echo "🔧 开始修复多页面性能采集问题..."

mkdir -p src/monitor
mkdir -p src/utils
mkdir -p src/core

# ============================================================
# 1. 修复 PerformanceMonitor.js - 支持多页面独立采集
# ============================================================
echo "📝 修复 PerformanceMonitor.js..."

cat > src/monitor/PerformanceMonitor.js << 'EOF'
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
        } catch (e) {}

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
        } catch (e) {}

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
        } catch (e) {}

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
        } catch (e) {}

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
                  isText: ['H1','H2','H3','H4','H5','H6','P','SPAN','DIV'].includes(el.tagName),
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
        } catch (e) {}

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
        } catch (e) {}

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
        } catch (e) {}

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
        } catch (e) {}

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
        } catch (e) {}

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
      } catch (e) {}

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
      try { await this.cdpSession.send('Performance.disable'); } catch (e) {}
    }
  }
}
EOF

echo "✅ PerformanceMonitor.js 修复完成"

# ============================================================
# 2. 修复 PageManager.js - 正确重置性能监控
# ============================================================
echo "📝 修复 PageManager.js..."

cat > src/utils/PageManager.js << 'EOF'
export class PageManager {
  constructor(testCase) {
    this.t = testCase;
    this.page = testCase.page;
  }

  async switchTo(pageName, options = {}) {
    const {
      waitForSelector = null,
      waitForUrl = null,
      waitForResponse = null,
      waitTime = 2000,
      collectPreviousPage = true,
      takeScreenshot = true
    } = options;

    console.log(`\n      🔄 页面切换: → ${pageName}`);

    // 1. 完成上一个页面的记录
    if (collectPreviousPage && this.t.currentPageRecord) {
      await this.finishCurrentPage(takeScreenshot);
    }

    // 2. 等待新页面稳定
    await this.waitForPageReady(options);

    // 3. 重置性能监控（关键！）
    await this.t.performanceMonitor.reset();

    // 4. 创建新页面记录
    this.t.createPageRecord(pageName);

    // 5. 重新初始化性能监控
    await this.t.performanceMonitor.start();
    await this.t.performanceMonitor.injectWebVitals();

    // 6. 等待页面稳定
    if (waitTime > 0) {
      await this.page.waitForTimeout(waitTime);
    }

    // 7. 等待更多时间让性能数据收集
    await this.page.waitForTimeout(500);

    // 8. 采集初始性能数据
    await this.collectInitialPerformance(pageName);

    // 9. 截图
    if (takeScreenshot) {
      await this.takePageScreenshot(pageName, 'loaded');
    }

    console.log(`      ✓ 已进入: ${pageName}`);
  }

  async waitForPageReady(options) {
    const { waitForSelector, waitForUrl, waitForResponse } = options;

    if (waitForSelector) {
      try {
        console.log(`      ⏳ 等待元素: ${waitForSelector}`);
        await this.page.waitForSelector(waitForSelector, { timeout: 15000 });
      } catch (e) {
        console.warn(`      ⚠️ 等待元素超时: ${waitForSelector}`);
      }
    }

    if (waitForUrl) {
      try {
        console.log(`      ⏳ 等待URL: ${waitForUrl}`);
        await this.page.waitForURL(waitForUrl, { timeout: 15000 });
      } catch (e) {
        console.warn(`      ⚠️ 等待URL超时`);
      }
    }

    if (waitForResponse) {
      try {
        console.log(`      ⏳ 等待API响应...`);
        await waitForResponse;
      } catch (e) {
        console.warn(`      ⚠️ 等待响应超时`);
      }
    }

    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (e) {}
  }

  async finishCurrentPage(takeScreenshot = true) {
    if (!this.t.currentPageRecord) return;

    const pageName = this.t.currentPageRecord.name;
    console.log(`\n      📊 完成页面采集: ${pageName}`);

    this.t.currentPageRecord.endTime = new Date().toISOString();
    this.t.currentPageRecord.url = this.page.url();

    try {
      // 等待一下让数据稳定
      await this.page.waitForTimeout(300);
      
      const perfData = await this.t.performanceMonitor.collect();
      perfData.url = this.t.currentPageRecord.url;
      perfData.device = this.t.currentDevice?.name || 'Desktop';
      perfData.pageName = pageName;
      
      this.t.currentPageRecord.performanceData = perfData;
      this.t.performanceData.push(perfData);

      this.printPerformanceSummary(perfData);

      const violations = await this.t.thresholdChecker.check(perfData, pageName);
      if (violations.length > 0) {
        this.t.currentPageRecord.thresholdViolations.push(...violations);
        this.t.thresholdViolations.push(...violations);
        violations.forEach(v => {
          const icon = v.level === 'critical' ? '🔴' : '🟡';
          console.log(`      ${icon} ${v.message}`);
        });
      }
    } catch (e) {
      console.warn(`      ⚠️ 采集性能失败: ${e.message}`);
    }

    if (takeScreenshot) {
      await this.takePageScreenshot(pageName, 'final');
    }

    if (!this.t.pageRecords.includes(this.t.currentPageRecord)) {
      this.t.pageRecords.push(this.t.currentPageRecord);
    }

    this.printApiSummary();
  }

  async collectInitialPerformance(pageName) {
    try {
      const perfData = await this.t.performanceMonitor.collect();
      perfData.url = this.page.url();
      perfData.device = this.t.currentDevice?.name || 'Desktop';
      perfData.pageName = pageName;
      perfData.isInitialLoad = true;

      if (this.t.currentPageRecord) {
        this.t.currentPageRecord.performanceData = perfData;
        this.t.currentPageRecord.url = this.page.url();
      }
      this.t.performanceData.push(perfData);

      const violations = await this.t.thresholdChecker.check(perfData, pageName);
      if (violations.length > 0) {
        if (this.t.currentPageRecord) {
          this.t.currentPageRecord.thresholdViolations.push(...violations);
        }
        this.t.thresholdViolations.push(...violations);
      }
    } catch (e) {
      console.warn(`      ⚠️ 初始性能采集失败: ${e.message}`);
    }
  }

  async takePageScreenshot(pageName, stage) {
    try {
      const safeName = pageName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-\u4e00-\u9fa5]/g, '');
      const screenshotName = `page-${this.t.pageIndex}-${safeName}-${stage}`;
      const screenshot = await this.t.captureScreenshot(screenshotName);
      
      if (this.t.currentPageRecord) {
        this.t.currentPageRecord.screenshots.push({
          name: `${pageName} - ${stage === 'loaded' ? '页面加载' : '最终状态'}`,
          path: screenshot,
          timestamp: new Date().toISOString()
        });
      }
      console.log(`      📸 截图: ${stage}`);
    } catch (e) {
      console.warn(`      ⚠️ 截图失败: ${e.message}`);
    }
  }

  printPerformanceSummary(perf) {
    const wv = perf.webVitals || {};
    const nav = perf.navigation || {};
    const mem = perf.memory || {};
    const spa = perf.spaMetrics || {};

    console.log(`      ┌────────────────────────────────────┐`);
    console.log(`      │ 📈 性能摘要${perf.isSPA ? ' (SPA页面)' : ''}                    │`);
    console.log(`      ├────────────────────────────────────┤`);

    // SPA 页面显示不同的指标
    if (perf.isSPA && spa.pageLoadTime) {
      console.log(`      │ 页面切换耗时: ${spa.pageLoadTime}ms`);
      if (spa.newResourcesCount > 0) {
        console.log(`      │ 新加载资源: ${spa.newResourcesCount} 个`);
        console.log(`      │ 新资源大小: ${this.formatSize(spa.newResourcesTotalSize)}`);
        if (spa.newResourcesLoadTime > 0) {
          console.log(`      │ 最慢新资源: ${spa.newResourcesLoadTime}ms`);
        }
      }
    }

    // 通用指标
    const metrics = [
      { name: 'LCP', value: wv.lcp, unit: 'ms', good: 2500 },
      { name: 'FCP', value: wv.fcp, unit: 'ms', good: 1800 },
      { name: 'CLS', value: wv.cls, unit: '', good: 0.1, format: v => v?.toFixed(3) },
      { name: 'INP', value: wv.inp, unit: 'ms', good: 200 },
      { name: 'DOM节点', value: perf.dom?.nodes, unit: '', good: 1500 },
      { name: '内存', value: mem.usedJSHeapMB, unit: 'MB', good: 50 }
    ];

    metrics.forEach(m => {
      if (m.value != null) {
        const displayValue = m.format ? m.format(m.value) : Math.round(m.value);
        const status = parseFloat(m.value) < m.good ? '✅' : '⚠️';
        console.log(`      │ ${m.name}: ${displayValue}${m.unit} ${status}`);
      }
    });

    console.log(`      └────────────────────────────────────┘`);
  }

  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  printApiSummary() {
    if (!this.t.currentPageRecord) return;
    const requests = this.t.currentPageRecord.apiRequests || [];
    const errors = this.t.currentPageRecord.apiErrors || [];
    console.log(`      📡 API: ${requests.length} 请求, ${errors.length} 错误`);
  }
}
EOF

echo "✅ PageManager.js 修复完成"

# ============================================================
# 3. 修复 TestCase.js - 在 goto 时也正确重置
# ============================================================
echo "📝 修复 TestCase.js 的 goto 方法..."

# 使用 sed 或直接重写关键方法
# 这里我们创建一个补丁脚本来修改 goto 方法

cat > /tmp/patch_testcase.js << 'PATCH_EOF'
// 这个文件用于说明需要在 TestCase.js 中修改的部分

// 在 goto 方法中，添加 reset 调用：

async goto(url, options = {}) {
  const { pageName = '首页' } = options;

  await this.step('导航到: ' + pageName, async () => {
    // 完成上一个页面
    if (this.currentPageRecord) {
      await this.pageManager.finishCurrentPage(true);
    }

    // 创建新页面
    this.createPageRecord(pageName, url);

    // 重置并重新初始化性能监控
    await this.performanceMonitor.reset();
    await this.performanceMonitor.start();
    
    // 导航
    await this.page.goto(url, {
      waitUntil: 'networkidle',
      timeout: this.config.timeout.navigation
    });
    await this.page.waitForLoadState('load');

    // 注入性能监控
    await this.performanceMonitor.injectWebVitals();
    await this.page.waitForTimeout(1000);

    // 采集性能
    const perfData = await this.performanceMonitor.collect();
    // ... 其余代码保持不变
  });
}
PATCH_EOF

echo "📝 请手动检查 TestCase.js 的 goto 方法是否包含 reset 调用"

# ============================================================
# 4. 更新 PerformanceAnalyzer.js - 支持 SPA 页面分析
# ============================================================
echo "📝 更新 PerformanceAnalyzer.js..."

cat > src/utils/PerformanceAnalyzer.js << 'EOF'
export class PerformanceAnalyzer {
  constructor(thresholds = {}) {
    this.thresholds = {
      lcp: { warning: 2500, critical: 4000 },
      fcp: { warning: 1800, critical: 3000 },
      cls: { warning: 0.1, critical: 0.25 },
      fid: { warning: 100, critical: 300 },
      inp: { warning: 200, critical: 500 },
      ttfb: { warning: 800, critical: 1800 },
      pageLoadTime: { warning: 2000, critical: 5000 }, // SPA 页面切换
      ...thresholds
    };
  }

  analyze(perfData) {
    const analysis = { score: 100, grade: 'A', issues: [], details: {}, isSPA: perfData.isSPA };

    // 根据是否是 SPA 页面选择不同的分析策略
    if (perfData.isSPA) {
      analysis.details.spaLoad = this.analyzeSPALoad(perfData);
      analysis.details.newResources = this.analyzeNewResources(perfData);
    } else {
      analysis.details.lcp = this.analyzeLCP(perfData);
      analysis.details.fcp = this.analyzeFCP(perfData);
      analysis.details.ttfb = this.analyzeTTFB(perfData);
      analysis.details.pageLoad = this.analyzePageLoad(perfData);
    }

    // 通用分析
    analysis.details.cls = this.analyzeCLS(perfData);
    analysis.details.inp = this.analyzeINP(perfData);
    analysis.details.longTasks = this.analyzeLongTasks(perfData);
    analysis.details.dom = this.analyzeDOM(perfData);
    analysis.details.memory = this.analyzeMemory(perfData);

    Object.values(analysis.details).forEach(d => {
      if (d?.issues) analysis.issues.push(...d.issues);
    });

    analysis.issues.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    analysis.score = this.calculateScore(analysis.issues);
    analysis.grade = this.getGrade(analysis.score);

    return analysis;
  }

  // SPA 页面加载分析
  analyzeSPALoad(perfData) {
    const spa = perfData.spaMetrics || {};
    const loadTime = spa.pageLoadTime || perfData.pageLoadTime;

    if (!loadTime) return { status: 'unknown', issues: [] };

    const result = {
      value: loadTime,
      status: this.getStatus(loadTime, this.thresholds.pageLoadTime),
      issues: []
    };

    if (result.status === 'good') return result;

    const issue = {
      type: 'spa_load',
      severity: result.status,
      title: `SPA 页面切换耗时: ${loadTime}ms`,
      description: '从点击到页面内容显示的时间',
      causes: [],
      details: [],
      suggestions: []
    };

    issue.details.push({
      label: '📊 页面切换详情',
      items: [
        `总耗时: ${loadTime}ms`,
        `新加载资源: ${spa.newResourcesCount || 0} 个`,
        `新资源大小: ${this.formatSize(spa.newResourcesTotalSize || 0)}`,
        `新资源加载: ${Math.round(spa.newResourcesLoadTime || 0)}ms`
      ]
    });

    if (spa.newResourcesLoadTime > 1000) {
      issue.causes.push({
        reason: '新资源加载慢',
        detail: `新加载的资源耗时 ${Math.round(spa.newResourcesLoadTime)}ms`,
        suggestion: '预加载关键资源，使用代码分割'
      });
    }

    if (spa.largestNewResource) {
      issue.details.push({
        label: '🐢 最慢的新资源',
        items: [
          `URL: ${this.shortenUrl(spa.largestNewResource.url, 50)}`,
          `类型: ${spa.largestNewResource.type}`,
          `耗时: ${Math.round(spa.largestNewResource.duration)}ms`,
          `大小: ${this.formatSize(spa.largestNewResource.transferSize)}`
        ]
      });
    }

    issue.suggestions.push(
      '使用路由预加载 (prefetch)',
      '代码分割，按需加载',
      '骨架屏提升感知速度',
      '关键资源预加载'
    );

    result.issues.push(issue);
    return result;
  }

  // 新资源加载分析
  analyzeNewResources(perfData) {
    const newResources = perfData.newResources || [];
    const result = { count: newResources.length, issues: [] };

    if (newResources.length === 0) return result;

    const slow = newResources.filter(r => r.duration > 500);
    const large = newResources.filter(r => r.transferSize > 100 * 1024);

    if (slow.length > 0) {
      const sorted = [...slow].sort((a, b) => b.duration - a.duration);
      const issue = {
        type: 'slow_new_resources',
        severity: 'warning',
        title: `${slow.length} 个新加载资源较慢`,
        description: '页面切换后加载的慢资源',
        causes: [],
        details: [],
        suggestions: []
      };

      issue.details.push({
        label: '🐢 慢资源列表',
        items: sorted.slice(0, 5).map(r =>
          `[${r.type}] ${this.shortenUrl(r.url, 40)}\n  耗时: ${Math.round(r.duration)}ms | 大小: ${this.formatSize(r.transferSize)}`
        )
      });

      issue.suggestions.push('预加载关键资源', '使用 CDN', '压缩资源');
      result.issues.push(issue);
    }

    return result;
  }

  analyzeLCP(perfData) {
    const wv = perfData.webVitals || {};
    const value = wv.lcp;
    const lcpDetails = perfData.lcpElementDetails;
    const lcpResource = perfData.lcpResourceTiming;
    
    if (value == null) return { status: 'unknown', message: '无法获取 LCP', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.lcp), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'lcp', severity: result.status,
      title: `LCP 过慢: ${Math.round(value)}ms`,
      description: 'LCP 表示最大内容元素的渲染时间',
      causes: [], details: [], suggestions: []
    };

    if (lcpDetails) {
      if (lcpDetails.isImage && lcpResource) {
        issue.description = `LCP 元素是图片 <${lcpDetails.tag}>`;
        issue.details.push({
          label: '🖼️ LCP 图片详情',
          items: [
            `URL: ${this.shortenUrl(lcpResource.url, 60)}`,
            `总耗时: ${Math.round(lcpResource.duration)}ms`,
            `TTFB: ${Math.round(lcpResource.ttfb)}ms`,
            `下载: ${Math.round(lcpResource.downloadTime)}ms`,
            `大小: ${this.formatSize(lcpResource.transferSize)}`
          ]
        });
        
        if (lcpResource.ttfb > 500) {
          issue.causes.push({ reason: '图片服务器响应慢', detail: `TTFB ${Math.round(lcpResource.ttfb)}ms`, suggestion: '使用 CDN' });
        }
        if (lcpResource.downloadTime > 1000) {
          issue.causes.push({ reason: '图片下载慢', detail: `${Math.round(lcpResource.downloadTime)}ms, ${this.formatSize(lcpResource.transferSize)}`, suggestion: '压缩图片' });
        }
      }
    }

    const blocking = perfData.blockingResources || [];
    if (blocking.length > 0) {
      issue.causes.push({
        reason: `${blocking.length} 个阻塞资源`,
        resources: blocking.slice(0, 5).map(r => ({ url: this.shortenUrl(r.url, 40), duration: `${Math.round(r.duration)}ms` }))
      });
    }

    issue.suggestions.push('预加载 LCP 图片', '使用 WebP 格式', '使用 CDN');
    result.issues.push(issue);
    return result;
  }

  analyzeFCP(perfData) {
    const wv = perfData.webVitals || {};
    const nav = perfData.navigation || {};
    const value = wv.fcp;

    if (value == null) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.fcp), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'fcp', severity: result.status,
      title: `首次内容绘制过慢: ${Math.round(value)}ms`,
      description: 'FCP 表示首次看到内容的时间',
      causes: [], details: [], suggestions: []
    };

    issue.details.push({
      label: '⏱️ 时间分解',
      items: [
        `DNS: ${Math.round(nav.dnsTime || 0)}ms`,
        `TCP: ${Math.round(nav.tcpTime || 0)}ms`,
        `TTFB: ${Math.round(nav.ttfb || 0)}ms`,
        `下载: ${Math.round(nav.responseTime || nav.downloadTime || 0)}ms`
      ]
    });

    const blocking = perfData.blockingResources || [];
    if (blocking.length > 0) {
      issue.causes.push({ reason: `${blocking.length} 个阻塞资源`, resources: blocking.slice(0, 3).map(r => ({ url: this.shortenUrl(r.url, 40), duration: `${Math.round(r.duration)}ms` })) });
    }

    issue.suggestions.push('内联关键 CSS', 'async/defer 加载 JS', '使用 CDN');
    result.issues.push(issue);
    return result;
  }

  analyzeTTFB(perfData) {
    const nav = perfData.navigation || {};
    const value = perfData.webVitals?.ttfb || nav.ttfb;

    if (!value) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.ttfb), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'ttfb', severity: result.status,
      title: `首字节时间过长: ${Math.round(value)}ms`,
      description: 'TTFB 是请求到首字节的时间',
      causes: [], details: [], suggestions: []
    };

    issue.details.push({
      label: '⏱️ 分解',
      items: [`DNS: ${Math.round(nav.dnsTime || 0)}ms`, `TCP: ${Math.round(nav.tcpTime || 0)}ms`, `SSL: ${Math.round(nav.sslTime || 0)}ms`]
    });

    if (nav.dnsTime > 50) issue.causes.push({ reason: 'DNS 解析慢', detail: `${Math.round(nav.dnsTime)}ms`, suggestion: 'dns-prefetch' });
    if (nav.tcpTime > 100) issue.causes.push({ reason: 'TCP 连接慢', detail: `${Math.round(nav.tcpTime)}ms`, suggestion: 'preconnect' });

    issue.suggestions.push('使用 CDN', '优化服务器', '启用缓存');
    result.issues.push(issue);
    return result;
  }

  analyzePageLoad(perfData) {
    const nav = perfData.navigation || {};
    const value = nav.loadEventEnd || nav.totalTime;
    const slow = perfData.slowResources || [];

    if (!value) return { status: 'unknown', issues: [] };

    const threshold = { warning: 3000, critical: 6000 };
    const result = { value, status: this.getStatus(value, threshold), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'page_load', severity: result.status,
      title: `页面加载过慢: ${Math.round(value)}ms`,
      description: '所有资源加载完成',
      causes: [], details: [], suggestions: []
    };

    const stats = perfData.resourceStats || {};
    if (stats.total) {
      issue.details.push({
        label: '📊 资源统计',
        items: [
          `总数: ${stats.total}`,
          `总大小: ${this.formatSize(stats.totalSize)}`,
          `JS: ${stats.byType?.script?.count || 0} 个`,
          `CSS: ${stats.byType?.css?.count || 0} 个`,
          `图片: ${stats.byType?.image?.count || 0} 个`
        ]
      });
    }

    if (slow.length > 0) {
      const sorted = [...slow].sort((a, b) => b.duration - a.duration);
      issue.details.push({
        label: '🐢 最慢资源 TOP 5',
        items: sorted.slice(0, 5).map(r => `[${r.type}] ${this.shortenUrl(r.url, 40)}\n  耗时: ${Math.round(r.duration)}ms | 大小: ${this.formatSize(r.transferSize)}`)
      });
    }

    issue.suggestions.push('压缩图片', '延迟加载', '使用 CDN', '代码分割');
    result.issues.push(issue);
    return result;
  }

  analyzeCLS(perfData) {
    const value = perfData.webVitals?.cls;
    const entries = perfData.clsEntries || [];

    if (value == null) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.cls), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'cls', severity: result.status,
      title: `布局偏移过高: ${value.toFixed(3)}`,
      description: 'CLS 衡量视觉稳定性',
      causes: [], details: [], suggestions: []
    };

    if (entries.length > 0) {
      const significant = entries.filter(e => e.value > 0.05);
      if (significant.length > 0) {
        issue.details.push({
          label: `📐 重大偏移 (${significant.length} 次)`,
          items: significant.slice(0, 5).map(e => {
            let info = `时间: ${Math.round(e.time)}ms, 值: ${e.value.toFixed(4)}`;
            if (e.sources?.length > 0) info += `\n  元素: ${e.sources.map(s => s.element).join(', ')}`;
            return info;
          })
        });
      }
    }

    issue.suggestions.push('设置图片尺寸', '预留动态内容空间', 'font-display: swap');
    result.issues.push(issue);
    return result;
  }

  analyzeINP(perfData) {
    const value = perfData.webVitals?.inp;
    const interactions = perfData.interactions || [];

    if (value == null) return { status: 'unknown', issues: [] };

    const result = { value, status: this.getStatus(value, this.thresholds.inp), issues: [] };
    if (result.status === 'good') return result;

    const issue = {
      type: 'inp', severity: result.status,
      title: `交互响应慢: ${Math.round(value)}ms`,
      description: 'INP 衡量交互响应性',
      causes: [], details: [], suggestions: []
    };

    const slowInteractions = interactions.filter(i => i.duration > 100);
    if (slowInteractions.length > 0) {
      issue.details.push({
        label: '⚡ 慢交互',
        items: slowInteractions.slice(0, 5).map(i => `${i.type}: ${Math.round(i.duration)}ms (输入延迟: ${Math.round(i.inputDelay)}ms, 处理: ${Math.round(i.processingTime)}ms)`)
      });
    }

    issue.suggestions.push('优化事件处理', '使用防抖节流', '拆分长任务');
    result.issues.push(issue);
    return result;
  }

  analyzeLongTasks(perfData) {
    const tasks = perfData.longTasks || [];
    const result = { count: tasks.length, totalTime: tasks.reduce((sum, t) => sum + t.duration, 0), issues: [] };

    if (tasks.length === 0) return result;

    const issue = {
      type: 'long_tasks',
      severity: result.totalTime > 500 ? 'critical' : 'warning',
      title: `${tasks.length} 个长任务，阻塞 ${Math.round(result.totalTime)}ms`,
      description: '长任务阻塞主线程',
      causes: [], details: [], suggestions: []
    };

    const sorted = [...tasks].sort((a, b) => b.duration - a.duration);
    issue.details.push({
      label: '⏳ 长任务列表',
      items: sorted.slice(0, 5).map(t => `开始: ${Math.round(t.startTime)}ms, 持续: ${Math.round(t.duration)}ms\n  来源: ${t.source || '主线程'}`)
    });

    issue.suggestions.push('拆分长任务', 'Web Worker', 'requestIdleCallback');
    result.issues.push(issue);
    return result;
  }

  analyzeDOM(perfData) {
    const dom = perfData.dom || {};
    const nodes = dom.nodes || perfData.domStats?.totalNodes || 0;

    const result = { nodes, issues: [] };
    if (nodes <= 1500) return result;

    const issue = {
      type: 'dom_size',
      severity: nodes > 3000 ? 'critical' : 'warning',
      title: `DOM 节点过多: ${nodes}`,
      description: '影响内存和渲染',
      causes: [], details: [], suggestions: []
    };

    const domStats = perfData.domStats || {};
    if (domStats.tagCounts) {
      const topTags = Object.entries(domStats.tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      issue.details.push({ label: '🏷️ 元素 TOP 10', items: topTags.map(([tag, count]) => `<${tag}>: ${count}`) });
    }

    issue.suggestions.push('虚拟滚动', '延迟渲染', '简化 DOM');
    result.issues.push(issue);
    return result;
  }

  analyzeMemory(perfData) {
    const mem = perfData.memory || {};
    const usedMB = mem.usedJSHeapMB ? parseFloat(mem.usedJSHeapMB) : null;

    if (usedMB == null) return { status: 'unknown', issues: [] };

    const status = usedMB > 100 ? 'critical' : usedMB > 50 ? 'warning' : 'good';
    const result = { used: usedMB, status, issues: [] };

    if (status === 'good') return result;

    const issue = {
      type: 'memory', severity: status,
      title: `内存过高: ${usedMB}MB`,
      description: '可能存在内存泄漏',
      causes: [], details: [], suggestions: []
    };

    issue.details.push({ label: '💾 内存', items: [`已用: ${usedMB}MB`, `总量: ${mem.totalJSHeapSize ? (mem.totalJSHeapSize / 1024 / 1024).toFixed(2) : 'N/A'}MB`] });
    issue.suggestions.push('检查内存泄漏', '清理数据', '使用 WeakMap');
    result.issues.push(issue);
    return result;
  }

  getStatus(value, threshold) {
    if (!threshold) return 'unknown';
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'good';
  }

  calculateScore(issues) {
    let score = 100;
    issues.forEach(i => {
      if (i.severity === 'critical') score -= 20;
      else if (i.severity === 'warning') score -= 10;
      else score -= 5;
    });
    return Math.max(0, Math.min(100, score));
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  shortenUrl(url, max = 50) {
    if (!url) return 'N/A';
    try {
      const p = new URL(url).pathname + new URL(url).search;
      return p.length > max ? '...' + p.slice(-max + 3) : p;
    } catch { return url.length > max ? url.slice(0, max - 3) + '...' : url; }
  }

  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }
}
EOF

echo "✅ PerformanceAnalyzer.js 修复完成"

# ============================================================
# 5. 更新 HTMLReporter.js - 支持 SPA 页面显示
# ============================================================
echo "📝 更新 HTMLReporter.js 以支持 SPA 页面..."

# 由于 HTMLReporter.js 很大，这里只输出需要修改的关键部分提示
cat > /tmp/htmlreporter_patch.txt << 'PATCH_EOF'
在 HTMLReporter.js 的 generateMetricsSection 调用中，需要添加对 SPA 页面的判断：

// 在 generatePageSection 方法中：

// 如果是 SPA 页面，显示不同的指标
const isSPA = perf.isSPA;
const spa = perf.spaMetrics || {};

if (isSPA) {
  // 显示 SPA 特有指标
  ${this.generateMetricsSection('🔄 SPA 页面指标', '页面切换相关', [
    { key: '页面切换耗时', value: spa.pageLoadTime, unit: 'ms', thresholds: { warning: 2000, critical: 5000 } },
    { key: '新资源数量', value: spa.newResourcesCount, unit: '', thresholds: { warning: 20, critical: 50 } },
    { key: '新资源大小', value: spa.newResourcesTotalSize ? spa.newResourcesTotalSize / 1024 : null, unit: 'KB', thresholds: { warning: 500, critical: 1000 } },
    { key: '最慢新资源', value: spa.newResourcesLoadTime, unit: 'ms', thresholds: { warning: 1000, critical: 2000 } }
  ])}
}
PATCH_EOF

echo "📋 请参考 /tmp/htmlreporter_patch.txt 手动更新 HTMLReporter.js"

echo ""
echo "🎉 修复完成！"
echo ""
echo "修复内容："
echo "  ✅ PerformanceMonitor.js - 添加 reset() 方法，支持多页面独立采集"
echo "  ✅ PageManager.js - 在页面切换时正确重置性能监控"
echo "  ✅ PerformanceAnalyzer.js - 支持 SPA 页面分析"
echo ""
echo "关键改动："
echo "  1. 每次页面切换时调用 performanceMonitor.reset()"
echo "  2. 重新注入 Web Vitals 观察者（CLS、INP 等重置）"
echo "  3. 记录新加载的资源（newResources）"
echo "  4. SPA 页面使用不同的性能指标"
echo ""
echo "运行测试："
echo "  npm test"