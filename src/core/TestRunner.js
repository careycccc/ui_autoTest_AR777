// src/core/TestRunner.js
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
      thresholdViolations: [],
      apiErrors: [],
      allNetworkRequests: []
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

    // 生成 HTML 报告
    const reportResult = await this.reporter.generate(this.results);
    this.results.reportPath = reportResult.htmlPath;

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
        hasTouch: device.hasTouch || false,
        permissions: ['clipboard-read', 'clipboard-write']  // 🔥 授予剪贴板权限
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
      suite.apiErrors = testCase.getApiErrors();
      suite.pageRecords = testCase.getPageRecords();

      this.results.thresholdViolations.push(...suite.thresholdViolations);
      this.results.apiErrors.push(...suite.apiErrors);
      this.results.allNetworkRequests.push(...suite.networkRequests);
      this.results.suites.push(suite);
      // 这个浏览器会关闭
      // await context.close();
      // 浏览器会一直打开
      // 调试模式下保持浏览器打开
      if (this.browser && !this.config.debug) {
        await this.browser.close();
      } else if (this.config.debug && this.browser) {
        console.log('\n🔧 调试模式：浏览器保持打开');
        if (this.config.debugPauseTime > 0) {
          console.log(`⏳ 暂停 ${this.config.debugPauseTime}ms 后关闭...`);
          await new Promise(resolve => setTimeout(resolve, this.config.debugPauseTime));
          await this.browser.close();
        } else {
          console.log('按 Ctrl+C 手动关闭浏览器');
          // 无限等待
          await new Promise(() => { });
        }
      }

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
      thresholdViolations: [],
      apiErrors: [],
      pageRecords: []
    };

    console.log('\n  🧪', test.name);
    testCase.currentTest = result;
    testCase.stepCount = 0;

    try {
      if (testCase.beforeEachFn) await testCase.beforeEachFn();
      await test.fn();
      result.status = 'passed';
      console.log('\n    ✅ 测试通过');
    } catch (error) {
      result.status = 'failed';
      result.error = { message: error.message, stack: error.stack };
      console.log('\n    ❌ 测试失败:', error.message);

      // 🔥 标记当前页面为失败状态
      if (testCase.currentPageRecord) {
        testCase.currentPageRecord.testFailed = true;
      }

      if (this.config.screenshot.onError) {
        try {
          // 只在还没截过错误图时截图
          if (!testCase.currentPageRecord?.errorScreenshotTaken) {
            const screenshotPath = await testCase.captureScreenshot('error');
            result.screenshots.push({ type: 'error', path: screenshotPath, timestamp: new Date().toISOString() });
            if (testCase.currentPageRecord) {
              testCase.currentPageRecord.errorScreenshotTaken = true;
            }
          }
        } catch (e) { }
      }

    } finally {
      if (testCase.afterEachFn) {
        try { await testCase.afterEachFn(); } catch (e) { }
      }

      // ====== 关键：完成最后一个页面的记录 ======
      if (testCase.currentPageRecord) {
        await testCase.finishCurrentPage(true);
      }
    }

    result.endTime = new Date();
    result.duration = result.endTime - result.startTime;
    result.steps = [...testCase.currentSteps];
    result.thresholdViolations = testCase.getThresholdViolations();
    result.apiErrors = testCase.getApiErrors();
    result.pageRecords = testCase.getPageRecords();
    testCase.currentSteps = [];
    return result;
  }
}