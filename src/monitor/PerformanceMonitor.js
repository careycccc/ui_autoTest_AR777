export class PerformanceMonitor {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.cdpSession = null;
    this.lastMetrics = null;
    this.lastTimestamp = null;
    this.isInitialized = false;
    this.navigationStart = null;
    this.isMobile = false;
  }

  setMobileMode(isMobile) {
    this.isMobile = isMobile;
  }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Performance.enable');
      this.navigationStart = Date.now();
      this.isInitialized = true;
    } catch (e) {
      console.warn('性能监控初始化失败:', e.message);
    }
  }

  async injectWebVitals() {
    try {
      // 移动端使用简化版监控，减少性能开销
      const isMobile = this.isMobile || this.config.mobileOptimization;
      
      await this.page.evaluate((mobile) => {
        if (window.__perfMonitorInitialized) return;
        
        window.__perfMonitor = {
          webVitals: {
            ttfb: null, fcp: null, lcp: null, cls: 0, fid: null, inp: null,
            domContentLoaded: null, load: null, tti: null, visuallyComplete: null
          },
          longTasks: [],
          frames: {
            count: 0,
            durations: [],
            fps: 0,
            history: []
          },
          gpu: null,
          interactionHappened: false,
          lastVisualChange: 0,
          isMobile: mobile
        };

        // ========== Navigation Timing ==========
        const collectNavTiming = () => {
          try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
              window.__perfMonitor.webVitals.ttfb = nav.responseStart;
              window.__perfMonitor.webVitals.domContentLoaded = nav.domContentLoadedEventEnd;
              window.__perfMonitor.webVitals.load = nav.loadEventEnd > 0 ? nav.loadEventEnd : null;
            } else if (performance.timing) {
              const t = performance.timing;
              window.__perfMonitor.webVitals.ttfb = t.responseStart - t.navigationStart;
              window.__perfMonitor.webVitals.domContentLoaded = t.domContentLoadedEventEnd - t.navigationStart;
              window.__perfMonitor.webVitals.load = t.loadEventEnd > 0 ? t.loadEventEnd - t.navigationStart : null;
            }
          } catch (e) {}
        };
        collectNavTiming();
        setTimeout(collectNavTiming, 1000);

        // ========== FCP ==========
        try {
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
          if (fcpEntry) window.__perfMonitor.webVitals.fcp = fcpEntry.startTime;
        } catch (e) {}

        // ========== LCP ==========
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1];
              window.__perfMonitor.webVitals.lcp = lastEntry.startTime;
              window.__perfMonitor.lastVisualChange = lastEntry.startTime;
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
              const entry = entries[0];
              window.__perfMonitor.webVitals.fid = entry.processingStart - entry.startTime;
              window.__perfMonitor.interactionHappened = true;
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
                window.__perfMonitor.interactionHappened = true;
              }
            }
          }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch (e) {}

        // ========== Long Tasks ==========
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__perfMonitor.longTasks.push({
                startTime: entry.startTime,
                duration: entry.duration
              });
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch (e) {}

        // ========== FPS 监控（移动端简化版）==========
        let frameCount = 0;
        let lastSecondTime = performance.now();
        let previousFrameTime = performance.now();
        
        // 移动端降低采样频率
        const sampleInterval = mobile ? 3 : 1;  // 移动端每 3 帧采样一次
        let sampleCounter = 0;
        
        function trackFrame(currentTime) {
          frameCount++;
          sampleCounter++;
          
          // 移动端降低采样
          if (sampleCounter >= sampleInterval) {
            const frameDuration = currentTime - previousFrameTime;
            previousFrameTime = currentTime;
            
            // 只保留最近 60 帧（移动端保留更少）
            const maxFrames = mobile ? 30 : 60;
            window.__perfMonitor.frames.durations.push(frameDuration / sampleInterval);
            if (window.__perfMonitor.frames.durations.length > maxFrames) {
              window.__perfMonitor.frames.durations.shift();
            }
            
            sampleCounter = 0;
          }
          
          // 每秒计算 FPS
          const elapsed = currentTime - lastSecondTime;
          if (elapsed >= 1000) {
            const fps = Math.round((frameCount * 1000) / elapsed);
            window.__perfMonitor.frames.fps = fps;
            window.__perfMonitor.frames.history.push({
              time: currentTime,
              fps: fps
            });
            
            const maxHistory = mobile ? 30 : 60;
            if (window.__perfMonitor.frames.history.length > maxHistory) {
              window.__perfMonitor.frames.history.shift();
            }
            
            frameCount = 0;
            lastSecondTime = currentTime;
          }
          
          window.__perfMonitor.frames.count++;
          requestAnimationFrame(trackFrame);
        }
        requestAnimationFrame(trackFrame);

        // ========== Visually Complete（简化版）==========
        let lastMutationTime = performance.now();
        
        const mutationObserver = new MutationObserver(() => {
          lastMutationTime = performance.now();
          window.__perfMonitor.lastVisualChange = lastMutationTime;
        });
        
        if (document.body) {
          mutationObserver.observe(document.body, {
            childList: true, 
            subtree: true, 
            attributes: mobile ? false : true  // 移动端不监控属性变化
          });
        }
        
        // 检测视口渲染完成
        const checkVisuallyComplete = () => {
          const now = performance.now();
          const timeSinceLastChange = now - window.__perfMonitor.lastVisualChange;
          
          if (timeSinceLastChange > 500 && !window.__perfMonitor.webVitals.visuallyComplete) {
            window.__perfMonitor.webVitals.visuallyComplete = window.__perfMonitor.lastVisualChange;
          }
          
          if (!window.__perfMonitor.webVitals.visuallyComplete && now < 30000) {
            setTimeout(checkVisuallyComplete, mobile ? 500 : 200);
          }
        };
        setTimeout(checkVisuallyComplete, 500);

        // ========== TTI 计算（简化版）==========
        const calculateTTI = () => {
          const fcp = window.__perfMonitor.webVitals.fcp;
          const domReady = window.__perfMonitor.webVitals.domContentLoaded;
          
          if (!fcp || !domReady) {
            setTimeout(calculateTTI, 500);
            return;
          }
          
          const longTasks = window.__perfMonitor.longTasks;
          const now = performance.now();
          
          let lastLongTaskEnd = fcp;
          for (const task of longTasks) {
            const taskEnd = task.startTime + task.duration;
            if (taskEnd > lastLongTaskEnd) {
              lastLongTaskEnd = taskEnd;
            }
          }
          
          const potentialTTI = Math.max(fcp, lastLongTaskEnd);
          
          if (now - lastLongTaskEnd >= 5000) {
            window.__perfMonitor.webVitals.tti = potentialTTI;
          } else if (now < 30000) {
            setTimeout(calculateTTI, 1000);
          } else {
            window.__perfMonitor.webVitals.tti = potentialTTI;
          }
        };
        setTimeout(calculateTTI, 2000);

        // ========== GPU 信息 ==========
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
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

        window.__perfMonitorInitialized = true;
      }, isMobile);

      await this.page.waitForTimeout(300);
    } catch (e) {
      console.warn('注入性能监控失败:', e.message);
    }
  }

  async collectPageLoadMetrics() {
    await this.page.waitForTimeout(2000);
    
    try {
      const pageData = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        const wv = pm.webVitals || {};
        const frames = pm.frames || {};
        const longTasks = pm.longTasks || [];
        
        // 帧统计
        let frameStats = null;
        const durations = frames.durations || [];
        if (durations.length > 5) {
          const validDurations = durations.filter(d => d > 0 && d < 1000);
          if (validDurations.length > 0) {
            const avgFrameTime = validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
            const jankFrames = validDurations.filter(d => d > 16.67).length;
            frameStats = {
              avgFrameTime: avgFrameTime,
              minFrameTime: Math.min(...validDurations),
              maxFrameTime: Math.max(...validDurations),
              jankCount: jankFrames,
              jankRate: (jankFrames / validDurations.length) * 100,
              totalFrames: validDurations.length
            };
          }
        }
        
        // Long Task 统计
        let longTaskStats = null;
        if (longTasks.length > 0) {
          const taskDurations = longTasks.map(t => t.duration);
          longTaskStats = {
            count: longTasks.length,
            totalDuration: taskDurations.reduce((a, b) => a + b, 0),
            maxDuration: Math.max(...taskDurations),
            avgDuration: taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length
          };
        }
        
        // 资源统计
        const resources = performance.getEntriesByType('resource');
        let totalTransferSize = 0;
        resources.forEach(r => totalTransferSize += r.transferSize || 0);
        
        return {
          timing: {
            ttfb: wv.ttfb,
            fcp: wv.fcp,
            lcp: wv.lcp,
            cls: wv.cls,
            fid: wv.fid,
            inp: wv.inp,
            domContentLoaded: wv.domContentLoaded,
            load: wv.load,
            tti: wv.tti,
            visuallyComplete: wv.visuallyComplete
          },
          resources: {
            domNodes: document.querySelectorAll('*').length,
            jsHeapSize: performance.memory?.usedJSHeapSize,
            requestCount: resources.length,
            transferSize: totalTransferSize
          },
          longTasks: longTaskStats,
          frameStats: frameStats,
          fps: {
            current: frames.fps || 0,
            history: (frames.history || []).slice(-10)
          },
          gpu: pm.gpu,
          interactionHappened: pm.interactionHappened || false
        };
      });
      
      return pageData;
    } catch (e) {
      console.warn('采集页面加载性能失败:', e.message);
      return null;
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
      frameStats: {},
      longTasks: [],
      longTaskStats: null
    };

    try {
      if (this.cdpSession) {
        const { metrics } = await this.cdpSession.send('Performance.getMetrics');
        const metricsMap = {};
        metrics.forEach(m => metricsMap[m.name] = m.value);

        const now = Date.now();
        let layoutsPerSec = 0, styleRecalcsPerSec = 0;
        let cpuUsage = 0;

        if (this.lastMetrics && this.lastTimestamp) {
          const timeDiffMs = now - this.lastTimestamp;
          const timeDiffSec = timeDiffMs / 1000;
          
          if (timeDiffSec > 0) {
            layoutsPerSec = Math.max(0, ((metricsMap.LayoutCount || 0) - (this.lastMetrics.LayoutCount || 0)) / timeDiffSec);
            styleRecalcsPerSec = Math.max(0, ((metricsMap.RecalcStyleCount || 0) - (this.lastMetrics.RecalcStyleCount || 0)) / timeDiffSec);
            
            const taskDurationDiff = (metricsMap.TaskDuration || 0) - (this.lastMetrics.TaskDuration || 0);
            cpuUsage = Math.max(0, Math.min(100, (taskDurationDiff / timeDiffSec) * 100));
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
          totalScriptTime: (metricsMap.ScriptDuration || 0) * 1000,
          totalLayoutTime: (metricsMap.LayoutDuration || 0) * 1000,
          totalTaskTime: (metricsMap.TaskDuration || 0) * 1000
        };
      }

      const pageData = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        const wv = pm.webVitals || {};
        const frames = pm.frames || {};
        const longTasks = pm.longTasks || [];
        
        let frameStats = null;
        const durations = frames.durations || [];
        if (durations.length > 5) {
          const validDurations = durations.filter(d => d > 0 && d < 1000);
          if (validDurations.length > 0) {
            const avgFrameTime = validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
            const jankFrames = validDurations.filter(d => d > 16.67).length;
            frameStats = {
              avgFrameTime: avgFrameTime,
              minFrameTime: Math.min(...validDurations),
              maxFrameTime: Math.max(...validDurations),
              jankCount: jankFrames,
              jankRate: (jankFrames / validDurations.length) * 100,
              totalFrames: validDurations.length
            };
          }
        }
        
        let longTaskStats = null;
        if (longTasks.length > 0) {
          const taskDurations = longTasks.map(t => t.duration);
          longTaskStats = {
            count: longTasks.length,
            totalDuration: taskDurations.reduce((a, b) => a + b, 0),
            maxDuration: Math.max(...taskDurations),
            avgDuration: taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length
          };
        }
        
        return {
          webVitals: wv,
          fps: frames.fps || 0,
          fpsHistory: (frames.history || []).slice(-10),
          frameStats: frameStats,
          gpu: pm.gpu || null,
          longTasks: longTasks,
          longTaskStats: longTaskStats,
          interactionHappened: pm.interactionHappened || false,
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
      result.longTaskStats = pageData.longTaskStats;
      result.frameStats = pageData.frameStats;
      result.interactionHappened = pageData.interactionHappened;
      
      const fpsHistory = pageData.fpsHistory || [];
      result.fps = {
        current: pageData.fps,
        history: fpsHistory,
        avg: fpsHistory.length > 0 ? Math.round(fpsHistory.reduce((a, b) => a + b.fps, 0) / fpsHistory.length) : 0,
        min: fpsHistory.length > 0 ? Math.min(...fpsHistory.map(f => f.fps)) : 0,
        max: fpsHistory.length > 0 ? Math.max(...fpsHistory.map(f => f.fps)) : 0
      };

      // GPU 负载估算（修正版）
      if (result.frameStats && result.frameStats.avgFrameTime > 0) {
        const avgFrameTime = result.frameStats.avgFrameTime;
        let gpuLoad;
        
        if (avgFrameTime <= 1) {
          gpuLoad = 5;
        } else if (avgFrameTime <= 8) {
          gpuLoad = avgFrameTime * 3;
        } else if (avgFrameTime <= 16.67) {
          gpuLoad = 25 + ((avgFrameTime - 8) / 8.67) * 35;
        } else if (avgFrameTime <= 33.33) {
          gpuLoad = 60 + ((avgFrameTime - 16.67) / 16.67) * 30;
        } else {
          gpuLoad = Math.min(100, 90 + ((avgFrameTime - 33.33) / 50) * 10);
        }
        
        result.gpuEstimate = {
          load: Math.round(gpuLoad),
          avgFrameTime: avgFrameTime,
          jankRate: result.frameStats.jankRate,
          note: gpuLoad < 30 ? '轻量级页面' : gpuLoad < 60 ? '正常负载' : gpuLoad < 80 ? '较高负载' : '高负载'
        };
      }

    } catch (e) {
      console.warn('采集性能数据失败:', e.message);
    }

    return result;
  }

  async getWebVitals() {
    try {
      const isInitialized = await this.page.evaluate(() => window.__perfMonitorInitialized);
      if (!isInitialized) {
        await this.injectWebVitals();
      }
      return await this.page.evaluate(() => (window.__perfMonitor || {}).webVitals || {});
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
            ttfb: nav.responseStart - nav.requestStart,
            download: nav.responseEnd - nav.responseStart,
            domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
            load: nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : null
          };
        }
        return null;
      });
    } catch (e) {
      return null;
    }
  }

  async cleanup() {}
}
