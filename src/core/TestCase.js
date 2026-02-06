import fs from 'fs';
import path from 'path';
import { Assertions } from './Assertions.js';
import { PerformanceMonitor } from '../monitor/PerformanceMonitor.js';
import { NetworkMonitor } from '../monitor/NetworkMonitor.js';
import { ThresholdChecker } from '../monitor/ThresholdChecker.js';
import { PageLoadReporter } from '../reporter/PageLoadReporter.js';

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

    this.thresholdChecker = new ThresholdChecker(
      config.thresholds,
      (name) => this.captureScreenshot(name)
    );

    this.performanceData = [];
    this.networkRequests = [];
    this.thresholdViolations = [];
    this.pageLoadMetrics = [];

    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir
      : path.join(rootDir, config.report.outputDir);

    this.screenshotDir = path.join(reportDir, 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    this.pageLoadReporter = new PageLoadReporter(reportDir);

    this.init();
  }

  async init() {

    await this.networkMonitor.start();
    this.networkMonitor.on('request', (req) => {
      this.networkRequests.push(req);
    });
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  afterEach(fn) {
    this.afterEachFn = fn;
  }

  async setDevice(deviceName) {
    const device = this.config.devices[deviceName];
    if (!device) {
      console.warn('未找到设备配置: ' + deviceName);
      return;
    }
    this.currentDevice = device;
    // 设置移动端模式
    this.performanceMonitor.setMobileMode(device.isMobile || false);
    console.log('      📱 切换设备: ' + device.name);
    await this.page.setViewportSize(device.viewport);
  }

  getDevice() {
    return this.currentDevice;
  }

  async step(name, fn) {
    this.stepCount++;
    const stepNum = this.stepCount;
    const step = {
      number: stepNum,
      name: name,
      startTime: new Date(),
      status: 'running',
      screenshot: null
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

  async goto(url, options = {}) {
    await this.step('导航到: ' + url, async () => {
      await this.performanceMonitor.start();

      // 设置移动端模式
      if (this.currentDevice?.isMobile) {
        this.performanceMonitor.setMobileMode(true);
      }

      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout.navigation,
        ...options
      });

      await this.page.waitForLoadState('load');
      await this.performanceMonitor.injectWebVitals();

      console.log('      ⏳ 等待性能指标稳定...');
      await this.page.waitForTimeout(2000);

      const loadMetrics = await this.performanceMonitor.collectPageLoadMetrics();

      if (loadMetrics) {
        const screenshot = await this.captureScreenshot('page-load');

        const pageLoadData = {
          url,
          device: this.currentDevice?.name || 'Desktop',
          timing: loadMetrics.timing,
          resources: loadMetrics.resources,
          longTasks: loadMetrics.longTasks,
          gpu: loadMetrics.gpu,
          fps: loadMetrics.fps,
          screenshot
        };

        this.pageLoadMetrics.push(pageLoadData);
        this.pageLoadReporter.addPageMetrics(pageLoadData);

        this.printPageLoadSummary(loadMetrics);
      }

      const perfData = await this.performanceMonitor.collect();
      perfData.url = url;
      perfData.device = this.currentDevice?.name || 'Desktop';
      this.performanceData.push(perfData);

      const violations = await this.thresholdChecker.check(perfData, 'Page Load: ' + url);
      if (violations.length > 0) {
        this.thresholdViolations.push(...violations);
        this.printViolations(violations);
      }
    });
  }

  printPageLoadSummary(metrics) {
    const t = metrics.timing || {};
    console.log('');
    console.log('      ╔══════════════════════════════════════════════╗');
    console.log('      ║        📊 首次加载性能指标                   ║');
    console.log('      ╠══════════════════════════════════════════════╣');
    console.log('      ║  TTFB:              ' + this.padTime(t.ttfb) + '  ║');
    console.log('      ║  FCP:               ' + this.padTime(t.fcp) + '  ║');
    console.log('      ║  LCP:               ' + this.padTime(t.lcp) + '  ║');
    console.log('      ║  ─────────────────────────────────────────  ║');
    console.log('      ║  ⭐ 视口渲染完成:    ' + this.padTime(t.visuallyComplete) + '  ║');
    console.log('      ║  ⭐ 完全可交互(TTI): ' + this.padTime(t.tti) + '  ║');
    console.log('      ║  ─────────────────────────────────────────  ║');
    console.log('      ║  DOM Ready:         ' + this.padTime(t.domContentLoaded) + '  ║');
    console.log('      ║  Load:              ' + this.padTime(t.load) + '  ║');
    console.log('      ║  CLS:               ' + (t.cls !== undefined ? t.cls.toFixed(4).padStart(16) : 'N/A'.padStart(16)) + '  ║');
    console.log('      ╚══════════════════════════════════════════════╝');
    console.log('');
  }

  padTime(ms) {
    if (ms === null || ms === undefined) return 'N/A'.padStart(16);
    if (ms < 1000) return (ms.toFixed(0) + 'ms').padStart(16);
    return ((ms / 1000).toFixed(2) + 's').padStart(16);
  }

  async click(selector, options = {}) {
    await this.step('点击: ' + selector, async () => {
      await this.page.click(selector, { timeout: this.config.timeout.action, ...options });
    });
  }

  async fill(selector, value, options = {}) {
    await this.step('输入: ' + selector + ' = "' + value + '"', async () => {
      await this.page.fill(selector, value, { timeout: this.config.timeout.action, ...options });
    });
  }

  async type(selector, value, options = {}) {
    await this.step('逐字输入: ' + selector, async () => {
      await this.page.type(selector, value, { timeout: this.config.timeout.action, ...options });
    });
  }

  async press(key) {
    await this.step('按键: ' + key, async () => {
      await this.page.keyboard.press(key);
    });
  }

  async hover(selector) {
    await this.step('悬停: ' + selector, async () => {
      await this.page.hover(selector, { timeout: this.config.timeout.action });
    });
  }

  async select(selector, value) {
    await this.step('选择: ' + selector, async () => {
      await this.page.selectOption(selector, value, { timeout: this.config.timeout.action });
    });
  }

  async check(selector) {
    await this.step('勾选: ' + selector, async () => {
      await this.page.check(selector, { timeout: this.config.timeout.action });
    });
  }

  async uncheck(selector) {
    await this.step('取消勾选: ' + selector, async () => {
      await this.page.uncheck(selector, { timeout: this.config.timeout.action });
    });
  }

  async waitFor(selector, options = {}) {
    await this.step('等待元素: ' + selector, async () => {
      await this.page.waitForSelector(selector, { timeout: this.config.timeout.action, ...options });
    });
  }

  async waitForNavigation(options = {}) {
    await this.step('等待页面导航', async () => {
      await this.page.waitForNavigation({ timeout: this.config.timeout.navigation, ...options });
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

  async getCount(selector) {
    return await this.page.locator(selector).count();
  }

  async captureScreenshot(name = 'screenshot') {
    const devicePrefix = this.currentDevice ? this.currentDevice.name.replace(/\s+/g, '-') + '-' : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = devicePrefix + name + '-' + timestamp + '.png';
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, type: 'png', fullPage: this.config.screenshot.fullPage });
    return filepath;
  }

  async captureFullPage(name = 'fullpage') {
    const devicePrefix = this.currentDevice ? this.currentDevice.name.replace(/\s+/g, '-') + '-' : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = devicePrefix + name + '-' + timestamp + '.png';
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, type: 'png', fullPage: true });
    return filepath;
  }

  async collectPerformance() {
    console.log('      📊 采集性能数据...');
    await this.page.waitForTimeout(500);

    const data = await this.performanceMonitor.collect();
    data.device = this.currentDevice?.name || 'Desktop';
    data.url = this.page.url();

    this.performanceData.push(data);

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

  getThresholdViolations() {
    return this.thresholdViolations;
  }

  getPageLoadMetrics() {
    return this.pageLoadMetrics;
  }

  printViolations(violations) {
    for (const v of violations) {
      const icon = v.level === 'critical' ? '🔴' : '🟡';
      console.log('      ' + icon + ' ' + v.message);
    }
  }

  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  generatePageLoadReport() {
    return this.pageLoadReporter.generate();
  }
}
