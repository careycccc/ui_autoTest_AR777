// src/core/TestCase.js
import fs from 'fs';
import path from 'path';
import { Assertions } from './Assertions.js';
import { PerformanceMonitor } from '../monitor/PerformanceMonitor.js';
import { NetworkMonitor } from '../monitor/NetworkMonitor.js';
import { ConsoleErrorMonitor } from '../monitor/ConsoleErrorMonitor.js';
import { ThresholdChecker } from '../monitor/ThresholdChecker.js';
import { ApiAnalyzer } from '../utils/ApiAnalyzer.js';
import { PageManager } from '../utils/PageManager.js';

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

    // 核心模块
    this.assert = new Assertions(page);
    this.performanceMonitor = new PerformanceMonitor(page, config.performance);
    this.networkMonitor = new NetworkMonitor(page, config.network);
    this.consoleErrorMonitor = new ConsoleErrorMonitor(page, config.consoleError);
    this.thresholdChecker = new ThresholdChecker(config.thresholds, (name) => this.captureScreenshot(name));

    // 新增：API 分析器和页面管理器
    this.apiAnalyzer = new ApiAnalyzer(config.apiAnalyzer || {});
    this.pageManager = new PageManager(this);

    // 数据存储
    this.performanceData = [];
    this.networkRequests = [];
    this.thresholdViolations = [];
    this.apiErrors = [];
    this.consoleErrors = []; // 新增：控制台错误记录

    // 页面级记录
    this.pageRecords = [];
    this.currentPageRecord = null;
    this.pageIndex = 0;

    // 🔥 新增：当前执行的用例上下文
    this.currentCaseName = null;
    this.currentTabName = null;

    // 截图目录
    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir : path.join(rootDir, config.report.outputDir);
    this.screenshotDir = path.join(reportDir, 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    this.init();
  }

  async init() {
    await this.networkMonitor.start();
    await this.consoleErrorMonitor.start();

    // 监听控制台错误
    this.consoleErrorMonitor.on('error', (errorInfo) => {
      this.consoleErrors.push(errorInfo);

      if (this.currentPageRecord) {
        if (!this.currentPageRecord.consoleErrors) {
          this.currentPageRecord.consoleErrors = [];
        }
        this.currentPageRecord.consoleErrors.push(errorInfo);
      }
    });

    // 监听 API 请求，使用 ApiAnalyzer 分析
    this.networkMonitor.on('request', (req) => {
      this.networkRequests.push(req);

      if (this.currentPageRecord) {
        this.currentPageRecord.apiRequests.push(req);

        // 使用 ApiAnalyzer 分析请求
        const result = this.apiAnalyzer.analyze(req);

        if (result && result.hasError) {
          const error = {
            ...result.error,
            page: this.currentPageRecord.name
          };
          this.currentPageRecord.apiErrors.push(error);
          this.apiErrors.push(error);

          // 打印错误
          this.apiAnalyzer.printError(error);
        }
      }
    });
  }

  // ====== 页面跳转方法 ======

  /**
   * 切换到新页面（核心方法）
   * @param {string} pageName - 页面名称
   * @param {Object} options - 选项
   * @returns {Promise<boolean>} - 返回 true 表示成功，false 表示失败
   */
  async switchToPage(pageName, options = {}) {
    return await this.pageManager.switchTo(pageName, options);
  }

  /**
   * 完成当前页面的记录
   * @param {boolean} takeScreenshot - 是否截图
   */
  async finishCurrentPage(takeScreenshot = true) {
    await this.pageManager.finishCurrentPage(takeScreenshot);
  }

  /**
   * 等待并切换页面（适用于点击后跳转）
   * @param {string} pageName - 页面名称
   * @param {Function} action - 触发跳转的动作
   * @param {Object} options - 等待选项
   */
  async clickAndSwitchTo(pageName, action, options = {}) {
    const {
      waitForSelector = null,
      waitForUrl = null,
      waitForApi = null,
      waitTime = 2000
    } = options;

    // 执行动作（如点击按钮）
    await action();

    // 如果需要等待特定 API 响应
    let responsePromise = null;
    if (waitForApi) {
      responsePromise = this.page.waitForResponse(
        response => {
          if (typeof waitForApi === 'function') {
            return waitForApi(response);
          }
          return response.url().includes(waitForApi);
        },
        { timeout: 30000 }
      ).catch(() => null);
    }

    // 切换页面
    await this.switchToPage(pageName, {
      waitForSelector,
      waitForUrl,
      waitForResponse: responsePromise,
      waitTime,
      collectPreviousPage: true
    });
  }

  // ====== 网络过滤 ======

  setNetworkFilter(urlFilter) {
    this.networkMonitor.config.urlFilter = urlFilter;
  }

  // ====== 页面记录管理 ======

  createPageRecord(pageName, url = null) {
    this.pageIndex++;

    // 🔥 优化：立即获取当前 URL，不延迟
    const currentUrl = url || this.page.url();

    // 🔥 记录前一个页面信息（用于显示"来自"）
    const previousPage = this.currentPageRecord ? {
      name: this.currentPageRecord.name,
      url: this.currentPageRecord.url
    } : null;

    // 🔥 调试：打印当前上下文
    console.log(`\n      ═══════════════════════════════════════`);
    console.log(`      📄 页面 #${this.pageIndex}: ${pageName}`);
    console.log(`      🔍 DEBUG - currentTabName: "${this.currentTabName}", currentCaseName: "${this.currentCaseName}"`);
    console.log(`      🔍 DEBUG - 即将设置 parentTab: "${this.currentTabName || null}", parentCase: "${this.currentCaseName || null}"`);

    this.currentPageRecord = {
      index: this.pageIndex,
      name: pageName,
      url: currentUrl,  // 🔥 立即记录 URL
      device: this.currentDevice?.name || 'Desktop',
      startTime: new Date().toISOString(),
      endTime: null,
      performanceData: null,
      apiRequests: [],
      apiErrors: [],
      consoleErrors: [], // 新增：控制台错误记录
      thresholdViolations: [],
      screenshots: [],
      steps: [],
      // 新增的属性
      screenshotTaken: false,
      errorScreenshotTaken: false,
      testFailed: false, // 🔥 新增：标记测试是否失败
      failureReason: null, // 🔥 新增：失败原因
      // 🔥 记录父用例信息
      parentCase: this.currentCaseName || null,
      parentTab: this.currentTabName || null,
      // 🔥 记录前一个页面信息
      previousPage: previousPage
    };

    // 🔥 验证：打印实际设置的值
    console.log(`      ✅ 已设置 parentTab: "${this.currentPageRecord.parentTab}", parentCase: "${this.currentPageRecord.parentCase}"`);

    if (this.currentCaseName) {
      console.log(`      📂 所属用例: ${this.currentTabName} -> ${this.currentCaseName}`);
    } else if (this.currentTabName) {
      console.log(`      📂 父用例: ${this.currentTabName}`);
    }
    console.log(`      🔗 当前路由: ${currentUrl}`);
    if (previousPage) {
      console.log(`      ⬅️ 来自: ${previousPage.name} (${previousPage.url})`);
    }
    console.log(`      ═══════════════════════════════════════`);

    return this.currentPageRecord;
  }

  /**
   * 🔥 新增：等待页面完全就绪（LCP 完成或 3 秒超时）
   * 在所有页面操作前调用此方法
   */
  async waitForPageReady(timeoutMs = 3000) {
    try {
      console.log(`      ⏳ 等待页面就绪（LCP 或 ${timeoutMs}ms 超时）...`);

      const startTime = Date.now();

      // 等待 LCP 完成
      const lcpResult = await Promise.race([
        this.page.evaluate(() => {
          return new Promise((resolve) => {
            if ('PerformanceObserver' in window) {
              try {
                const observer = new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  const lastEntry = entries[entries.length - 1];
                  if (lastEntry) {
                    observer.disconnect();
                    resolve({
                      lcp: lastEntry.renderTime || lastEntry.loadTime,
                      element: lastEntry.element?.tagName || 'unknown'
                    });
                  }
                });
                observer.observe({ type: 'largest-contentful-paint', buffered: true });
              } catch (e) {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        }),
        new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))
      ]);

      const elapsed = Date.now() - startTime;

      if (lcpResult && lcpResult.lcp) {
        console.log(`      ✅ LCP 完成: ${Math.round(lcpResult.lcp)}ms (元素: ${lcpResult.element})`);
      } else {
        console.log(`      ⏱️ 等待超时 ${elapsed}ms，继续执行`);
      }

      // 额外等待确保渲染稳定
      await this.page.waitForTimeout(300);

      return true;
    } catch (error) {
      console.log(`      ⚠️ 等待页面就绪出错: ${error.message}`);
      // 出错时至少等待 1 秒
      await this.page.waitForTimeout(1000);
      return false;
    }
  }

  /**
   * 🔥 新增：标记当前页面测试失败
   */
  markPageTestFailed(reason) {
    if (this.currentPageRecord) {
      this.currentPageRecord.testFailed = true;
      this.currentPageRecord.failureReason = reason;
      console.log(`      ❌ 页面测试失败: ${reason}`);
    }
  }

  /**
   * 🔥 新增：捕获错误截图
   */
  async captureErrorScreenshot(errorName = 'error', errorReason = '') {
    if (this.currentPageRecord && !this.currentPageRecord.errorScreenshotTaken) {
      try {
        const safeName = errorName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-\u4e00-\u9fa5]/g, '');
        const screenshotName = `page-${this.pageIndex}-${safeName}-${Date.now()}`;
        const screenshot = await this.captureScreenshot(screenshotName);

        this.currentPageRecord.screenshots.push({
          name: `错误截图 - ${errorName}`,
          path: screenshot,
          timestamp: new Date().toISOString(),
          isError: true,
          errorReason: errorReason || errorName  // 🔥 保存错误原因
        });

        this.currentPageRecord.errorScreenshotTaken = true;
        console.log(`      📸 已截取错误截图`);

        return screenshot;
      } catch (e) {
        console.warn(`      ⚠️ 错误截图失败: ${e.message}`);
        return null;
      }
    }
    return null;
  }

  // ====== 测试基础方法 ======

  test(name, fn) { this.tests.push({ name, fn }); }
  beforeEach(fn) { this.beforeEachFn = fn; }
  afterEach(fn) { this.afterEachFn = fn; }

  async setDevice(deviceName) {
    const device = this.config.devices[deviceName];
    if (!device) { console.warn('未找到设备配置:', deviceName); return; }
    this.currentDevice = device;
    console.log('      📱 切换设备:', device.name);
    await this.page.setViewportSize(device.viewport);
  }

  /**
   * 执行单个测试步骤的方法
   * @param {string} name - 步骤名称
   * @param {Function} fn - 要执行的异步函数
   */
  async step(name, fn) {
    this.stepCount++;  // 步骤计数器加1
    // 创建步骤对象，包含步骤基本信息
    const step = {
      number: this.stepCount,  // 步骤编号
      name,  // 步骤名称
      startTime: new Date(),  // 步骤开始时间
      status: 'running',  // 步骤状态，初始为'running'
      screenshot: null  // 步骤截图，初始为null
    };
    // 在控制台输出步骤信息
    console.log('      📌 Step', this.stepCount + ':', name);

    try {
      // 执行传入的异步函数
      await fn();
      // 如果执行成功，更新步骤状态为'passed'
      step.status = 'passed';
      // 如果配置中开启了步骤截图，则捕获步骤截图
      // if (this.config.screenshot.onStep) {
      //   step.screenshot = await this.captureScreenshot('step-' + this.stepCount);
      // }
    } catch (error) {
      // 如果执行出错，更新步骤状态为'failed'，记录错误信息
      step.status = 'failed';
      step.error = error.message;
      // 捕获错误步骤的截图
      step.screenshot = await this.captureScreenshot('step-' + this.stepCount + '-error');
      // 抛出错误，使测试流程终止
      throw error;
    } finally {

      // 无论成功或失败，都会执行以下代码
      step.endTime = new Date();  // 记录步骤结束时间
      step.duration = step.endTime - step.startTime;  // 计算步骤执行耗时
      // 将当前步骤添加到步骤列表中
      this.currentSteps.push(step);

      // 如果当前有页面记录，将步骤添加到页面记录中
      if (this.currentPageRecord) {
        this.currentPageRecord.steps.push(step);
      }
    }
  }

  // ====== 导航方法（首次访问）======

  async goto(url, options = {}) {
    const { pageName = '首页' } = options;

    await this.step('导航到: ' + pageName, async () => {
      // 完成上一个页面
      if (this.currentPageRecord) {
        await this.finishCurrentPage(true);
      }

      // 创建新页面
      this.createPageRecord(pageName, url);

      // 导航
      await this.performanceMonitor.start();
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout.navigation
      });
      await this.page.waitForLoadState('load');

      // 注入性能监控
      await this.performanceMonitor.injectWebVitals();

      // 等待浏览器记录 LCP（异步的，需要等待）
      await this.performanceMonitor.waitForLCP(5000);

      // 标记采集起点（排除等待时间）
      await this.performanceMonitor.markCollectStart();

      // 采集性能
      const perfData = await this.performanceMonitor.collect();
      perfData.url = url;
      perfData.device = this.currentDevice?.name || 'Desktop';
      perfData.pageName = pageName;
      perfData.isInitialLoad = true;

      if (this.currentPageRecord) {
        this.currentPageRecord.performanceData = perfData;
      }
      this.performanceData.push(perfData);

      // 检查阈值
      const violations = await this.thresholdChecker.check(perfData, pageName);
      if (violations.length > 0) {
        if (this.currentPageRecord) {
          this.currentPageRecord.thresholdViolations.push(...violations);
        }
        this.thresholdViolations.push(...violations);
      }

      // 截图
      // try {
      //   const screenshot = await this.captureScreenshot(`page-${this.pageIndex}-loaded`);
      //   if (this.currentPageRecord) {
      //     this.currentPageRecord.screenshots.push({
      //       name: `${pageName} - 页面加载完成`,
      //       path: screenshot,
      //       timestamp: new Date().toISOString()
      //     });
      //   }
      // } catch (e) { }
      // 截图 - 每个页面只截一张加载完成图
      try {
        if (!this.currentPageRecord.screenshotTaken) {
          const screenshot = await this.captureScreenshot(`page-${this.pageIndex}-${pageName}`);
          if (this.currentPageRecord) {
            this.currentPageRecord.screenshots.push({
              name: `${pageName} - 页面加载完成`,
              path: screenshot,
              timestamp: new Date().toISOString()
            });
            this.currentPageRecord.screenshotTaken = true;
          }
        }
      } catch (e) { }

    });
  }

  // ====== 操作方法 ======

  async click(selector, options = {}) {
    await this.step('点击: ' + selector, async () => {
      await this.page.click(selector, { timeout: this.config.timeout.action, ...options });
    });
  }

  async fill(selector, value, options = {}) {
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    await this.step('输入: ' + selector + ' = "' + displayValue + '"', async () => {
      await this.page.fill(selector, value, { timeout: this.config.timeout.action, ...options });
    });
  }

  async waitForTimeout(ms) {
    // 简单的等待，不使用 step 包装，避免截图失败问题
    try {
      await this.page.waitForTimeout(ms);
    } catch (e) {
      // 如果页面已关闭，静默处理
      if (e.message && e.message.includes('closed')) {
        console.warn('      ⚠️ 等待时页面已关闭');
        return;
      }
      throw e;
    }
  }

  // ====== 截图 ======
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

  // ====== 性能采集 ======

  async collectPerformance() {
    await this.page.waitForTimeout(500);
    const data = await this.performanceMonitor.collect();
    data.device = this.currentDevice?.name || 'Desktop';
    data.url = this.page.url();

    if (this.currentPageRecord) {
      this.currentPageRecord.performanceData = data;
    }
    this.performanceData.push(data);

    const violations = await this.thresholdChecker.check(data, 'Performance Check');
    if (violations.length > 0) {
      if (this.currentPageRecord) {
        this.currentPageRecord.thresholdViolations.push(...violations);
      }
      this.thresholdViolations.push(...violations);
    }
    return data;
  }

  // ====== 数据获取 ======

  getPageRecords() {
    const records = [...this.pageRecords];
    if (this.currentPageRecord && !records.includes(this.currentPageRecord)) {
      records.push(this.currentPageRecord);
    }
    return records;
  }

  getNetworkRequests() { return this.networkRequests; }
  getThresholdViolations() { return this.thresholdViolations; }
  getApiErrors() { return this.apiErrors; }
  getConsoleErrors() { return this.consoleErrors; }
  getConsoleErrorStats() { return this.consoleErrorMonitor.getStats(); }
}