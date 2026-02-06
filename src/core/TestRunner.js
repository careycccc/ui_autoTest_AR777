import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { TestCase } from './TestCase.js';
import { HTMLReporter } from '../reporter/HTMLReporter.js';
import { PageLoadReporter } from '../reporter/PageLoadReporter.js';

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
      thresholdViolations: [],
      pageLoadMetrics: []
    };
    this.browser = null;

    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir
      : path.join(rootDir, config.report.outputDir);

    this.reportDir = reportDir;
    this.reporter = new HTMLReporter(reportDir, config);
    this.pageLoadReporter = new PageLoadReporter(reportDir);
  }

  async run(testFiles, options = {}) {
    this.results.startTime = new Date();

    const devices = options.devices || ['desktop'];

    try {
      console.log('🚀 启动浏览器...');

      // 优化浏览器启动参数
      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo,
        args: [
          '--disable-gpu-sandbox',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-accelerated-2d-canvas',  // 减少 GPU 压力
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          // 移动端模拟优化
          '--force-device-scale-factor=1'  // 强制 1 倍缩放
        ]
      });

      for (const deviceName of devices) {
        const device = this.config.devices[deviceName];
        if (!device) {
          console.warn('⚠️ 未找到设备: ' + deviceName);
          continue;
        }

        console.log('\n📱 设备: ' + device.name);
        if (device.isMobile) {
          console.log('   视口: ' + device.viewport.width + 'x' + device.viewport.height);
          console.log('   缩放: ' + (device.deviceScaleFactor || 1) + 'x');
        }
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

    await this.generateReports();

    return this.results;
  }

  async runTestFile(filePath, device) {
    console.log('\n📁 ' + path.basename(filePath));

    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.rootDir, filePath);

      if (!fs.existsSync(absolutePath)) {
        console.error('❌ 文件不存在: ' + absolutePath);
        return;
      }

      const testModule = await import('file://' + absolutePath);

      if (typeof testModule.default !== 'function') {
        console.error('❌ 测试文件必须导出默认函数');
        return;
      }

      // 优化 context 配置
      const contextOptions = {
        viewport: device.viewport,
        deviceScaleFactor: device.deviceScaleFactor || 1,
        isMobile: device.isMobile || false,
        hasTouch: device.hasTouch || false,
        // 优化：减少不必要的功能
        javaScriptEnabled: true,
        bypassCSP: false,
        ignoreHTTPSErrors: true
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

      this.results.thresholdViolations.push(...suite.thresholdViolations);
      this.results.pageLoadMetrics.push(...testCase.getPageLoadMetrics());

      testCase.getPageLoadMetrics().forEach(m => {
        this.pageLoadReporter.addPageMetrics(m);
      });

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
      screenshots: []
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
      result.error = { message: error.message, stack: error.stack };
      console.log('    ❌ 失败: ' + error.message);

      if (this.config.screenshot.onError) {
        try {
          const screenshotPath = await testCase.captureScreenshot('error');
          result.screenshots.push({ type: 'error', path: screenshotPath, timestamp: new Date().toISOString() });
        } catch (e) { }
      }

    } finally {
      if (testCase.afterEachFn) {
        try { await testCase.afterEachFn(); } catch (e) { }
      }
    }

    result.endTime = new Date();
    result.duration = result.endTime - result.startTime;
    result.steps = [...testCase.currentSteps];
    testCase.currentSteps = [];

    return result;
  }

  async generateReports() {
    const mainJsonPath = path.join(this.reportDir, 'test-report.json');
    const mainHtmlPath = path.join(this.reportDir, 'test-report.html');

    fs.writeFileSync(mainJsonPath, JSON.stringify(this.results, null, 2));

    const htmlContent = this.reporter.generateHTML(this.results);
    fs.writeFileSync(mainHtmlPath, htmlContent);

    console.log('\n📊 报告已生成:');
    console.log('   主报告: ' + mainHtmlPath);

    this.pageLoadReporter.generate();
  }
}
