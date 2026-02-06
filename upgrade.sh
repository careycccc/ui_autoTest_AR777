#!/bin/bash

# ============================================================
# UI自动化测试平台 - 升级脚本
# 添加：CPU/GPU监控、帧率、阈值告警、多设备支持
# ============================================================

echo "🔧 升级性能监控平台..."

# ============================================================
# 1. 更新 config.js - 添加阈值配置和设备配置
# ============================================================
cat > config.js << 'EOF'
export default {
  // 浏览器配置
  browser: {
    headless: false,
    slowMo: 0,
    viewport: { width: 1920, height: 1080 }
  },
  
  // 超时配置（毫秒）
  timeout: {
    test: 60000,
    navigation: 30000,
    action: 10000
  },
  
  // 报告配置
  report: {
    outputDir: './reports',
    screenshots: true,
    video: false
  },
  
  // 性能监控配置
  performance: {
    enabled: true,
    sampleInterval: 500,
    collectCPU: true,
    collectGPU: true,
    collectFPS: true,
    collectLongTasks: true
  },
  
  // 网络监控配置
  network: {
    enabled: true,
    captureBody: true,
    maxBodySize: 50000
  },
  
  // 截图配置
  screenshot: {
    onStep: true,
    onError: true,
    onThresholdExceeded: true,  // 阈值超标时截图
    fullPage: false
  },
  
  // ============================================================
  // 性能阈值配置 - 超过阈值会告警并截图
  // ============================================================
  thresholds: {
    // Web Vitals 阈值
    lcp: { warning: 2500, critical: 4000 },           // ms
    cls: { warning: 0.1, critical: 0.25 },            // 分数
    inp: { warning: 200, critical: 500 },             // ms
    fcp: { warning: 1800, critical: 3000 },           // ms
    ttfb: { warning: 800, critical: 1800 },           // ms
    fid: { warning: 100, critical: 300 },             // ms
    
    // 内存阈值
    jsHeapSize: { warning: 50, critical: 100 },       // MB
    
    // DOM 阈值
    domNodes: { warning: 1500, critical: 3000 },
    jsEventListeners: { warning: 500, critical: 1000 },
    
    // 渲染阈值
    layoutsPerSec: { warning: 50, critical: 100 },
    styleRecalcsPerSec: { warning: 50, critical: 100 },
    
    // CPU 阈值
    cpuUsage: { warning: 50, critical: 80 },          // 百分比
    longTaskDuration: { warning: 50, critical: 100 }, // ms
    longTaskCount: { warning: 5, critical: 10 },      // 个数
    
    // 帧率阈值
    fps: { warning: 50, critical: 30 },               // 低于此值告警
    frameDropRate: { warning: 5, critical: 15 },      // 丢帧率百分比
    
    // 网络阈值
    requestDuration: { warning: 1000, critical: 3000 }, // ms
    failedRequests: { warning: 3, critical: 10 }        // 个数
  },
  
  // ============================================================
  // 设备配置 - 支持多设备测试
  // ============================================================
  devices: {
    // 桌面设备
    desktop: {
      name: 'Desktop Chrome',
      viewport: { width: 1920, height: 1080 },
      userAgent: null,  // 使用默认
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },
    
    // iPhone 系列
    iphone14: {
      name: 'iPhone 14',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    iphone14pro: {
      name: 'iPhone 14 Pro',
      viewport: { width: 393, height: 852 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    iphone14promax: {
      name: 'iPhone 14 Pro Max',
      viewport: { width: 430, height: 932 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    iphone12: {
      name: 'iPhone 12',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    iphoneSE: {
      name: 'iPhone SE',
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    },
    
    // Android 系列
    pixel7: {
      name: 'Google Pixel 7',
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true
    },
    pixel6: {
      name: 'Google Pixel 6',
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true
    },
    samsungS23: {
      name: 'Samsung Galaxy S23',
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    samsungS22: {
      name: 'Samsung Galaxy S22',
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    xiaomi13: {
      name: 'Xiaomi 13',
      viewport: { width: 393, height: 873 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; 2211133C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 2.75,
      isMobile: true,
      hasTouch: true
    },
    huaweiP60: {
      name: 'Huawei P60',
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; MNA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    
    // 平板设备
    ipadPro12: {
      name: 'iPad Pro 12.9',
      viewport: { width: 1024, height: 1366 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    },
    ipadAir: {
      name: 'iPad Air',
      viewport: { width: 820, height: 1180 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    }
  },
  
  // 重试配置
  retry: {
    count: 0,
    delay: 1000
  }
};
EOF

echo "✅ config.js 已更新"

# ============================================================
# 2. 更新 PerformanceMonitor.js - 添加 CPU/GPU/FPS 监控
# ============================================================
cat > src/monitor/PerformanceMonitor.js << 'EOF'
export class PerformanceMonitor {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.cdpSession = null;
    this.lastMetrics = null;
    this.lastTimestamp = null;
    this.lastCPUInfo = null;
    this.longTasks = [];
    this.frameData = [];
    this.isInitialized = false;
  }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Performance.enable');
      
      // 启用 CPU 分析
      if (this.config.collectCPU) {
        try {
          await this.cdpSession.send('Profiler.enable');
        } catch (e) {}
      }
      
      this.isInitialized = true;
    } catch (e) {
      console.warn('性能监控初始化失败:', e.message);
    }
  }

  async injectWebVitals() {
    try {
      await this.page.evaluate(() => {
        // 初始化存储
        window.__perfMonitor = {
          webVitals: {
            lcp: null, cls: 0, inp: null, fcp: null, ttfb: null, fid: null,
            domContentLoaded: null, load: null
          },
          longTasks: [],
          frames: [],
          lastFrameTime: performance.now(),
          frameCount: 0,
          fps: 0,
          gpu: null
        };

        // ========== FCP ==========
        try {
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
          if (fcpEntry) window.__perfMonitor.webVitals.fcp = fcpEntry.startTime;
        } catch (e) {}

        // ========== Navigation Timing ==========
        try {
          const navEntries = performance.getEntriesByType('navigation');
          if (navEntries.length > 0) {
            const nav = navEntries[0];
            window.__perfMonitor.webVitals.ttfb = nav.responseStart;
            window.__perfMonitor.webVitals.domContentLoaded = nav.domContentLoadedEventEnd;
            window.__perfMonitor.webVitals.load = nav.loadEventEnd;
          } else if (performance.timing) {
            const t = performance.timing;
            window.__perfMonitor.webVitals.ttfb = t.responseStart - t.navigationStart;
            window.__perfMonitor.webVitals.domContentLoaded = t.domContentLoadedEventEnd - t.navigationStart;
            window.__perfMonitor.webVitals.load = t.loadEventEnd - t.navigationStart;
          }
        } catch (e) {}

        // ========== LCP ==========
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              window.__perfMonitor.webVitals.lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        // ========== CLS ==========
        try {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                window.__perfMonitor.webVitals.cls = clsValue;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        // ========== FID ==========
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              window.__perfMonitor.webVitals.fid = entries[0].processingStart - entries[0].startTime;
            }
          }).observe({ type: 'first-input', buffered: true });
        } catch (e) {}

        // ========== INP ==========
        try {
          let maxINP = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.interactionId && entry.duration > maxINP) {
                maxINP = entry.duration;
                window.__perfMonitor.webVitals.inp = maxINP;
              }
            }
          }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch (e) {}

        // ========== Long Tasks 监控 ==========
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__perfMonitor.longTasks.push({
                startTime: entry.startTime,
                duration: entry.duration,
                name: entry.name
              });
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch (e) {}

        // ========== FPS 监控 ==========
        let frameCount = 0;
        let lastTime = performance.now();
        
        function measureFPS() {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            window.__perfMonitor.fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
            window.__perfMonitor.frames.push({
              timestamp: currentTime,
              fps: window.__perfMonitor.fps,
              frameCount: frameCount
            });
            frameCount = 0;
            lastTime = currentTime;
          }
          
          requestAnimationFrame(measureFPS);
        }
        requestAnimationFrame(measureFPS);

        // ========== GPU 信息 ==========
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              window.__perfMonitor.gpu = {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
              };
            }
          }
        } catch (e) {}

        window.__webVitalsInitialized = true;
      });

      await this.page.waitForTimeout(500);
    } catch (e) {
      console.warn('注入性能监控失败:', e.message);
    }
  }

  async collect() {
    const result = {
      timestamp: new Date().toISOString(),
      memory: {},
      dom: {},
      render: {},
      webVitals: {},
      cpu: {},
      gpu: {},
      fps: {},
      longTasks: []
    };

    try {
      // ========== CDP 性能指标 ==========
      if (this.cdpSession) {
        const { metrics } = await this.cdpSession.send('Performance.getMetrics');
        const metricsMap = {};
        metrics.forEach(m => metricsMap[m.name] = m.value);

        const now = Date.now();
        let layoutsPerSec = 0, styleRecalcsPerSec = 0;
        let cpuUsage = 0;

        if (this.lastMetrics && this.lastTimestamp) {
          const timeDiff = (now - this.lastTimestamp) / 1000;
          if (timeDiff > 0) {
            layoutsPerSec = ((metricsMap.LayoutCount || 0) - (this.lastMetrics.LayoutCount || 0)) / timeDiff;
            styleRecalcsPerSec = ((metricsMap.RecalcStyleCount || 0) - (this.lastMetrics.RecalcStyleCount || 0)) / timeDiff;
            
            // 计算 CPU 使用率（基于脚本执行时间）
            const taskDiff = (metricsMap.TaskDuration || 0) - (this.lastMetrics.TaskDuration || 0);
            cpuUsage = Math.min(100, (taskDiff / timeDiff) * 100);
          }
        }

        this.lastMetrics = metricsMap;
        this.lastTimestamp = now;

        result.dom = {
          nodes: metricsMap.Nodes || 0,
          documents: metricsMap.Documents || 0,
          frames: metricsMap.Frames || 0,
          jsEventListeners: metricsMap.JSEventListeners || 0
        };

        result.render = {
          layoutCount: metricsMap.LayoutCount || 0,
          layoutsPerSec,
          recalcStyleCount: metricsMap.RecalcStyleCount || 0,
          styleRecalcsPerSec,
          layoutDuration: (metricsMap.LayoutDuration || 0) * 1000,
          scriptDuration: (metricsMap.ScriptDuration || 0) * 1000,
          taskDuration: (metricsMap.TaskDuration || 0) * 1000
        };

        result.cpu = {
          usage: cpuUsage,
          scriptTime: (metricsMap.ScriptDuration || 0) * 1000,
          layoutTime: (metricsMap.LayoutDuration || 0) * 1000,
          recalcStyleTime: (metricsMap.RecalcStyleDuration || 0) * 1000,
          taskTime: (metricsMap.TaskDuration || 0) * 1000
        };
      }

      // ========== 页面内数据 ==========
      const pageData = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        
        return {
          webVitals: pm.webVitals || {},
          fps: pm.fps || 0,
          fpsHistory: (pm.frames || []).slice(-10),
          gpu: pm.gpu || null,
          longTasks: pm.longTasks || [],
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : {}
        };
      });

      result.webVitals = pageData.webVitals;
      result.memory = pageData.memory;
      result.gpu = pageData.gpu;
      result.longTasks = pageData.longTasks;
      
      // FPS 数据
      result.fps = {
        current: pageData.fps,
        history: pageData.fpsHistory,
        avg: pageData.fpsHistory.length > 0 
          ? pageData.fpsHistory.reduce((a, b) => a + b.fps, 0) / pageData.fpsHistory.length 
          : 0,
        min: pageData.fpsHistory.length > 0 
          ? Math.min(...pageData.fpsHistory.map(f => f.fps)) 
          : 0,
        max: pageData.fpsHistory.length > 0 
          ? Math.max(...pageData.fpsHistory.map(f => f.fps)) 
          : 0
      };

      // Long Task 统计
      if (result.longTasks.length > 0) {
        result.longTaskStats = {
          count: result.longTasks.length,
          totalDuration: result.longTasks.reduce((a, b) => a + b.duration, 0),
          maxDuration: Math.max(...result.longTasks.map(t => t.duration)),
          avgDuration: result.longTasks.reduce((a, b) => a + b.duration, 0) / result.longTasks.length
        };
      }

    } catch (e) {
      console.warn('采集性能数据失败:', e.message);
    }

    return result;
  }

  async getWebVitals() {
    try {
      const isInitialized = await this.page.evaluate(() => window.__webVitalsInitialized);
      if (!isInitialized) {
        await this.injectWebVitals();
      }

      return await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        return pm.webVitals || {};
      });
    } catch (e) {
      return {};
    }
  }

  async getLoadTiming() {
    try {
      return await this.page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
          return {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            ssl: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
            ttfb: nav.responseStart - nav.requestStart,
            download: nav.responseEnd - nav.responseStart,
            domParse: nav.domInteractive - nav.responseEnd,
            domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
            load: nav.loadEventEnd - nav.startTime
          };
        }
        return null;
      });
    } catch (e) {
      return null;
    }
  }
}
EOF

echo "✅ PerformanceMonitor.js 已更新"

# ============================================================
# 3. 创建 ThresholdChecker.js - 阈值检查器
# ============================================================
cat > src/monitor/ThresholdChecker.js << 'EOF'
export class ThresholdChecker {
  constructor(thresholds, screenshotFn) {
    this.thresholds = thresholds;
    this.screenshotFn = screenshotFn;
    this.violations = [];
  }

  async check(metrics, context = '') {
    const violations = [];

    // ========== Web Vitals 检查 ==========
    if (metrics.webVitals) {
      const wv = metrics.webVitals;
      
      if (wv.lcp !== null && wv.lcp !== undefined) {
        violations.push(...this.checkMetric('LCP', wv.lcp, this.thresholds.lcp, 'ms'));
      }
      if (wv.cls !== null && wv.cls !== undefined) {
        violations.push(...this.checkMetric('CLS', wv.cls, this.thresholds.cls, ''));
      }
      if (wv.inp !== null && wv.inp !== undefined) {
        violations.push(...this.checkMetric('INP', wv.inp, this.thresholds.inp, 'ms'));
      }
      if (wv.fcp !== null && wv.fcp !== undefined) {
        violations.push(...this.checkMetric('FCP', wv.fcp, this.thresholds.fcp, 'ms'));
      }
      if (wv.ttfb !== null && wv.ttfb !== undefined) {
        violations.push(...this.checkMetric('TTFB', wv.ttfb, this.thresholds.ttfb, 'ms'));
      }
      if (wv.fid !== null && wv.fid !== undefined) {
        violations.push(...this.checkMetric('FID', wv.fid, this.thresholds.fid, 'ms'));
      }
    }

    // ========== 内存检查 ==========
    if (metrics.memory && metrics.memory.usedJSHeapSize) {
      const heapMB = metrics.memory.usedJSHeapSize / 1024 / 1024;
      violations.push(...this.checkMetric('JS Heap', heapMB, this.thresholds.jsHeapSize, 'MB'));
    }

    // ========== DOM 检查 ==========
    if (metrics.dom) {
      if (metrics.dom.nodes) {
        violations.push(...this.checkMetric('DOM Nodes', metrics.dom.nodes, this.thresholds.domNodes, ''));
      }
      if (metrics.dom.jsEventListeners) {
        violations.push(...this.checkMetric('Event Listeners', metrics.dom.jsEventListeners, this.thresholds.jsEventListeners, ''));
      }
    }

    // ========== 渲染检查 ==========
    if (metrics.render) {
      if (metrics.render.layoutsPerSec) {
        violations.push(...this.checkMetric('Layouts/sec', metrics.render.layoutsPerSec, this.thresholds.layoutsPerSec, ''));
      }
      if (metrics.render.styleRecalcsPerSec) {
        violations.push(...this.checkMetric('Style Recalcs/sec', metrics.render.styleRecalcsPerSec, this.thresholds.styleRecalcsPerSec, ''));
      }
    }

    // ========== CPU 检查 ==========
    if (metrics.cpu && metrics.cpu.usage !== undefined) {
      violations.push(...this.checkMetric('CPU Usage', metrics.cpu.usage, this.thresholds.cpuUsage, '%'));
    }

    // ========== FPS 检查（反向，低于阈值告警）==========
    if (metrics.fps && metrics.fps.current) {
      violations.push(...this.checkMetricReverse('FPS', metrics.fps.current, this.thresholds.fps, ''));
    }

    // ========== Long Tasks 检查 ==========
    if (metrics.longTaskStats) {
      violations.push(...this.checkMetric('Long Task Count', metrics.longTaskStats.count, this.thresholds.longTaskCount, ''));
      violations.push(...this.checkMetric('Max Long Task', metrics.longTaskStats.maxDuration, this.thresholds.longTaskDuration, 'ms'));
    }

    // 记录违规
    if (violations.length > 0) {
      for (const v of violations) {
        v.context = context;
        v.timestamp = new Date().toISOString();
        this.violations.push(v);
      }

      // 截图
      if (this.screenshotFn && violations.some(v => v.level === 'critical')) {
        try {
          const screenshotPath = await this.screenshotFn('threshold-violation');
          violations.forEach(v => v.screenshot = screenshotPath);
        } catch (e) {}
      }
    }

    return violations;
  }

  checkMetric(name, value, threshold, unit) {
    const violations = [];
    
    if (!threshold) return violations;

    if (value >= threshold.critical) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.critical,
        level: 'critical',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 超过严重阈值 ${threshold.critical}${unit}`
      });
    } else if (value >= threshold.warning) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.warning,
        level: 'warning',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 超过警告阈值 ${threshold.warning}${unit}`
      });
    }

    return violations;
  }

  checkMetricReverse(name, value, threshold, unit) {
    const violations = [];
    
    if (!threshold) return violations;

    if (value <= threshold.critical) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.critical,
        level: 'critical',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 低于严重阈值 ${threshold.critical}${unit}`
      });
    } else if (value <= threshold.warning) {
      violations.push({
        metric: name,
        value: value,
        threshold: threshold.warning,
        level: 'warning',
        unit: unit,
        message: `${name}: ${value.toFixed(2)}${unit} 低于警告阈值 ${threshold.warning}${unit}`
      });
    }

    return violations;
  }

  getViolations() {
    return this.violations;
  }

  getCriticalViolations() {
    return this.violations.filter(v => v.level === 'critical');
  }

  getWarningViolations() {
    return this.violations.filter(v => v.level === 'warning');
  }

  getSummary() {
    const byMetric = {};
    for (const v of this.violations) {
      if (!byMetric[v.metric]) {
        byMetric[v.metric] = { warning: 0, critical: 0, max: 0 };
      }
      byMetric[v.metric][v.level]++;
      byMetric[v.metric].max = Math.max(byMetric[v.metric].max, v.value);
    }
    return {
      total: this.violations.length,
      critical: this.getCriticalViolations().length,
      warning: this.getWarningViolations().length,
      byMetric
    };
  }
}
EOF

echo "✅ ThresholdChecker.js 已创建"

# ============================================================
# 4. 更新 TestCase.js - 添加多设备支持和阈值检查
# ============================================================
cat > src/core/TestCase.js << 'EOF'
import fs from 'fs';
import path from 'path';
import { Assertions } from './Assertions.js';
import { PerformanceMonitor } from '../monitor/PerformanceMonitor.js';
import { NetworkMonitor } from '../monitor/NetworkMonitor.js';
import { ThresholdChecker } from '../monitor/ThresholdChecker.js';

export class TestCase {
  constructor(page, config, rootDir = process.cwd()) {
    this.page = page;
    this.config = config;
    this.rootDir = rootDir;
    this.tests = [];
    this.beforeEachFn = null;
    this.afterEachFn = null;
    this.currentTest = null;
    this.currentSteps = [];
    this.stepCount = 0;
    this.currentDevice = null;
    
    this.assert = new Assertions(page);
    this.performanceMonitor = new PerformanceMonitor(page, config.performance);
    this.networkMonitor = new NetworkMonitor(page, config.network);
    
    // 阈值检查器
    this.thresholdChecker = new ThresholdChecker(
      config.thresholds,
      (name) => this.captureScreenshot(name)
    );
    
    this.performanceData = [];
    this.networkRequests = [];
    this.thresholdViolations = [];
    
    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir
      : path.join(rootDir, config.report.outputDir);
    
    this.screenshotDir = path.join(reportDir, 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    this.init();
  }

  async init() {
    await this.networkMonitor.start();
    this.networkMonitor.on('request', (req) => {
      this.networkRequests.push(req);
    });
  }

  // ========== 测试定义 API ==========
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  afterEach(fn) {
    this.afterEachFn = fn;
  }

  // ========== 设备模拟 API ==========
  
  async setDevice(deviceName) {
    const device = this.config.devices[deviceName];
    if (!device) {
      console.warn('未找到设备配置: ' + deviceName);
      return;
    }
    
    this.currentDevice = device;
    console.log('      📱 切换设备: ' + device.name);
    
    await this.page.setViewportSize(device.viewport);
    
    // 注意：userAgent 需要在 context 级别设置，这里只是记录
    // 如果需要完全模拟，需要在 TestRunner 创建 context 时设置
  }

  getDevice() {
    return this.currentDevice;
  }

  // ========== 步骤 API ==========
  
  async step(name, fn) {
    this.stepCount++;
    const stepNum = this.stepCount;
    const step = {
      number: stepNum,
      name: name,
      startTime: new Date(),
      status: 'running',
      screenshot: null,
      violations: []
    };
    
    console.log('      📌 Step ' + stepNum + ': ' + name);
    
    try {
      await fn();
      step.status = 'passed';
      
      if (this.config.screenshot.onStep) {
        step.screenshot = await this.captureScreenshot('step-' + stepNum);
      }
      
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.screenshot = await this.captureScreenshot('step-' + stepNum + '-error');
      throw error;
    } finally {
      step.endTime = new Date();
      step.duration = step.endTime - step.startTime;
      this.currentSteps.push(step);
    }
  }

  // ========== 页面操作 API ==========
  
  async goto(url, options = {}) {
    await this.step('导航到: ' + url, async () => {
      await this.performanceMonitor.start();
      
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout.navigation,
        ...options
      });
      
      await this.page.waitForLoadState('load');
      await this.performanceMonitor.injectWebVitals();
      await this.page.waitForTimeout(1000);
      
      // 采集性能数据
      const perfData = await this.performanceMonitor.collect();
      this.performanceData.push({
        url,
        device: this.currentDevice?.name || 'Desktop',
        ...perfData
      });
      
      // 检查阈值
      const violations = await this.thresholdChecker.check(perfData, 'Page Load: ' + url);
      if (violations.length > 0) {
        this.thresholdViolations.push(...violations);
        this.printViolations(violations);
      }
    });
  }

  async click(selector, options = {}) {
    await this.step('点击: ' + selector, async () => {
      await this.page.click(selector, {
        timeout: this.config.timeout.action,
        ...options
      });
    });
  }

  async fill(selector, value, options = {}) {
    await this.step('输入: ' + selector + ' = "' + value + '"', async () => {
      await this.page.fill(selector, value, {
        timeout: this.config.timeout.action,
        ...options
      });
    });
  }

  async type(selector, value, options = {}) {
    await this.step('逐字输入: ' + selector, async () => {
      await this.page.type(selector, value, {
        timeout: this.config.timeout.action,
        ...options
      });
    });
  }

  async press(key) {
    await this.step('按键: ' + key, async () => {
      await this.page.keyboard.press(key);
    });
  }

  async hover(selector) {
    await this.step('悬停: ' + selector, async () => {
      await this.page.hover(selector, {
        timeout: this.config.timeout.action
      });
    });
  }

  async select(selector, value) {
    await this.step('选择: ' + selector + ' = ' + value, async () => {
      await this.page.selectOption(selector, value, {
        timeout: this.config.timeout.action
      });
    });
  }

  async check(selector) {
    await this.step('勾选: ' + selector, async () => {
      await this.page.check(selector, {
        timeout: this.config.timeout.action
      });
    });
  }

  async uncheck(selector) {
    await this.step('取消勾选: ' + selector, async () => {
      await this.page.uncheck(selector, {
        timeout: this.config.timeout.action
      });
    });
  }

  async waitFor(selector, options = {}) {
    await this.step('等待元素: ' + selector, async () => {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeout.action,
        ...options
      });
    });
  }

  async waitForNavigation(options = {}) {
    await this.step('等待页面导航', async () => {
      await this.page.waitForNavigation({
        timeout: this.config.timeout.navigation,
        ...options
      });
    });
  }

  async waitForTimeout(ms) {
    await this.step('等待 ' + ms + 'ms', async () => {
      await this.page.waitForTimeout(ms);
    });
  }

  async scrollTo(selector) {
    await this.step('滚动到: ' + selector, async () => {
      await this.page.locator(selector).scrollIntoViewIfNeeded();
    });
  }

  async uploadFile(selector, filePath) {
    await this.step('上传文件: ' + filePath, async () => {
      await this.page.setInputFiles(selector, filePath);
    });
  }

  // ========== 获取数据 API ==========
  
  async getText(selector) {
    return await this.page.textContent(selector);
  }

  async getValue(selector) {
    return await this.page.inputValue(selector);
  }

  async getAttribute(selector, attr) {
    return await this.page.getAttribute(selector, attr);
  }

  async isVisible(selector) {
    return await this.page.isVisible(selector);
  }

  async isEnabled(selector) {
    return await this.page.isEnabled(selector);
  }

  async isChecked(selector) {
    return await this.page.isChecked(selector);
  }

  async getCount(selector) {
    return await this.page.locator(selector).count();
  }

  // ========== 截图 API ==========
  
  async captureScreenshot(name = 'screenshot') {
    const devicePrefix = this.currentDevice ? this.currentDevice.name.replace(/\s+/g, '-') + '-' : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = devicePrefix + name + '-' + timestamp + '.png';
    const filepath = path.join(this.screenshotDir, filename);
    
    await this.page.screenshot({
      path: filepath,
      type: 'png',
      fullPage: this.config.screenshot.fullPage
    });
    
    return filepath;
  }

  async captureFullPage(name = 'fullpage') {
    const devicePrefix = this.currentDevice ? this.currentDevice.name.replace(/\s+/g, '-') + '-' : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = devicePrefix + name + '-' + timestamp + '.png';
    const filepath = path.join(this.screenshotDir, filename);
    
    await this.page.screenshot({
      path: filepath,
      type: 'png',
      fullPage: true
    });
    
    return filepath;
  }

  async captureElement(selector, name = 'element') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = name + '-' + timestamp + '.png';
    const filepath = path.join(this.screenshotDir, filename);
    
    const element = await this.page.$(selector);
    if (element) {
      await element.screenshot({ path: filepath, type: 'png' });
    }
    
    return filepath;
  }

  // ========== 性能数据 API ==========
  
  async collectPerformance() {
    await this.page.waitForTimeout(500);
    
    const data = await this.performanceMonitor.collect();
    const loadTiming = await this.performanceMonitor.getLoadTiming();
    
    if (loadTiming) {
      data.loadTiming = loadTiming;
    }
    
    data.device = this.currentDevice?.name || 'Desktop';
    data.url = this.page.url();
    
    this.performanceData.push(data);
    
    // 检查阈值
    const violations = await this.thresholdChecker.check(data, 'Performance Check');
    if (violations.length > 0) {
      this.thresholdViolations.push(...violations);
      this.printViolations(violations);
    }
    
    return data;
  }

  async getWebVitals() {
    return await this.performanceMonitor.getWebVitals();
  }

  // ========== 网络请求 API ==========
  
  getNetworkRequests() {
    return this.networkRequests;
  }

  getAPIRequests() {
    return this.networkRequests.filter(r => {
      const url = r.url.toLowerCase();
      const mimeType = r.response?.mimeType || '';
      return url.includes('/api/') || url.includes('graphql') || mimeType.includes('json');
    });
  }

  clearNetworkRequests() {
    this.networkRequests = [];
  }

  // ========== 阈值违规 API ==========
  
  getThresholdViolations() {
    return this.thresholdViolations;
  }

  printViolations(violations) {
    for (const v of violations) {
      const icon = v.level === 'critical' ? '🔴' : '🟡';
      console.log('      ' + icon + ' ' + v.message);
    }
  }

  // ========== 执行脚本 API ==========
  
  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  async evaluateHandle(fn, ...args) {
    return await this.page.evaluateHandle(fn, ...args);
  }
}
EOF

echo "✅ TestCase.js 已更新"

# ============================================================
# 5. 更新 TestRunner.js - 支持多设备测试
# ============================================================
cat > src/core/TestRunner.js << 'EOF'
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { TestCase } from './TestCase.js';
import { HTMLReporter } from '../reporter/HTMLReporter.js';

export class TestRunner {
  constructor(config, rootDir = process.cwd()) {
    this.config = config;
    this.rootDir = rootDir;
    this.results = {
      startTime: null,
      endTime: null,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      thresholdViolations: []
    };
    this.browser = null;
    
    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir
      : path.join(rootDir, config.report.outputDir);
    
    this.reporter = new HTMLReporter(reportDir, config);
  }

  async run(testFiles, options = {}) {
    this.results.startTime = new Date();
    
    // 获取要测试的设备列表
    const devices = options.devices || ['desktop'];
    
    try {
      console.log('🚀 启动浏览器...');
      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo
      });
      
      // 对每个设备运行测试
      for (const deviceName of devices) {
        const device = this.config.devices[deviceName];
        if (!device) {
          console.warn('⚠️ 未找到设备: ' + deviceName);
          continue;
        }
        
        console.log('\n📱 设备: ' + device.name);
        console.log('━'.repeat(50));
        
        for (const file of testFiles) {
          await this.runTestFile(file, device);
        }
      }
      
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
    
    this.results.endTime = new Date();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    await this.reporter.generate(this.results);
    
    return this.results;
  }

  async runTestFile(filePath, device) {
    console.log('\n📁 ' + path.basename(filePath));
    
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(this.rootDir, filePath);
      
      if (!fs.existsSync(absolutePath)) {
        console.error('❌ 文件不存在: ' + absolutePath);
        return;
      }
      
      const testModule = await import('file://' + absolutePath);
      
      if (typeof testModule.default !== 'function') {
        console.error('❌ 测试文件必须导出默认函数');
        return;
      }
      
      // 创建带设备配置的 context
      const contextOptions = {
        viewport: device.viewport,
        deviceScaleFactor: device.deviceScaleFactor || 1,
        isMobile: device.isMobile || false,
        hasTouch: device.hasTouch || false
      };
      
      if (device.userAgent) {
        contextOptions.userAgent = device.userAgent;
      }
      
      const context = await this.browser.newContext(contextOptions);
      const page = await context.newPage();
      
      const testCase = new TestCase(page, this.config, this.rootDir);
      testCase.currentDevice = device;
      
      const suite = {
        name: path.basename(filePath),
        file: filePath,
        device: device.name,
        tests: [],
        startTime: new Date()
      };
      
      await testModule.default(testCase);
      
      for (const test of testCase.tests) {
        const result = await this.runTest(testCase, test);
        suite.tests.push(result);
        
        this.results.total++;
        if (result.status === 'passed') this.results.passed++;
        else if (result.status === 'failed') this.results.failed++;
        else this.results.skipped++;
      }
      
      suite.endTime = new Date();
      suite.duration = suite.endTime - suite.startTime;
      suite.performance = testCase.performanceData;
      suite.networkRequests = testCase.networkRequests;
      suite.thresholdViolations = testCase.getThresholdViolations();
      
      // 汇总阈值违规
      this.results.thresholdViolations.push(...suite.thresholdViolations);
      
      this.results.suites.push(suite);
      
      await context.close();
      
    } catch (error) {
      console.error('❌ 错误:', error.message);
    }
  }

  async runTest(testCase, test) {
    const result = {
      name: test.name,
      device: testCase.currentDevice?.name || 'Desktop',
      status: 'pending',
      startTime: new Date(),
      endTime: null,
      duration: 0,
      error: null,
      steps: [],
      screenshots: [],
      thresholdViolations: []
    };
    
    console.log('\n  🧪 ' + test.name);
    
    testCase.currentTest = result;
    testCase.stepCount = 0;
    
    try {
      if (testCase.beforeEachFn) {
        await testCase.beforeEachFn();
      }
      
      await test.fn();
      
      result.status = 'passed';
      console.log('    ✅ 通过');
      
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        stack: error.stack
      };
      
      console.log('    ❌ 失败: ' + error.message);
      
      if (this.config.screenshot.onError) {
        try {
          const screenshotPath = await testCase.captureScreenshot('error');
          result.screenshots.push({
            type: 'error',
            path: screenshotPath,
            timestamp: new Date().toISOString()
          });
        } catch (e) {}
      }
      
    } finally {
      if (testCase.afterEachFn) {
        try {
          await testCase.afterEachFn();
        } catch (e) {}
      }
    }
    
    result.endTime = new Date();
    result.duration = result.endTime - result.startTime;
    result.steps = [...testCase.currentSteps];
    result.thresholdViolations = testCase.getThresholdViolations();
    testCase.currentSteps = [];
    
    return result;
  }
}
EOF

echo "✅ TestRunner.js 已更新"

# ============================================================
# 6. 更新 src/index.js - 支持多设备配置
# ============================================================
cat > src/index.js << 'EOF'
import { TestRunner } from './core/TestRunner.js';
import config from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================
// 配置要运行的测试文件
// ============================================================
const testFiles = [
  'tests/baidu.test.js',
  // 'tests/example.test.js',
];

// ============================================================
// 配置要测试的设备（从 config.js 中选择）
// ============================================================
const testDevices = [
  'desktop',        // 桌面
  // 'iphone14',       // iPhone 14
  // 'iphone14pro',    // iPhone 14 Pro
  // 'pixel7',         // Google Pixel 7
  // 'samsungS23',     // Samsung S23
  // 'ipadPro12',      // iPad Pro 12.9
];

// ============================================================
// 运行测试
// ============================================================
const absoluteTestFiles = testFiles.map(f => path.join(rootDir, f));
const runner = new TestRunner(config, rootDir);

console.log('\n🧪 UI 自动化测试平台');
console.log('══════════════════════════════════════════');
console.log('📋 测试文件: ' + testFiles.length + ' 个');
console.log('📱 测试设备: ' + testDevices.join(', '));
console.log('══════════════════════════════════════════\n');

runner.run(absoluteTestFiles, { devices: testDevices }).then(results => {
  console.log('\n══════════════════════════════════════════');
  console.log('📊 测试结果');
  console.log('──────────────────────────────────────────');
  console.log('✅ 通过: ' + results.passed);
  console.log('❌ 失败: ' + results.failed);
  console.log('⏭️  跳过: ' + results.skipped);
  console.log('⏱️  耗时: ' + (results.duration / 1000).toFixed(2) + 's');
  
  if (results.thresholdViolations.length > 0) {
    console.log('\n⚠️ 性能告警: ' + results.thresholdViolations.length + ' 个');
    const critical = results.thresholdViolations.filter(v => v.level === 'critical').length;
    const warning = results.thresholdViolations.filter(v => v.level === 'warning').length;
    console.log('   🔴 严重: ' + critical);
    console.log('   🟡 警告: ' + warning);
  }
  
  console.log('══════════════════════════════════════════\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('❌ 测试运行失败:', err);
  process.exit(1);
});
EOF

echo "✅ index.js 已更新"

# ============================================================
# 7. 更新 HTMLReporter.js - 添加更多图表和告警展示
# ============================================================
cat > src/reporter/HTMLReporter.js << 'EOF'
import fs from 'fs';
import path from 'path';

export class HTMLReporter {
  constructor(outputDir, config) {
    this.outputDir = outputDir;
    this.config = config;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  async generate(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const jsonPath = path.join(this.outputDir, 'report-' + timestamp + '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    
    const htmlPath = path.join(this.outputDir, 'report-' + timestamp + '.html');
    const htmlContent = this.generateHTML(results);
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log('\n📊 报告已生成:');
    console.log('   HTML: ' + htmlPath);
    console.log('   JSON: ' + jsonPath);
    
    return { htmlPath, jsonPath };
  }

  generateHTML(results) {
    const { total, passed, failed, skipped, suites, duration, thresholdViolations } = results;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    const allPerformance = [];
    const allNetworkRequests = [];
    const deviceStats = {};
    
    suites.forEach(suite => {
      if (suite.performance) allPerformance.push(...suite.performance);
      if (suite.networkRequests) allNetworkRequests.push(...suite.networkRequests);
      
      const device = suite.device || 'Desktop';
      if (!deviceStats[device]) {
        deviceStats[device] = { total: 0, passed: 0, failed: 0 };
      }
      suite.tests.forEach(test => {
        deviceStats[device].total++;
        if (test.status === 'passed') deviceStats[device].passed++;
        else if (test.status === 'failed') deviceStats[device].failed++;
      });
    });

    const criticalViolations = thresholdViolations.filter(v => v.level === 'critical');
    const warningViolations = thresholdViolations.filter(v => v.level === 'warning');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI自动化测试报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 24px; }
        header h1 { font-size: 32px; margin-bottom: 16px; text-align: center; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 20px; }
        .summary-item { text-align: center; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; }
        .summary-value { font-size: 36px; font-weight: bold; }
        .summary-label { font-size: 14px; opacity: 0.9; }
        .summary-item.passed .summary-value { color: #4ade80; }
        .summary-item.failed .summary-value { color: #f87171; }
        .summary-item.warning .summary-value { color: #fbbf24; }
        
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .tab { padding: 12px 24px; background: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; color: #666; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .tab:hover { background: #f8f9fa; }
        .tab.active { background: #667eea; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .card h3 { color: #333; margin-bottom: 16px; font-size: 18px; display: flex; align-items: center; gap: 8px; }
        
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
        .metric-card { background: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; position: relative; }
        .metric-value { font-size: 28px; font-weight: bold; color: #667eea; }
        .metric-label { color: #666; font-size: 13px; margin-top: 4px; }
        .metric-card.good .metric-value { color: #10b981; }
        .metric-card.warning .metric-value { color: #f59e0b; }
        .metric-card.bad .metric-value { color: #ef4444; }
        .metric-badge { position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; }
        .metric-badge.good { background: #10b981; }
        .metric-badge.warning { background: #f59e0b; }
        .metric-badge.bad { background: #ef4444; }
        
        .alert-box { padding: 16px 20px; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .alert-critical { background: #fee2e2; border-left: 4px solid #ef4444; }
        .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
        .alert-icon { font-size: 20px; }
        .alert-content { flex: 1; }
        .alert-title { font-weight: 600; color: #333; }
        .alert-message { font-size: 14px; color: #666; }
        
        .device-badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 20px; font-size: 12px; font-weight: 500; }
        
        .suite { margin-bottom: 24px; }
        .suite-header { background: #f8f9fa; padding: 16px 20px; border-radius: 12px 12px 0 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .suite-name { font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 12px; }
        .suite-stats { display: flex; gap: 16px; font-size: 14px; }
        .suite-body { background: white; border-radius: 0 0 12px 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        
        .test-case { border-bottom: 1px solid #f0f0f0; }
        .test-case:last-child { border-bottom: none; }
        .test-header { padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
        .test-header:hover { background: #f8f9fa; }
        .test-name { display: flex; align-items: center; gap: 12px; }
        .test-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .test-status.passed { background: #dcfce7; color: #166534; }
        .test-status.failed { background: #fee2e2; color: #991b1b; }
        .test-duration { color: #888; font-size: 13px; }
        
        .test-details { display: none; padding: 0 20px 20px; background: #fafafa; }
        .test-details.open { display: block; }
        
        .step { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: white; border-radius: 8px; margin-bottom: 8px; }
        .step-number { background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
        .step.failed .step-number { background: #ef4444; }
        .step-content { flex: 1; }
        .step-name { font-weight: 500; margin-bottom: 4px; }
        .step-duration { color: #888; font-size: 12px; }
        .step-screenshot img { max-width: 300px; border-radius: 8px; cursor: pointer; margin-top: 8px; border: 1px solid #eee; }
        
        .error-box { background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .error-message { color: #991b1b; font-weight: 500; margin-bottom: 8px; }
        .error-stack { font-family: monospace; font-size: 12px; color: #666; white-space: pre-wrap; max-height: 200px; overflow: auto; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; }
        .url-cell { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .status-badge.completed { background: #dcfce7; color: #166534; }
        .status-badge.failed { background: #fee2e2; color: #991b1b; }
        
        .chart-container { margin-top: 16px; height: 300px; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal img { max-width: 90%; max-height: 90%; border-radius: 8px; }
        .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
        
        .violation-list { max-height: 400px; overflow-y: auto; }
        .violation-item { padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
        .violation-item.critical { background: #fee2e2; border-left: 4px solid #ef4444; }
        .violation-item.warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
        .violation-metric { font-weight: 600; }
        .violation-value { color: #666; font-size: 14px; }
        
        .screenshots-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; margin-top: 16px; }
        .screenshot-item { position: relative; }
        .screenshot-item img { width: 100%; border-radius: 8px; cursor: pointer; border: 1px solid #eee; }
        .screenshot-label { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧪 UI 自动化测试报告</h1>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${total}</div>
                    <div class="summary-label">总用例</div>
                </div>
                <div class="summary-item passed">
                    <div class="summary-value">${passed}</div>
                    <div class="summary-label">通过</div>
                </div>
                <div class="summary-item failed">
                    <div class="summary-value">${failed}</div>
                    <div class="summary-label">失败</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${passRate}%</div>
                    <div class="summary-label">通过率</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${(duration / 1000).toFixed(1)}s</div>
                    <div class="summary-label">耗时</div>
                </div>
                <div class="summary-item warning">
                    <div class="summary-value">${thresholdViolations.length}</div>
                    <div class="summary-label">性能告警</div>
                </div>
            </div>
        </header>

        ${criticalViolations.length > 0 ? `
        <div class="card" style="border-left: 4px solid #ef4444;">
            <h3>🔴 严重性能问题 (${criticalViolations.length})</h3>
            <div class="violation-list">
                ${criticalViolations.slice(0, 10).map(v => `
                <div class="violation-item critical">
                    <div class="violation-metric">${v.metric}</div>
                    <div class="violation-value">${v.message}</div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="tabs">
            <button class="tab active" onclick="showTab('results')">📋 测试结果</button>
            <button class="tab" onclick="showTab('performance')">📊 性能数据</button>
            <button class="tab" onclick="showTab('alerts')">⚠️ 性能告警 (${thresholdViolations.length})</button>
            <button class="tab" onclick="showTab('network')">🌐 网络请求</button>
            <button class="tab" onclick="showTab('screenshots')">📸 截图</button>
            <button class="tab" onclick="showTab('devices')">📱 设备对比</button>
        </div>

        <div id="results" class="tab-content active">
            ${suites.map(suite => this.generateSuiteHTML(suite)).join('')}
        </div>

        <div id="performance" class="tab-content">
            ${this.generatePerformanceHTML(allPerformance)}
        </div>

        <div id="alerts" class="tab-content">
            ${this.generateAlertsHTML(thresholdViolations)}
        </div>

        <div id="network" class="tab-content">
            ${this.generateNetworkHTML(allNetworkRequests)}
        </div>

        <div id="screenshots" class="tab-content">
            ${this.generateScreenshotsHTML(suites)}
        </div>

        <div id="devices" class="tab-content">
            ${this.generateDevicesHTML(suites, deviceStats)}
        </div>
    </div>

    <div class="modal" id="imageModal" onclick="closeModal()">
        <span class="modal-close">&times;</span>
        <img id="modalImage" src="">
    </div>

    <script>
        function showTab(tabId) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }
        function toggleTest(el) {
            el.nextElementSibling.classList.toggle('open');
        }
        function openImage(src) {
            document.getElementById('modalImage').src = src;
            document.getElementById('imageModal').classList.add('open');
        }
        function closeModal() {
            document.getElementById('imageModal').classList.remove('open');
        }
        ${this.generateChartScript(allPerformance)}
    </script>
</body>
</html>`;
  }

  generateSuiteHTML(suite) {
    const passedCount = suite.tests.filter(t => t.status === 'passed').length;
    const failedCount = suite.tests.filter(t => t.status === 'failed').length;
    
    return `
      <div class="suite">
        <div class="suite-header">
          <div class="suite-name">
            📁 ${suite.name}
            <span class="device-badge">${suite.device || 'Desktop'}</span>
          </div>
          <div class="suite-stats">
            <span style="color: #10b981">✓ ${passedCount}</span>
            <span style="color: #ef4444">✗ ${failedCount}</span>
            <span style="color: #888">⏱ ${(suite.duration / 1000).toFixed(2)}s</span>
          </div>
        </div>
        <div class="suite-body">
          ${suite.tests.map(test => this.generateTestHTML(test)).join('')}
        </div>
      </div>
    `;
  }

  generateTestHTML(test) {
    const statusIcon = test.status === 'passed' ? '✓' : '✗';
    
    return `
      <div class="test-case">
        <div class="test-header" onclick="toggleTest(this)">
          <div class="test-name">
            <span class="test-status ${test.status}">${statusIcon} ${test.status}</span>
            <span>${test.name}</span>
          </div>
          <span class="test-duration">${(test.duration / 1000).toFixed(2)}s</span>
        </div>
        <div class="test-details">
          ${test.error ? `
            <div class="error-box">
              <div class="error-message">❌ ${test.error.message}</div>
              <div class="error-stack">${test.error.stack || ''}</div>
            </div>
          ` : ''}
          ${test.steps.length > 0 ? `
            <div style="margin-top: 16px;">
              <h4 style="margin-bottom: 12px; color: #666;">执行步骤</h4>
              ${test.steps.map(step => `
                <div class="step ${step.status}">
                  <div class="step-number">${step.number}</div>
                  <div class="step-content">
                    <div class="step-name">${step.name}</div>
                    <div class="step-duration">${(step.duration / 1000).toFixed(2)}s</div>
                    ${step.screenshot ? `
                      <div class="step-screenshot">
                        <img src="${this.getRelativePath(step.screenshot)}" onclick="openImage(this.src)">
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  generatePerformanceHTML(performanceData) {
    if (performanceData.length === 0) {
      return '<div class="card"><p style="color: #888; text-align: center;">暂无性能数据</p></div>';
    }

    const latest = performanceData[performanceData.length - 1];
    const webVitals = latest.webVitals || {};
    const cpu = latest.cpu || {};
    const fps = latest.fps || {};
    const longTaskStats = latest.longTaskStats || {};

    const getClass = (type, value) => {
      if (value === null || value === undefined) return '';
      const t = this.config?.thresholds?.[type];
      if (!t) return '';
      if (value >= t.critical) return 'bad';
      if (value >= t.warning) return 'warning';
      return 'good';
    };

    const getFpsClass = (value) => {
      if (!value) return '';
      const t = this.config?.thresholds?.fps;
      if (!t) return '';
      if (value <= t.critical) return 'bad';
      if (value <= t.warning) return 'warning';
      return 'good';
    };

    return `
      <div class="card">
        <h3>⚡ Web Vitals</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass('lcp', webVitals.lcp)}">
            <div class="metric-badge ${getClass('lcp', webVitals.lcp)}"></div>
            <div class="metric-value">${webVitals.lcp ? webVitals.lcp.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-label">LCP (最大内容绘制)</div>
          </div>
          <div class="metric-card ${getClass('cls', webVitals.cls)}">
            <div class="metric-badge ${getClass('cls', webVitals.cls)}"></div>
            <div class="metric-value">${webVitals.cls !== undefined ? webVitals.cls.toFixed(4) : 'N/A'}</div>
            <div class="metric-label">CLS (布局偏移)</div>
          </div>
          <div class="metric-card ${getClass('inp', webVitals.inp)}">
            <div class="metric-badge ${getClass('inp', webVitals.inp)}"></div>
            <div class="metric-value">${webVitals.inp ? webVitals.inp.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-label">INP (交互延迟)</div>
          </div>
          <div class="metric-card ${getClass('fcp', webVitals.fcp)}">
            <div class="metric-badge ${getClass('fcp', webVitals.fcp)}"></div>
            <div class="metric-value">${webVitals.fcp ? webVitals.fcp.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-label">FCP (首次绘制)</div>
          </div>
          <div class="metric-card ${getClass('ttfb', webVitals.ttfb)}">
            <div class="metric-badge ${getClass('ttfb', webVitals.ttfb)}"></div>
            <div class="metric-value">${webVitals.ttfb ? webVitals.ttfb.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-label">TTFB (首字节)</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>🖥️ CPU & 帧率</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass('cpuUsage', cpu.usage)}">
            <div class="metric-badge ${getClass('cpuUsage', cpu.usage)}"></div>
            <div class="metric-value">${cpu.usage ? cpu.usage.toFixed(1) + '%' : 'N/A'}</div>
            <div class="metric-label">CPU 使用率</div>
          </div>
          <div class="metric-card ${getFpsClass(fps.current)}">
            <div class="metric-badge ${getFpsClass(fps.current)}"></div>
            <div class="metric-value">${fps.current || 'N/A'}</div>
            <div class="metric-label">当前 FPS</div>
          </div>
          <div class="metric-card ${getFpsClass(fps.avg)}">
            <div class="metric-value">${fps.avg ? fps.avg.toFixed(0) : 'N/A'}</div>
            <div class="metric-label">平均 FPS</div>
          </div>
          <div class="metric-card ${getFpsClass(fps.min)}">
            <div class="metric-value">${fps.min || 'N/A'}</div>
            <div class="metric-label">最低 FPS</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>⏱️ Long Tasks</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass('longTaskCount', longTaskStats.count)}">
            <div class="metric-value">${longTaskStats.count || 0}</div>
            <div class="metric-label">长任务数量</div>
          </div>
          <div class="metric-card ${getClass('longTaskDuration', longTaskStats.maxDuration)}">
            <div class="metric-value">${longTaskStats.maxDuration ? longTaskStats.maxDuration.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-label">最长任务耗时</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${longTaskStats.totalDuration ? longTaskStats.totalDuration.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-label">总阻塞时间</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>💾 内存 & DOM</h3>
        <div class="metrics-grid">
          <div class="metric-card ${getClass('jsHeapSize', latest.memory?.usedJSHeapSize ? latest.memory.usedJSHeapSize / 1024 / 1024 : 0)}">
            <div class="metric-value">${latest.memory?.usedJSHeapSize ? (latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}</div>
            <div class="metric-label">JS Heap</div>
          </div>
          <div class="metric-card ${getClass('domNodes', latest.dom?.nodes)}">
            <div class="metric-value">${latest.dom?.nodes || 'N/A'}</div>
            <div class="metric-label">DOM 节点</div>
          </div>
          <div class="metric-card ${getClass('jsEventListeners', latest.dom?.jsEventListeners)}">
            <div class="metric-value">${latest.dom?.jsEventListeners || 'N/A'}</div>
            <div class="metric-label">事件监听器</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${latest.dom?.frames || 'N/A'}</div>
            <div class="metric-label">Frames</div>
          </div>
        </div>
      </div>

      ${latest.gpu ? `
      <div class="card">
        <h3>🎮 GPU 信息</h3>
        <div class="metrics-grid">
          <div class="metric-card" style="grid-column: span 2;">
            <div class="metric-value" style="font-size: 16px;">${latest.gpu.renderer || 'N/A'}</div>
            <div class="metric-label">GPU 渲染器</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="font-size: 14px;">${latest.gpu.vendor || 'N/A'}</div>
            <div class="metric-label">GPU 厂商</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="card">
        <h3>📈 性能趋势</h3>
        <div class="chart-container">
          <canvas id="perfChart"></canvas>
        </div>
      </div>
    `;
  }

  generateAlertsHTML(violations) {
    if (violations.length === 0) {
      return '<div class="card"><p style="color: #888; text-align: center;">✅ 没有性能告警</p></div>';
    }

    const criticalCount = violations.filter(v => v.level === 'critical').length;
    const warningCount = violations.filter(v => v.level === 'warning').length;

    const byMetric = {};
    violations.forEach(v => {
      if (!byMetric[v.metric]) byMetric[v.metric] = [];
      byMetric[v.metric].push(v);
    });

    return `
      <div class="card">
        <h3>📊 告警统计</h3>
        <div class="metrics-grid">
          <div class="metric-card bad">
            <div class="metric-value">${criticalCount}</div>
            <div class="metric-label">严重</div>
          </div>
          <div class="metric-card warning">
            <div class="metric-value">${warningCount}</div>
            <div class="metric-label">警告</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${Object.keys(byMetric).length}</div>
            <div class="metric-label">涉及指标</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>🔔 所有告警</h3>
        <div class="violation-list">
          ${violations.map(v => `
            <div class="violation-item ${v.level}">
              <div class="violation-metric">${v.metric}</div>
              <div class="violation-value">${v.message}</div>
              ${v.context ? `<div style="color: #888; font-size: 12px; margin-top: 4px;">${v.context}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateNetworkHTML(requests) {
    if (requests.length === 0) {
      return '<div class="card"><p style="color: #888; text-align: center;">暂无网络请求</p></div>';
    }

    const stats = {
      total: requests.length,
      completed: requests.filter(r => r.status === 'completed').length,
      failed: requests.filter(r => r.status === 'failed').length,
      totalSize: requests.reduce((sum, r) => sum + (r.size || 0), 0)
    };

    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return `
      <div class="card">
        <h3>📊 网络统计</h3>
        <div class="metrics-grid">
          <div class="metric-card"><div class="metric-value">${stats.total}</div><div class="metric-label">总请求</div></div>
          <div class="metric-card good"><div class="metric-value">${stats.completed}</div><div class="metric-label">成功</div></div>
          <div class="metric-card ${stats.failed > 0 ? 'bad' : ''}"><div class="metric-value">${stats.failed}</div><div class="metric-label">失败</div></div>
          <div class="metric-card"><div class="metric-value">${formatBytes(stats.totalSize)}</div><div class="metric-label">总大小</div></div>
        </div>
      </div>

      <div class="card">
        <h3>📋 请求详情</h3>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr><th>状态</th><th>方法</th><th>URL</th><th>类型</th><th>大小</th><th>耗时</th><th>HTTP</th></tr>
            </thead>
            <tbody>
              ${requests.slice(0, 100).map(req => `
                <tr>
                  <td><span class="status-badge ${req.status}">${req.status}</span></td>
                  <td><strong>${req.method}</strong></td>
                  <td class="url-cell" title="${req.url}">${req.url}</td>
                  <td>${req.resourceType || '-'}</td>
                  <td>${formatBytes(req.size)}</td>
                  <td>${req.duration ? req.duration.toFixed(0) + 'ms' : '-'}</td>
                  <td>${req.response?.status || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  generateDevicesHTML(suites, deviceStats) {
    return `
      <div class="card">
        <h3>📱 设备测试结果</h3>
        <div class="metrics-grid">
          ${Object.entries(deviceStats).map(([device, stats]) => `
            <div class="metric-card">
              <div class="metric-value">${stats.passed}/${stats.total}</div>
              <div class="metric-label">${device}</div>
              <div style="margin-top: 8px; font-size: 12px; color: ${stats.failed > 0 ? '#ef4444' : '#10b981'}">
                ${stats.failed > 0 ? '❌ ' + stats.failed + ' 失败' : '✅ 全部通过'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateScreenshotsHTML(suites) {
    const allScreenshots = [];
    
    suites.forEach(suite => {
      suite.tests.forEach(test => {
        test.steps.forEach(step => {
          if (step.screenshot) {
            allScreenshots.push({ path: step.screenshot, label: test.name + ' - Step ' + step.number, type: step.status });
          }
        });
        test.screenshots.forEach(s => {
          allScreenshots.push({ path: s.path, label: test.name + ' - ' + s.type, type: 'error' });
        });
      });
    });

    if (allScreenshots.length === 0) {
      return '<div class="card"><p style="color: #888; text-align: center;">暂无截图</p></div>';
    }

    return `
      <div class="card">
        <h3>🖼️ 截图 (${allScreenshots.length})</h3>
        <div class="screenshots-gallery">
          ${allScreenshots.map(s => `
            <div class="screenshot-item">
              <img src="${this.getRelativePath(s.path)}" onclick="openImage(this.src)">
              <div class="screenshot-label" style="background: ${s.type === 'error' ? '#ef4444' : s.type === 'failed' ? '#f59e0b' : '#10b981'}">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateChartScript(performanceData) {
    if (performanceData.length === 0) return '';

    const labels = performanceData.map((_, i) => i + 1);
    const heapData = performanceData.map(p => p.memory?.usedJSHeapSize ? (p.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) : 0);
    const fpsData = performanceData.map(p => p.fps?.current || 0);
    const cpuData = performanceData.map(p => p.cpu?.usage || 0);

    return `
      document.addEventListener('DOMContentLoaded', function() {
        const ctx = document.getElementById('perfChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(labels)},
              datasets: [
                { label: 'JS Heap (MB)', data: ${JSON.stringify(heapData)}, borderColor: '#667eea', yAxisID: 'y', tension: 0.4 },
                { label: 'FPS', data: ${JSON.stringify(fpsData)}, borderColor: '#10b981', yAxisID: 'y1', tension: 0.4 },
                { label: 'CPU (%)', data: ${JSON.stringify(cpuData)}, borderColor: '#f59e0b', yAxisID: 'y2', tension: 0.4 }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { type: 'linear', position: 'left', title: { display: true, text: 'MB' } },
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'FPS' }, min: 0, max: 60 },
                y2: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '%' }, min: 0, max: 100, display: false }
              }
            }
          });
        }
      });
    `;
  }

  getRelativePath(absolutePath) {
    return './screenshots/' + path.basename(absolutePath);
  }
}
EOF

echo "✅ HTMLReporter.js 已更新"

# ============================================================
# 8. 更新测试用例示例
# ============================================================
cat > tests/baidu.test.js << 'EOF'
/**
 * 百度搜索测试 - 多设备 + 性能监控
 */
export default async function(t) {

  t.test('百度首页加载测试', async () => {
    await t.goto('https://www.baidu.com');
    
    await t.step('验证页面标题', async () => {
      await t.assert.titleContains('百度');
    });
    
    await t.step('验证搜索框', async () => {
      await t.assert.visible('#kw');
    });
    
    await t.step('验证搜索按钮', async () => {
      await t.assert.visible('#su');
    });
    
    // 采集并检查性能
    await t.collectPerformance();
  });

  t.test('百度搜索功能测试', async () => {
    await t.goto('https://www.baidu.com');
    
    await t.step('输入搜索词', async () => {
      await t.fill('#kw', 'Playwright 自动化测试');
    });
    
    await t.step('点击搜索', async () => {
      await t.click('#su');
    });
    
    await t.step('等待结果', async () => {
      await t.waitFor('#content_left');
    });
    
    await t.step('验证结果存在', async () => {
      await t.assert.countGreaterThan('#content_left .result', 0);
    });
    
    // 采集性能，检查是否有告警
    await t.collectPerformance();
  });

}
EOF

echo "✅ baidu.test.js 已更新"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ 升级完成！"
echo "════════════════════════════════════════════════════════"
echo ""
echo "新增功能:"
echo "  📊 CPU 使用率监控"
echo "  🎮 GPU 信息采集"
echo "  🎬 帧率 (FPS) 监控"
echo "  ⏱️  Long Tasks 检测"
echo "  ⚠️  性能阈值告警 + 自动截图"
echo "  📱 多设备测试 (iPhone/Android/iPad)"
echo ""
echo "配置设备测试 (编辑 src/index.js):"
echo "  const testDevices = ["
echo "    'desktop',"
echo "    'iphone14',"
echo "    'pixel7',"
echo "    'samsungS23',"
echo "  ];"
echo ""
echo "运行测试:"
echo "  node src/index.js"
echo ""
echo "════════════════════════════════════════════════════════"
