#!/bin/bash

# ============================================================
# UI自动化测试平台 - 完整部署脚本
# 运行: chmod +x deploy.sh && ./deploy.sh [安装目录]
# ============================================================

set -e

INSTALL_DIR="${1:-./ui-automation-platform}"

echo "🚀 UI自动化测试平台 - 完整部署"
echo "======================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js"
    echo "请先安装 Node.js (v16+): https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# 创建目录
echo "📁 创建项目目录: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
mkdir -p src/core src/monitor src/reporter src/api src/http src/utils tests reports/screenshots

# package.json
cat > package.json << 'EOF'
{
  "name": "ui-automation-platform",
  "version": "1.0.0",
  "description": "UI自动化测试平台 - 性能监控、网络采集、错误截图、精美报告",
  "type": "module",
  "scripts": {
    "test": "node src/index.js"
  },
  "dependencies": {
    "@playwright/test": "^1.58.1",
    "axios": "^1.13.4",
    "playwright": "^1.40.0"
  }
}
EOF

# config.js
cat > config.js << 'EOF'
export default {
  browser: {
    headless: false,
    slowMo: 0,
    args: ['--disable-gpu-sandbox', '--disable-dev-shm-usage', '--no-sandbox']
  },
  timeout: { test: 60000, navigation: 30000, action: 10000 },
  report: { outputDir: './reports', screenshots: true, video: false },
  performance: {
    enabled: true,
    sampleInterval: 1000,
    collectCPU: true,
    collectGPU: true,
    collectFPS: true,
    collectLongTasks: true,
    mobileOptimization: true
  },
  network: { enabled: true, captureBody: true, maxBodySize: 50000 },
  screenshot: { onStep: false, onError: true, onThresholdExceeded: true, fullPage: false },
  thresholds: {
    lcp: { warning: 2500, critical: 4000 },
    cls: { warning: 0.1, critical: 0.25 },
    inp: { warning: 200, critical: 500 },
    fcp: { warning: 1800, critical: 3000 },
    ttfb: { warning: 800, critical: 1800 },
    jsHeapSize: { warning: 50, critical: 100 },
    domNodes: { warning: 1500, critical: 3000 },
    cpuUsage: { warning: 50, critical: 80 },
    fps: { warning: 50, critical: 30 }
  },
  devices: {
    desktop: {
      name: 'Desktop Chrome',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },
    iphone14: {
      name: 'iPhone 14',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    }
  },
  retry: { count: 0, delay: 1000 }
};

export const dataConfig = {
  userName: 'test_user',
  areaCodeData: '86',
  url: 'https://example.com',
  adminUrl: 'https://admin.example.com',
  adminUser: 'admin',
  adminPwd: 'password'
};
EOF

# src/index.js
cat > src/index.js << 'EOF'
import { TestRunner } from './core/TestRunner.js';
import config from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testFiles = ['tests/example.test.js'];
const testDevices = ['desktop'];

const absoluteTestFiles = testFiles.map(f => path.join(rootDir, f));
const runner = new TestRunner(config, rootDir);

console.log('\n🧪 UI 自动化测试平台');
console.log('══════════════════════════════════════════');
console.log('📋 测试文件:', testFiles.length, '个');
console.log('📱 测试设备:', testDevices.join(', '));
console.log('══════════════════════════════════════════\n');

runner.run(absoluteTestFiles, { devices: testDevices }).then(results => {
  console.log('\n══════════════════════════════════════════');
  console.log('📊 测试结果');
  console.log('──────────────────────────────────────────');
  console.log('✅ 通过:', results.passed);
  console.log('❌ 失败:', results.failed);
  console.log('⏱️  耗时:', (results.duration / 1000).toFixed(2) + 's');
  console.log('══════════════════════════════════════════\n');
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('❌ 测试运行失败:', err);
  process.exit(1);
});
EOF

# src/core/TestRunner.js
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
      startTime: null, endTime: null, total: 0, passed: 0, failed: 0, skipped: 0,
      suites: [], thresholdViolations: []
    };
    this.browser = null;
    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir : path.join(rootDir, config.report.outputDir);
    this.reporter = new HTMLReporter(reportDir, config);
  }

  async run(testFiles, options = {}) {
    this.results.startTime = new Date();
    const devices = options.devices || ['desktop'];

    try {
      console.log('🚀 启动浏览器...');
      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo,
        args: ['--disable-gpu-sandbox', '--disable-dev-shm-usage', '--no-sandbox']
      });

      for (const deviceName of devices) {
        const device = this.config.devices[deviceName];
        if (!device) {
          console.warn('⚠️ 未找到设备:', deviceName);
          continue;
        }
        console.log('\n📱 设备:', device.name);
        console.log('━'.repeat(50));

        for (const file of testFiles) {
          await this.runTestFile(file, device);
        }
      }
    } finally {
      if (this.browser) await this.browser.close();
    }

    this.results.endTime = new Date();
    this.results.duration = this.results.endTime - this.results.startTime;
    await this.reporter.generate(this.results);
    return this.results;
  }

  async runTestFile(filePath, device) {
    console.log('\n📁', path.basename(filePath));
    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.rootDir, filePath);
      if (!fs.existsSync(absolutePath)) {
        console.error('❌ 文件不存在:', absolutePath);
        return;
      }

      const testModule = await import('file://' + absolutePath);
      if (typeof testModule.default !== 'function') {
        console.error('❌ 测试文件必须导出默认函数');
        return;
      }

      const contextOptions = {
        viewport: device.viewport,
        deviceScaleFactor: device.deviceScaleFactor || 1,
        isMobile: device.isMobile || false,
        hasTouch: device.hasTouch || false
      };
      if (device.userAgent) contextOptions.userAgent = device.userAgent;

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

    console.log('\n  🧪', test.name);
    testCase.currentTest = result;
    testCase.stepCount = 0;

    try {
      if (testCase.beforeEachFn) await testCase.beforeEachFn();
      await test.fn();
      result.status = 'passed';
      console.log('    ✅ 通过');
    } catch (error) {
      result.status = 'failed';
      result.error = { message: error.message, stack: error.stack };
      console.log('    ❌ 失败:', error.message);
      if (this.config.screenshot.onError) {
        try {
          const screenshotPath = await testCase.captureScreenshot('error');
          result.screenshots.push({ type: 'error', path: screenshotPath, timestamp: new Date().toISOString() });
        } catch (e) {}
      }
    } finally {
      if (testCase.afterEachFn) {
        try { await testCase.afterEachFn(); } catch (e) {}
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

# src/core/TestCase.js
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
    this.thresholdChecker = new ThresholdChecker(config.thresholds, (name) => this.captureScreenshot(name));

    this.performanceData = [];
    this.networkRequests = [];
    this.thresholdViolations = [];

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
    this.networkMonitor.on('request', (req) => this.networkRequests.push(req));
  }

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
    const step = { number: this.stepCount, name, startTime: new Date(), status: 'running', screenshot: null };
    console.log('      📌 Step', this.stepCount + ':', name);
    try {
      await fn();
      step.status = 'passed';
      if (this.config.screenshot.onStep) step.screenshot = await this.captureScreenshot('step-' + this.stepCount);
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.screenshot = await this.captureScreenshot('step-' + this.stepCount + '-error');
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
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout.navigation, ...options });
      await this.page.waitForLoadState('load');
      await this.performanceMonitor.injectWebVitals();
      await this.page.waitForTimeout(1000);
      const perfData = await this.performanceMonitor.collect();
      this.performanceData.push({ url, device: this.currentDevice?.name || 'Desktop', ...perfData });
      const violations = await this.thresholdChecker.check(perfData, 'Page Load: ' + url);
      if (violations.length > 0) {
        this.thresholdViolations.push(...violations);
        this.printViolations(violations);
      }
    });
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

  async waitForTimeout(ms) {
    await this.step('等待 ' + ms + 'ms', async () => await this.page.waitForTimeout(ms));
  }

  async captureScreenshot(name = 'screenshot') {
    const devicePrefix = this.currentDevice ? this.currentDevice.name.replace(/\s+/g, '-') + '-' : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = devicePrefix + name + '-' + timestamp + '.png';
    const filepath = path.join(this.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, type: 'png', fullPage: this.config.screenshot.fullPage });
    return filepath;
  }

  async collectPerformance() {
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

  getNetworkRequests() { return this.networkRequests; }
  getThresholdViolations() { return this.thresholdViolations; }
  printViolations(violations) {
    for (const v of violations) {
      const icon = v.level === 'critical' ? '🔴' : '🟡';
      console.log('      ', icon, v.message);
    }
  }
}
EOF

# src/core/Assertions.js
cat > src/core/Assertions.js << 'EOF'
import { expect } from '@playwright/test';

export class Assertions {
  constructor(page) {
    this.page = page;
    this.defaultTimeout = 5000;
  }

  equal(actual, expected, message = '') {
    if (actual !== expected) throw new Error(message || `断言失败: ${actual} !== ${expected}`);
  }

  async visible(selector, message = '') {
    await expect(this.page.locator(selector), message).toBeVisible({ timeout: this.defaultTimeout });
  }

  async textContains(selector, text, message = '') {
    await expect(this.page.locator(selector), message).toContainText(text, { timeout: this.defaultTimeout });
  }

  async textEquals(selector, expected, message = '') {
    await expect(this.page.locator(selector), message).toHaveText(expected, { timeout: this.defaultTimeout });
  }
}
EOF

# src/monitor/PerformanceMonitor.js
cat > src/monitor/PerformanceMonitor.js << 'EOF'
export class PerformanceMonitor {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.cdpSession = null;
    this.lastMetrics = null;
    this.lastTimestamp = null;
    this.isInitialized = false;
    this.isMobile = false;
  }

  setMobileMode(isMobile) { this.isMobile = isMobile; }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Performance.enable');
      this.isInitialized = true;
    } catch (e) { console.warn('性能监控初始化失败:', e.message); }
  }

  async injectWebVitals() {
    try {
      await this.page.evaluate(() => {
        if (window.__perfMonitorInitialized) return;
        window.__perfMonitor = {
          webVitals: { ttfb: null, fcp: null, lcp: null, cls: 0, fid: null, inp: null },
          longTasks: [],
          frames: { count: 0, fps: 0, history: [] },
          gpu: null
        };

        try {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) {
            window.__perfMonitor.webVitals.ttfb = nav.responseStart;
            window.__perfMonitor.webVitals.domContentLoaded = nav.domContentLoadedEventEnd;
            window.__perfMonitor.webVitals.load = nav.loadEventEnd;
          }
        } catch (e) {}

        try {
          const fcpEntry = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
          if (fcpEntry) window.__perfMonitor.webVitals.fcp = fcpEntry.startTime;
        } catch (e) {}

        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) window.__perfMonitor.webVitals.lcp = entries[entries.length - 1].startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        try {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) { clsValue += entry.value; window.__perfMonitor.webVitals.cls = clsValue; }
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        window.__perfMonitorInitialized = true;
      });
      await this.page.waitForTimeout(500);
    } catch (e) { console.warn('注入性能监控失败:', e.message); }
  }

  async collect() {
    const result = {
      timestamp: new Date().toISOString(),
      memory: {}, dom: {}, render: {}, webVitals: {}, cpu: {}, gpu: {}, fps: {}, longTasks: []
    };

    try {
      if (this.cdpSession) {
        const { metrics } = await this.cdpSession.send('Performance.getMetrics');
        const metricsMap = {};
        metrics.forEach(m => metricsMap[m.name] = m.value);

        result.dom = {
          nodes: metricsMap.Nodes || 0,
          jsEventListeners: metricsMap.JSEventListeners || 0
        };

        result.render = {
          layoutCount: metricsMap.LayoutCount || 0,
          recalcStyleCount: metricsMap.RecalcStyleCount || 0
        };

        result.cpu = {
          usage: 0,
          scriptTime: (metricsMap.ScriptDuration || 0) * 1000,
          taskTime: (metricsMap.TaskDuration || 0) * 1000
        };
      }

      const pageData = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        return {
          webVitals: pm.webVitals || {},
          fps: pm.fps || 0,
          gpu: pm.gpu || null,
          longTasks: pm.longTasks || [],
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          } : {}
        };
      });

      result.webVitals = pageData.webVitals;
      result.memory = pageData.memory;
      result.gpu = pageData.gpu;
      result.longTasks = pageData.longTasks;
      result.fps = { current: pageData.fps };
    } catch (e) { console.warn('采集性能数据失败:', e.message); }

    return result;
  }
}
EOF

# src/monitor/NetworkMonitor.js
cat > src/monitor/NetworkMonitor.js << 'EOF'
import { EventEmitter } from 'events';

export class NetworkMonitor extends EventEmitter {
  constructor(page, config) {
    super();
    this.page = page;
    this.config = config;
    this.cdpSession = null;
    this.pendingRequests = new Map();
  }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Network.enable');
      this.cdpSession.on('Network.requestWillBeSent', (params) => this.onRequestStart(params));
      this.cdpSession.on('Network.responseReceived', (params) => this.onResponseReceived(params));
      this.cdpSession.on('Network.loadingFinished', (params) => this.onLoadingFinished(params));
      this.cdpSession.on('Network.loadingFailed', (params) => this.onLoadingFailed(params));
    } catch (e) { console.warn('网络监控初始化失败:', e.message); }
  }

  onRequestStart(params) {
    const { requestId, request, timestamp, type } = params;
    this.pendingRequests.set(requestId, {
      requestId, url: request.url, method: request.method,
      resourceType: type, startTime: timestamp * 1000, status: 'pending'
    });
  }

  onResponseReceived(params) {
    const { requestId, response } = params;
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.response = {
        status: response.status, statusText: response.statusText,
        mimeType: response.mimeType
      };
    }
  }

  async onLoadingFinished(params) {
    const { requestId, timestamp, encodedDataLength } = params;
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.endTime = timestamp * 1000;
      request.duration = request.endTime - request.startTime;
      request.size = encodedDataLength;
      request.status = 'completed';
      if (this.config.captureBody) {
        try {
          const mimeType = request.response?.mimeType || '';
          if ((mimeType.includes('json') || mimeType.includes('text')) && request.size < this.config.maxBodySize) {
            const { body } = await this.cdpSession.send('Network.getResponseBody', { requestId });
            if (mimeType.includes('json')) {
              try { request.responseBody = JSON.parse(body); } catch (e) { request.responseBody = body; }
            } else { request.responseBody = body; }
          }
        } catch (e) {}
      }
      this.emit('request', request);
      this.pendingRequests.delete(requestId);
    }
  }

  onLoadingFailed(params) {
    const { requestId, timestamp, errorText } = params;
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.endTime = timestamp * 1000;
      request.duration = request.endTime - request.startTime;
      request.status = 'failed';
      request.error = errorText;
      this.emit('request', request);
      this.pendingRequests.delete(requestId);
    }
  }
}
EOF

# src/monitor/ThresholdChecker.js
cat > src/monitor/ThresholdChecker.js << 'EOF'
export class ThresholdChecker {
  constructor(thresholds, screenshotFn) {
    this.thresholds = thresholds;
    this.screenshotFn = screenshotFn;
    this.violations = [];
  }

  async check(metrics, context = '') {
    const violations = [];
    if (metrics.webVitals) {
      const wv = metrics.webVitals;
      if (wv.lcp !== null) violations.push(...this.checkMetric('LCP', wv.lcp, this.thresholds.lcp, 'ms'));
      if (wv.cls !== null) violations.push(...this.checkMetric('CLS', wv.cls, this.thresholds.cls, ''));
      if (wv.fcp !== null) violations.push(...this.checkMetric('FCP', wv.fcp, this.thresholds.fcp, 'ms'));
    }
    if (metrics.memory?.usedJSHeapSize) {
      violations.push(...this.checkMetric('JS Heap', metrics.memory.usedJSHeapSize / 1024 / 1024, this.thresholds.jsHeapSize, 'MB'));
    }
    if (metrics.cpu?.usage !== undefined) {
      violations.push(...this.checkMetric('CPU Usage', metrics.cpu.usage, this.thresholds.cpuUsage, '%'));
    }
    if (metrics.fps?.current) {
      violations.push(...this.checkMetricReverse('FPS', metrics.fps.current, this.thresholds.fps, ''));
    }

    if (violations.length > 0) {
      for (const v of violations) {
        v.context = context;
        v.timestamp = new Date().toISOString();
        this.violations.push(v);
      }
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
      violations.push({ metric: name, value, threshold: threshold.critical, level: 'critical', unit,
        message: `${name}: ${value.toFixed(2)}${unit} 超过严重阈值 ${threshold.critical}${unit}` });
    } else if (value >= threshold.warning) {
      violations.push({ metric: name, value, threshold: threshold.warning, level: 'warning', unit,
        message: `${name}: ${value.toFixed(2)}${unit} 超过警告阈值 ${threshold.warning}${unit}` });
    }
    return violations;
  }

  checkMetricReverse(name, value, threshold, unit) {
    const violations = [];
    if (!threshold) return violations;
    if (value <= threshold.critical) {
      violations.push({ metric: name, value, threshold: threshold.critical, level: 'critical', unit,
        message: `${name}: ${value.toFixed(2)}${unit} 低于严重阈值 ${threshold.critical}${unit}` });
    } else if (value <= threshold.warning) {
      violations.push({ metric: name, value, threshold: threshold.warning, level: 'warning', unit,
        message: `${name}: ${value.toFixed(2)}${unit} 低于警告阈值 ${threshold.warning}${unit}` });
    }
    return violations;
  }
}
EOF

# src/reporter/HTMLReporter.js
cat > src/reporter/HTMLReporter.js << 'EOF'
import fs from 'fs';
import path from 'path';

export class HTMLReporter {
  constructor(outputDir, config) {
    this.outputDir = outputDir;
    this.config = config;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  }

  async generate(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(this.outputDir, 'test-report-' + timestamp + '.html');
    fs.writeFileSync(htmlPath, this.generateHTML(results));
    console.log('\n📊 报告已生成:', htmlPath);
    return { htmlPath };
  }

  generateHTML(results) {
    const { total, passed, failed, duration } = results;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>UI自动化测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
        h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
        .metric-value { font-size: 32px; font-weight: bold; }
        .metric-label { color: #666; margin-top: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .info { color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 UI自动化测试报告</h1>
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${total}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${passed}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${failed}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="metric">
                <div class="metric-value info">${passRate}%</div>
                <div class="metric-label">通过率</div>
            </div>
        </div>
        <p><strong>耗时:</strong> ${(duration / 1000).toFixed(2)} 秒</p>
        <p><strong>生成时间:</strong> ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
  }
}
EOF

# tests/example.test.js
cat > tests/example.test.js << 'EOF'
export default async function(t) {
  t.test('百度首页测试', async () => {
    await t.goto('https://www.baidu.com');
    await t.step('验证搜索框存在', async () => {
      await t.assert.visible('#kw');
    });
    await t.step('输入搜索内容', async () => {
      await t.fill('#kw', 'Playwright');
    });
    await t.step('点击搜索按钮', async () => {
      await t.click('#su');
    });
    await t.waitForTimeout(3000);
  });
}
EOF

# README.md
cat > README.md << 'EOF'
# UI 自动化测试平台

基于 Playwright 的 UI 自动化测试平台。

## 特性

- ✅ 简洁的测试用例 API
- 📊 性能数据采集
- 🌐 网络请求捕获
- 📸 错误截图
- 📈 HTML 报告

## 安装

```bash
npm install
npx playwright install chromium
```

## 运行

```bash
npm test
```

## 目录结构

```
src/
  core/          # 核心功能
  monitor/       # 监控模块
  reporter/      # 报告生成
tests/           # 测试用例
reports/         # 测试报告
config.js        # 配置文件
```
EOF

echo ""
echo "📦 安装 npm 依赖..."
npm install

echo ""
echo "🎭 安装 Playwright Chromium..."
npx playwright install chromium

echo ""
echo "✅ 部署完成！"
echo ""
echo "🚀 使用方法:"
echo "  cd $(pwd)"
echo "  npm test"
echo ""
