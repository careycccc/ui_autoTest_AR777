export class PageManager {
  constructor(testCase) {
    this.t = testCase;
    this.page = testCase.page;
  }
  // 页面切换
  // async switchTo(pageName, options = {}) {
  //   const {
  //     waitForSelector = null,
  //     waitForUrl = null,
  //     waitForResponse = null,
  //     waitTime = 2000,
  //     collectPreviousPage = true,
  //     takeScreenshot = true
  //   } = options;

  //   console.log(`\n      🔄 页面切换: → ${pageName}`);

  //   // 1. 完成上一个页面的记录
  //   if (collectPreviousPage && this.t.currentPageRecord) {
  //     await this.finishCurrentPage(takeScreenshot);
  //   }

  //   // 2. 等待新页面稳定
  //   await this.waitForPageReady(options);

  //   // 3. 重置性能监控（关键！）
  //   await this.t.performanceMonitor.reset();

  //   // 4. 创建新页面记录
  //   this.t.createPageRecord(pageName);

  //   // 5. 重新初始化性能监控
  //   await this.t.performanceMonitor.start();
  //   await this.t.performanceMonitor.injectWebVitals();

  //   // 6. 等待页面稳定
  //   if (waitTime > 0) {
  //     await this.page.waitForTimeout(waitTime);
  //   }

  //   // 7. 等待更多时间让性能数据收集
  //   await this.page.waitForTimeout(500);

  //   // 8. 采集初始性能数据
  //   await this.collectInitialPerformance(pageName);

  //   // 9. 截图
  //   // if (takeScreenshot) {
  //   //   await this.takePageScreenshot(pageName, 'loaded');
  //   // }
  //   // 9. 截图 - 每个页面只截一张
  //   if (takeScreenshot && !this.t.currentPageRecord?.screenshotTaken) {
  //     await this.takePageScreenshot(pageName, 'loaded');
  //     if (this.t.currentPageRecord) {
  //       this.t.currentPageRecord.screenshotTaken = true;
  //     }
  //   }

  //   console.log(`      ✓ 已进入: ${pageName}`);
  // }
  async switchTo(pageName, options = {}) {
    const {
      waitForSelector = null,
      waitForUrl = null,
      waitForResponse = null,
      waitTime = 500,
      collectPreviousPage = true,
      takeScreenshot = true
    } = options;

    try {
      console.log(`\n      🔄 页面切换: → ${pageName}`);

      // 1. 完成上一个页面的记录
      if (collectPreviousPage && this.t.currentPageRecord) {
        await this.finishCurrentPage(takeScreenshot);
      }

      // 2. 等待新页面稳定
      await this.waitForPageReady(options);

      // 🔥 3. 等待 LCP 完成或超时 3 秒（使用 TestCase 的方法）
      await this.t.waitForPageReady(3000);

      // 🔥 4. 等待 URL 更新（给 SPA 路由一些时间）
      await this.page.waitForTimeout(300);

      // 🔥 5. 立即获取当前 URL
      const currentUrl = this.page.url();
      console.log(`      🔗 即将记录路由: ${currentUrl}`);

      // 6. 重置性能监控 + 记录切换时间
      await this.t.performanceMonitor.reset();

      // 🔥 7. 创建新页面记录（每次都创建，传入当前 URL）
      this.t.createPageRecord(pageName, currentUrl);

      // 8. 重新初始化性能监控（复用 CDP Session）
      await this.t.performanceMonitor.start();
      await this.t.performanceMonitor.injectWebVitals();

      // 9. 短暂等待让性能数据稳定（不影响采集）
      if (waitTime > 0) {
        await this.page.waitForTimeout(waitTime);
      }

      // 10. 标记采集起点
      await this.t.performanceMonitor.markCollectStart();

      // 11. 截图
      if (takeScreenshot) {
        await this.takePageScreenshot(pageName, 'loaded');
      }

      // 🔥 12. 再次确认 URL（防止 SPA 延迟更新）
      if (this.t.currentPageRecord) {
        const finalUrl = this.page.url();
        if (finalUrl !== currentUrl) {
          console.log(`      🔗 URL 已更新: ${currentUrl} → ${finalUrl}`);
          this.t.currentPageRecord.url = finalUrl;
        }
      }

      console.log(`      ✓ 已进入: ${pageName}`);
      return true; // 成功返回 true
    } catch (error) {
      console.error(`      ❌ 页面切换失败: ${error.message}`);

      // 🔥 标记测试失败并截图
      this.t.markPageTestFailed(`页面切换失败: ${error.message}`);
      await this.t.captureErrorScreenshot(`switchTo-${pageName}-failed`);

      return false; // 失败返回 false
    }
  }

  /**
   * 🔥 等待页面最大内容绘制完成（LCP）
   * @param {number} maxWait - 最大等待时间（毫秒）
   */
  async waitForLCP(maxWait = 3000) {
    try {
      console.log(`      ⏳ 等待页面最大内容绘制完成（最多 ${maxWait}ms）...`);

      const startTime = Date.now();

      // 等待 LCP 事件
      const lcpResult = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          if ('PerformanceObserver' in window) {
            try {
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                  resolve({
                    lcp: lastEntry.renderTime || lastEntry.loadTime,
                    element: lastEntry.element?.tagName || 'unknown'
                  });
                }
              });
              observer.observe({ type: 'largest-contentful-paint', buffered: true });

              // 超时自动停止
              setTimeout(() => {
                observer.disconnect();
                resolve(null);
              }, 5000);
            } catch (e) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      }).catch(() => null);

      // 等待 LCP 或超时
      const result = await Promise.race([
        Promise.resolve(lcpResult),
        new Promise(resolve => setTimeout(() => resolve(null), maxWait))
      ]);

      const elapsed = Date.now() - startTime;

      if (result && result.lcp) {
        console.log(`      ✅ LCP 完成: ${Math.round(result.lcp)}ms (元素: ${result.element})`);
      } else {
        console.log(`      ⏱️ LCP 超时，已等待 ${elapsed}ms，继续执行`);
      }

      // 额外等待确保渲染稳定
      await this.page.waitForTimeout(300);

    } catch (e) {
      console.log(`      ⚠️ 等待 LCP 出错: ${e.message}，继续执行`);
      // 出错时至少等待 1 秒
      await this.page.waitForTimeout(1000);
    }
  }


  async waitForPageReady(options) {
    const { waitForSelector, waitForUrl, waitForResponse } = options;

    if (waitForSelector) {
      try {
        console.log(`      ⏳ 等待元素: ${waitForSelector}`);
        await this.page.waitForSelector(waitForSelector, { timeout: 5000 });
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
      await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 });
    } catch (e) { }
  }

  async finishCurrentPage(takeScreenshot = true) {
    if (!this.t.currentPageRecord) return;

    const pageName = this.t.currentPageRecord.name;
    console.log(`\n      📊 完成页面采集: ${pageName}`);

    this.t.currentPageRecord.endTime = new Date().toISOString();
    // 🔥 修复：记录当前真实的 URL
    this.t.currentPageRecord.url = this.page.url();

    try {
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

    // if (takeScreenshot) {
    //   //await this.takePageScreenshot(pageName, 'final');
    // }

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
