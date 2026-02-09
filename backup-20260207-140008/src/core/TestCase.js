// src/core/TestCase.js
import fs from 'fs';
import path from 'path';
import { Assertions } from './Assertions.js';
import { PerformanceMonitor } from '../monitor/PerformanceMonitor.js';
import { NetworkMonitor } from '../monitor/NetworkMonitor.js';
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
    this.thresholdChecker = new ThresholdChecker(config.thresholds, (name) => this.captureScreenshot(name));

    // 新增：API 分析器和页面管理器
    this.apiAnalyzer = new ApiAnalyzer(config.apiAnalyzer || {});
    this.pageManager = new PageManager(this);

    // 数据存储
    this.performanceData = [];
    this.networkRequests = [];
    this.thresholdViolations = [];
    this.apiErrors = [];

    // 页面级记录
    this.pageRecords = [];
    this.currentPageRecord = null;
    this.pageIndex = 0;

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
   */
  async switchToPage(pageName, options = {}) {
    await this.pageManager.switchTo(pageName, options);
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
    const currentUrl = url || this.page.url();

    this.currentPageRecord = {
      index: this.pageIndex,
      name: pageName,
      url: currentUrl,
      device: this.currentDevice?.name || 'Desktop',
      startTime: new Date().toISOString(),
      endTime: null,
      performanceData: null,
      apiRequests: [],
      apiErrors: [],
      thresholdViolations: [],
      screenshots: [],
      steps: []
    };

    console.log(`\n      ═══════════════════════════════════════`);
    console.log(`      📄 页面 #${this.pageIndex}: ${pageName}`);
    console.log(`      🔗 ${currentUrl}`);
    console.log(`      ═══════════════════════════════════════`);

    return this.currentPageRecord;
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

  async step(name, fn) {
    this.stepCount++;
    const step = {
      number: this.stepCount,
      name,
      startTime: new Date(),
      status: 'running',
      screenshot: null
    };
    console.log('      📌 Step', this.stepCount + ':', name);

    try {
      await fn();
      step.status = 'passed';
      if (this.config.screenshot.onStep) {
        step.screenshot = await this.captureScreenshot('step-' + this.stepCount);
      }
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.screenshot = await this.captureScreenshot('step-' + this.stepCount + '-error');
      throw error;
    } finally {
      step.endTime = new Date();
      step.duration = step.endTime - step.startTime;
      this.currentSteps.push(step);

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
        waitUntil: 'networkidle',
        timeout: this.config.timeout.navigation
      });
      await this.page.waitForLoadState('load');

      // 注入性能监控
      await this.performanceMonitor.injectWebVitals();

      // 标记真正的采集起点（排除导航等待时间）
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
    await this.step('等待 ' + ms + 'ms', async () => {
      await this.page.waitForTimeout(ms);
    });
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
}