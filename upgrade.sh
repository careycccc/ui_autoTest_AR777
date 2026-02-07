#!/bin/bash

# UI 自动化测试平台 - 原地修复脚本
# 功能：修复页面性能数据一致性问题，增强日志和截图管理
# 使用方法: chmod +x fix-ui-automation.sh && ./fix-ui-automation.sh

set -e

echo "🔧 UI 自动化测试平台修复脚本"
echo "══════════════════════════════════════════"
echo "📍 修复内容："
echo "   1. 独立页面性能数据采集"
echo "   2. 智能截图管理"
echo "   3. 增强错误日志"
echo "   4. API错误自动截图"
echo "══════════════════════════════════════════"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ 请在 ui-automation-platform 项目根目录下运行此脚本"
    echo "   当前目录: $(pwd)"
    exit 1
fi

echo "📁 当前项目目录: $(pwd)"
echo ""

# 备份重要文件
echo "📦 创建备份..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src "$BACKUP_DIR/" 2>/dev/null || true
cp config.js "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ 备份已创建: $BACKUP_DIR"
echo ""

# 创建新目录
echo "📁 创建新目录..."
mkdir -p src/logger src/utils
echo "✅ 目录创建完成"
echo ""

# 更新 package.json - 添加新依赖
echo "📦 更新依赖..."
npm install winston@^3.11.0 chalk@^5.3.0 --save
echo "✅ 依赖安装完成"
echo ""

# 更新 config.js
echo "📄 更新 config.js..."
cat > config.js << 'CONFIG_EOF'
export default {
  browser: {
    headless: false,
    slowMo: 0,
    args: ['--disable-gpu-sandbox', '--disable-dev-shm-usage', '--no-sandbox']
  },

  timeout: {
    test: 60000,
    navigation: 30000,
    action: 10000
  },

  report: {
    outputDir: './reports',
    screenshots: {
      enabled: true,
      onPageSwitch: true,      // 页面切换时截图
      onError: true,            // 错误时截图
      onApiError: true,         // API错误时截图
      maxPerPage: 5,            // 每页最多截图数
      quality: 80               // 截图质量 (1-100)
    },
    video: false
  },

  performance: {
    enabled: true,
    collectOnPageSwitch: true, // 页面切换时采集
    sampleInterval: 1000,
    lightweight: false,         // 轻量级模式
    performanceSettleTime: 1000, // 性能数据稳定时间
    metrics: {
      webVitals: true,
      resources: true,
      dom: true,
      memory: true,
      cpu: true,
      fps: true,
      longTasks: true
    }
  },

  network: {
    enabled: true,
    captureBody: true,
    maxBodySize: 50000,
    errorScreenshot: true,      // API错误时截图
    errorThreshold: 3           // 连续错误阈值
  },

  logging: {
    level: 'info',              // debug, info, warn, error
    console: true,
    file: true,
    errorDetails: true,         // 详细错误信息
    performanceWarnings: true   // 性能警告
  },

  pageManagement: {
    autoDetectNavigation: true,  // 自动检测页面导航
    waitForStable: 2000,         // 等待页面稳定时间
    performanceSettleTime: 1000  // 性能数据稳定时间
  },

  thresholds: {
    lcp: { warning: 2500, critical: 4000 },
    cls: { warning: 0.1, critical: 0.25 },
    inp: { warning: 200, critical: 500 },
    fcp: { warning: 1800, critical: 3000 },
    ttfb: { warning: 800, critical: 1800 },
    fid: { warning: 100, critical: 300 },
    jsHeapSize: { warning: 50, critical: 100 },
    domNodes: { warning: 1500, critical: 3000 },
    jsEventListeners: { warning: 500, critical: 1000 },
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
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    }
  }
};

export const dataConfig = {
  userName: 'test_user',
  areaCodeData: '86',
  url: 'https://example.com',
  adminUrl: 'https://admin.example.com',
  adminUser: 'admin',
  adminPwd: 'password'
}
CONFIG_EOF
echo "✅ config.js 更新完成"
echo ""

# 创建 Logger 系统
echo "📄 创建 src/logger/Logger.js..."
cat > src/logger/Logger.js << 'LOGGER_EOF'
import winston from 'winston';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

class Logger {
  constructor(config = {}) {
    this.config = config;
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const customFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}] ${message} ${metaString}`;
    });

    this.winston = winston.createLogger({
      level: config.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        customFormat
      ),
      transports: []
    });

    if (config.console !== false) {
      this.winston.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    if (config.file !== false) {
      this.winston.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error'
      }));
      
      this.winston.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log')
      }));
    }

    this.pageStack = [];
    this.currentPage = null;
  }

  setCurrentPage(pageName) {
    this.currentPage = pageName;
    this.pageStack.push(pageName);
  }

  pageSwitch(from, to, details = {}) {
    const message = chalk.blue(`📄 页面切换: ${from || '初始'} → ${to}`);
    console.log('\n' + '═'.repeat(60));
    console.log(message);
    if (details.url) console.log(chalk.gray(`   URL: ${details.url}`));
    if (details.waitTime) console.log(chalk.gray(`   等待: ${details.waitTime}ms`));
    console.log('═'.repeat(60));
    
    this.winston.info(`页面切换: ${from} → ${to}`, details);
  }

  performanceWarning(metric, value, threshold, page) {
    const message = chalk.yellow(`⚠️  性能警告 [${page || this.currentPage}]: ${metric} = ${value} (阈值: ${threshold})`);
    console.log(message);
    this.winston.warn(`性能警告: ${metric}`, { value, threshold, page });
  }

  apiError(request, page) {
    const message = chalk.red(`🔴 API 错误 [${page || this.currentPage}]: ${request.method} ${request.url}`);
    console.log(message);
    
    if (request.error) {
      console.log(chalk.red(`   类型: ${request.error.type}`));
      console.log(chalk.red(`   消息: ${request.error.message}`));
      if (request.responseBody) {
        console.log(chalk.gray(`   响应: ${JSON.stringify(request.responseBody).substring(0, 200)}`));
      }
    }
    
    this.winston.error('API 错误', {
      page: page || this.currentPage,
      url: request.url,
      method: request.method,
      status: request.response?.status,
      error: request.error,
      responseBody: request.responseBody
    });
  }

  step(number, name, status = 'running') {
    const icons = { running: '⏳', passed: '✅', failed: '❌' };
    const colors = { running: 'cyan', passed: 'green', failed: 'red' };
    const icon = icons[status] || '📌';
    const color = colors[status] || 'white';
    
    const message = chalk[color](`   ${icon} Step ${number}: ${name}`);
    console.log(message);
    
    this.winston.info(`测试步骤 #${number}: ${name}`, { status, page: this.currentPage });
  }

  performance(data, page) {
    const p = page || this.currentPage;
    console.log(chalk.cyan(`\n   📊 性能数据 [${p}]:`));
    
    if (data.webVitals) {
      const v = data.webVitals;
      console.log(chalk.gray(`      LCP: ${v.lcp?.toFixed(0) || 'N/A'}ms`));
      console.log(chalk.gray(`      FCP: ${v.fcp?.toFixed(0) || 'N/A'}ms`));
      console.log(chalk.gray(`      CLS: ${v.cls?.toFixed(3) || 'N/A'}`));
      console.log(chalk.gray(`      INP: ${v.inp?.toFixed(0) || 'N/A'}ms`));
    }
    
    if (data.memory?.usedJSHeapMB) {
      console.log(chalk.gray(`      内存: ${data.memory.usedJSHeapMB}MB`));
    }
    
    if (data.dom?.nodes) {
      console.log(chalk.gray(`      DOM节点: ${data.dom.nodes}`));
    }
    
    this.winston.debug('性能数据', { page: p, metrics: data });
  }

  screenshot(filename, type, page) {
    const p = page || this.currentPage;
    console.log(chalk.magenta(`   📸 截图 [${p}]: ${type}`));
    this.winston.info('截图保存', { filename, type, page: p });
  }

  error(message, error, context = {}) {
    const fullContext = {
      page: this.currentPage,
      pageStack: this.pageStack,
      ...context
    };

    console.log(chalk.red(`\n❌ 错误: ${message}`));
    if (error?.message) console.log(chalk.red(`   消息: ${error.message}`));
    if (error?.stack && this.config.errorDetails) {
      console.log(chalk.gray('   堆栈:'));
      console.log(chalk.gray(error.stack.split('\n').slice(0, 5).join('\n')));
    }
    
    this.winston.error(message, {
      error: {
        message: error?.message,
        stack: error?.stack
      },
      ...fullContext
    });
  }

  info(message, meta = {}) {
    console.log(chalk.blue(`ℹ️  ${message}`));
    this.winston.info(message, meta);
  }

  warn(message, meta = {}) {
    console.log(chalk.yellow(`⚠️  ${message}`));
    this.winston.warn(message, meta);
  }

  debug(message, meta = {}) {
    if (this.config.level === 'debug' || process.env.DEBUG) {
      console.log(chalk.gray(`🐛 ${message}`));
      this.winston.debug(message, meta);
    }
  }

  success(message) {
    console.log(chalk.green(`✅ ${message}`));
    this.winston.info(message);
  }
}

export default Logger;
LOGGER_EOF
echo "✅ Logger 系统创建完成"
echo ""

# 创建 ScreenshotManager
echo "📄 创建 src/utils/ScreenshotManager.js..."
cat > src/utils/ScreenshotManager.js << 'SCREENSHOT_EOF'
import fs from 'fs';
import path from 'path';

export class ScreenshotManager {
  constructor(config, rootDir, logger) {
    this.config = config;
    this.rootDir = rootDir;
    this.logger = logger;
    
    const reportDir = path.isAbsolute(config.outputDir) 
      ? config.outputDir 
      : path.join(rootDir, config.outputDir);
    this.screenshotDir = path.join(reportDir, 'screenshots');
    
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
    
    this.pageScreenshots = {};
    this.totalScreenshots = 0;
  }

  async capture(name, type, pageName) {
    try {
      if (pageName) {
        const pageCount = this.pageScreenshots[pageName] || 0;
        if (pageCount >= this.config.screenshots.maxPerPage) {
          this.logger?.debug(`页面 "${pageName}" 已达到最大截图数量限制`);
          return null;
        }
        this.pageScreenshots[pageName] = pageCount + 1;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safePageName = (pageName || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${safePageName}_${type}_${name}_${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      await this.page.screenshot({
        path: filepath,
        type: 'png',
        quality: this.config.screenshots.quality || 80,
        fullPage: type === 'page_switch'
      });

      this.totalScreenshots++;
      this.logger?.screenshot(filename, type, pageName);

      return filepath;
    } catch (error) {
      this.logger?.error('截图失败', error, { name, type, pageName });
      return null;
    }
  }

  setPage(page) {
    this.page = page;
  }

  async cleanup(keepLast = 100) {
    try {
      const files = fs.readdirSync(this.screenshotDir)
        .map(file => ({
          name: file,
          path: path.join(this.screenshotDir, file),
          time: fs.statSync(path.join(this.screenshotDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > keepLast) {
        const toDelete = files.slice(keepLast);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
        }
        this.logger?.info(`清理了 ${toDelete.length} 个旧截图`);
      }
    } catch (error) {
      this.logger?.warn('清理截图失败', error);
    }
  }
}
SCREENSHOT_EOF
echo "✅ ScreenshotManager 创建完成"
echo ""

# 替换 TestCase.js
echo "📄 替换 src/core/TestCase.js..."
cat > src/core/TestCase.js << 'TESTCASE_EOF'
import fs from 'fs';
import path from 'path';
import { Assertions } from './Assertions.js';
import { PerformanceMonitor } from '../monitor/PerformanceMonitor.js';
import { NetworkMonitor } from '../monitor/NetworkMonitor.js';
import { ThresholdChecker } from '../monitor/ThresholdChecker.js';
import { ApiAnalyzer } from '../utils/ApiAnalyzer.js';
import { ScreenshotManager } from '../utils/ScreenshotManager.js';
import Logger from '../logger/Logger.js';

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

    // 初始化日志系统
    this.logger = new Logger(config.logging || {});

    // 初始化各个组件
    this.assert = new Assertions(page);
    this.performanceMonitor = new PerformanceMonitor(page, config.performance, this.logger);
    this.networkMonitor = new NetworkMonitor(page, config.network, this.logger);
    this.thresholdChecker = new ThresholdChecker(config.thresholds, (name) => this.captureScreenshot(name));
    this.apiAnalyzer = new ApiAnalyzer(config.apiAnalyzer || {});
    this.screenshotManager = new ScreenshotManager(config.report, rootDir, this.logger);
    this.screenshotManager.setPage(page);

    // 页面管理
    this.pageRecords = [];
    this.currentPageRecord = null;
    this.currentPageName = null;
    this.previousPageName = null;
    this.pageIndex = 0;

    // 数据收集
    this.performanceData = [];
    this.networkRequests = [];
    this.thresholdViolations = [];
    this.apiErrors = [];
    this.apiErrorCount = 0;
    this.consecutiveApiErrors = 0;

    this.init();
  }

  async init() {
    await this.performanceMonitor.start();
    await this.networkMonitor.start();

    // 监听网络请求
    this.networkMonitor.on('request', async (req) => {
      this.networkRequests.push(req);

      if (this.currentPageRecord) {
        this.currentPageRecord.apiRequests.push(req);

        if (req.error) {
          this.apiErrorCount++;
          this.consecutiveApiErrors++;
          
          // 记录API错误
          this.logger.apiError(req, this.currentPageName);
          this.apiErrors.push({
            ...req.error,
            page: this.currentPageName,
            url: req.url
          });

          if (this.currentPageRecord) {
            this.currentPageRecord.apiErrors.push(req.error);
          }

          // API错误截图
          if (this.config.network.errorScreenshot) {
            const screenshot = await this.screenshotManager.capture(
              `api-error-${this.apiErrorCount}`,
              'api_error',
              this.currentPageName
            );
            
            if (screenshot && this.currentPageRecord) {
              this.currentPageRecord.screenshots.push({
                type: 'api_error',
                path: screenshot,
                timestamp: new Date().toISOString(),
                error: req.error
              });
            }
          }

          // 连续错误告警
          if (this.consecutiveApiErrors >= this.config.network.errorThreshold) {
            this.logger.error(`连续 ${this.consecutiveApiErrors} 个API错误！`, null, {
              page: this.currentPageName,
              lastError: req.error
            });
          }
        } else {
          this.consecutiveApiErrors = 0;
        }
      }
    });
  }

  // 核心方法：切换到新页面
  async switchToPage(pageName, options = {}) {
    const {
      waitForSelector = null,
      waitForUrl = null,
      waitForApi = null,
      waitTime = 2000,
      collectPreviousPage = true,
      screenshot = true
    } = options;

    // 1. 完成上一个页面的数据采集
    if (collectPreviousPage && this.currentPageRecord) {
      await this.finishCurrentPage();
    }

    // 2. 记录页面切换
    this.logger.pageSwitch(this.currentPageName, pageName, {
      url: this.page.url(),
      waitTime
    });

    // 3. 处理等待条件
    if (waitForApi) {
      const responsePromise = this.page.waitForResponse(
        response => {
          if (typeof waitForApi === 'function') {
            return waitForApi(response);
          }
          return response.url().includes(waitForApi);
        },
        { timeout: 30000 }
      ).catch(() => null);
      
      if (responsePromise) await responsePromise;
    }

    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    if (waitForUrl) {
      if (typeof waitForUrl === 'string') {
        await this.page.waitForURL(url => url.includes(waitForUrl), { timeout: 10000 }).catch(() => {});
      } else {
        await this.page.waitForURL(waitForUrl, { timeout: 10000 }).catch(() => {});
      }
    }

    if (waitTime > 0) {
      await this.page.waitForTimeout(waitTime);
    }

    // 等待网络空闲
    await this.page.waitForLoadState('networkidle').catch(() => {});

    // 4. 创建新页面记录
    this.previousPageName = this.currentPageName;
    this.currentPageName = pageName;
    this.pageIndex++;
    
    this.currentPageRecord = {
      index: this.pageIndex,
      name: pageName,
      url: this.page.url(),
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

    // 5. 重置性能监控
    await this.performanceMonitor.resetForNewPage();
    await this.performanceMonitor.injectWebVitals();

    // 6. 页面截图
    if (screenshot && this.config.report.screenshots.onPageSwitch) {
      const screenshotPath = await this.screenshotManager.capture(
        `page-${this.pageIndex}`,
        'page_switch',
        pageName
      );
      
      if (screenshotPath) {
        this.currentPageRecord.screenshots.push({
          type: 'page_switch',
          path: screenshotPath,
          timestamp: new Date().toISOString()
        });
      }
    }

    this.logger.success(`页面 "${pageName}" 准备就绪`);
  }

  // 点击并切换页面的便捷方法
  async clickAndSwitchTo(pageName, action, options = {}) {
    await action();
    await this.switchToPage(pageName, options);
  }

  // 完成当前页面的数据采集
  async finishCurrentPage() {
    if (!this.currentPageRecord) return;

    this.logger.info(`完成页面 "${this.currentPageName}" 的数据采集`);

    try {
      // 1. 采集性能数据
      const perfData = await this.performanceMonitor.collect(this.currentPageName);
      perfData.device = this.currentDevice?.name || 'Desktop';
      perfData.url = this.page.url();
      perfData.pageName = this.currentPageName;
      
      this.currentPageRecord.performanceData = perfData;
      this.performanceData.push(perfData);

      // 2. 检查性能阈值
      const violations = await this.thresholdChecker.check(perfData, this.currentPageName);
      if (violations.length > 0) {
        this.currentPageRecord.thresholdViolations = violations;
        this.thresholdViolations.push(...violations);
      }

      // 3. 设置结束时间
      this.currentPageRecord.endTime = new Date().toISOString();

      // 4. 保存页面记录
      this.pageRecords.push(this.currentPageRecord);

      this.logger.debug('页面数据采集完成', {
        page: this.currentPageName,
        metrics: {
          lcp: perfData.webVitals?.lcp,
          fcp: perfData.webVitals?.fcp,
          cls: perfData.webVitals?.cls,
          memory: perfData.memory?.usedJSHeapMB,
          apiRequests: this.currentPageRecord.apiRequests.length
        }
      });
    } catch (error) {
      this.logger.error('完成页面数据采集失败', error, { page: this.currentPageName });
    }
  }

  // 导航到URL（创建初始页面）
  async goto(url, options = {}) {
    const { pageName = '首页' } = options;

    await this.step(`导航到: ${pageName}`, async () => {
      // 如果有当前页面，先完成它
      if (this.currentPageRecord) {
        await this.finishCurrentPage();
      }

      // 导航到URL
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout.navigation
      });

      // 创建页面记录
      await this.switchToPage(pageName, {
        waitTime: 1000,
        collectPreviousPage: false
      });
    });
  }

  // 测试步骤包装器
  async step(name, fn) {
    this.stepCount++;
    const stepRecord = {
      number: this.stepCount,
      name,
      startTime: new Date(),
      status: 'running'
    };

    this.logger.step(this.stepCount, name, 'running');

    try {
      await fn();
      stepRecord.status = 'passed';
      this.logger.step(this.stepCount, name, 'passed');
      
      if (this.config.screenshot?.onStep) {
        stepRecord.screenshot = await this.captureScreenshot(`step-${this.stepCount}`);
      }
    } catch (error) {
      stepRecord.status = 'failed';
      stepRecord.error = error.message;
      this.logger.step(this.stepCount, name, 'failed');
      
      // 错误截图
      if (this.config.report.screenshots.onError) {
        const screenshot = await this.screenshotManager.capture(
          `step-${this.stepCount}-error`,
          'error',
          this.currentPageName
        );
        stepRecord.screenshot = screenshot;
      }
      
      throw error;
    } finally {
      stepRecord.endTime = new Date();
      stepRecord.duration = stepRecord.endTime - stepRecord.startTime;
      this.currentSteps.push(stepRecord);
      
      if (this.currentPageRecord) {
        this.currentPageRecord.steps.push(stepRecord);
      }
    }
  }

  // 便捷操作方法
  async click(selector, options = {}) {
    await this.step(`点击: ${selector}`, async () => {
      await this.page.click(selector, { timeout: this.config.timeout.action, ...options });
    });
  }

  async fill(selector, value, options = {}) {
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    await this.step(`输入: ${selector} = "${displayValue}"`, async () => {
      await this.page.fill(selector, value, { timeout: this.config.timeout.action, ...options });
    });
  }

  async waitForTimeout(ms) {
    await this.page.waitForTimeout(ms);
  }

  // 旧版截图方法（兼容性）
  async captureScreenshot(name = 'screenshot') {
    return await this.screenshotManager.capture(name, 'manual', this.currentPageName);
  }

  // 手动采集性能数据
  async collectPerformance() {
    const data = await this.performanceMonitor.collect(this.currentPageName);
    this.performanceData.push(data);
    return data;
  }

  // 测试定义方法
  test(name, fn) { 
    this.tests.push({ name, fn }); 
  }
  
  beforeEach(fn) { 
    this.beforeEachFn = fn; 
  }
  
  afterEach(fn) { 
    this.afterEachFn = fn; 
  }

  // 数据获取方法
  getPageRecords() {
    const records = [...this.pageRecords];
    if (this.currentPageRecord && !records.find(r => r.index === this.currentPageRecord.index)) {
      records.push(this.currentPageRecord);
    }
    return records;
  }

  getNetworkRequests() { return this.networkRequests; }
  getThresholdViolations() { return this.thresholdViolations; }
  getApiErrors() { return this.apiErrors; }

  // 设备切换
  async setDevice(deviceName) {
    const device = this.config.devices[deviceName];
    if (!device) { 
      this.logger.warn(`未找到设备配置: ${deviceName}`);
      return; 
    }
    this.currentDevice = device;
    this.logger.info(`切换设备: ${device.name}`);
    await this.page.setViewportSize(device.viewport);
  }
}
TESTCASE_EOF
echo "✅ TestCase.js 替换完成"
echo ""

# 替换 PerformanceMonitor.js
echo "📄 替换 src/monitor/PerformanceMonitor.js..."
cat > src/monitor/PerformanceMonitor.js << 'PERFMONITOR_EOF'
export class PerformanceMonitor {
  constructor(page, config, logger) {
    this.page = page;
    this.config = config || {};
    this.logger = logger;
    this.cdpSession = null;
    this.isInitialized = false;
    this.currentPageStartTime = null;
    this.pageLoadCount = 0;
  }

  async start() {
    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      await this.cdpSession.send('Performance.enable');
      this.isInitialized = true;
      this.logger?.debug('性能监控已启动');
    } catch (e) {
      this.logger?.error('性能监控启动失败', e);
    }
  }

  async resetForNewPage() {
    this.currentPageStartTime = Date.now();
    this.pageLoadCount++;
    
    try {
      // 清理之前页面的监听器
      await this.page.evaluate(() => {
        // 断开所有观察器
        if (window.__lcpObserver) {
          window.__lcpObserver.disconnect();
          window.__lcpObserver = null;
        }
        if (window.__clsObserver) {
          window.__clsObserver.disconnect();
          window.__clsObserver = null;
        }
        if (window.__fidObserver) {
          window.__fidObserver.disconnect();
          window.__fidObserver = null;
        }
        if (window.__inpObserver) {
          window.__inpObserver.disconnect();
          window.__inpObserver = null;
        }
        if (window.__longTaskObserver) {
          window.__longTaskObserver.disconnect();
          window.__longTaskObserver = null;
        }
        
        // 完全重置性能数据
        window.__perfMonitor = {
          pageLoadTime: Date.now(),
          pageLoadCount: 0,
          lcp: null,
          lcpElementDetails: null,
          fcp: null,
          cls: 0,
          clsEntries: [],
          fid: null,
          inp: null,
          ttfb: null,
          navigation: {},
          resources: [],
          longTasks: []
        };
      });
      
      // 标记新页面
      await this.page.evaluate((count) => {
        window.__perfMonitor.pageLoadCount = count;
        window.__perfMonitor.pageLoadTime = Date.now();
      }, this.pageLoadCount);
      
      this.logger?.debug(`性能监控已重置 (页面 #${this.pageLoadCount})`);
    } catch (e) {
      this.logger?.warn('重置性能监控失败', e);
    }
  }

  async injectWebVitals() {
    try {
      await this.page.evaluate(() => {
        if (!window.__perfMonitor) {
          window.__perfMonitor = {
            pageLoadTime: Date.now(),
            lcp: null,
            fcp: null,
            cls: 0,
            fid: null,
            inp: null,
            ttfb: null,
            longTasks: []
          };
        }

        // 重新创建 LCP Observer
        try {
          window.__lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              window.__perfMonitor.lcp = lastEntry.startTime;
              
              if (lastEntry.element) {
                const el = lastEntry.element;
                window.__perfMonitor.lcpElementDetails = {
                  tag: el.tagName,
                  id: el.id || null,
                  class: el.className || null
                };
              }
            }
          });
          window.__lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        // FCP - 从 paint entries 获取
        try {
          const paintEntries = performance.getEntriesByType('paint');
          for (const entry of paintEntries) {
            if (entry.name === 'first-contentful-paint') {
              window.__perfMonitor.fcp = entry.startTime;
            }
          }
        } catch (e) {}

        // 重新创建 CLS Observer
        try {
          window.__perfMonitor.cls = 0;
          window.__perfMonitor.clsEntries = [];
          
          window.__clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.__perfMonitor.cls += entry.value;
                window.__perfMonitor.clsEntries.push({
                  value: entry.value,
                  time: entry.startTime
                });
              }
            }
          });
          window.__clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        // 重新创建 FID Observer
        try {
          window.__fidObserver = new PerformanceObserver((list) => {
            const entry = list.getEntries()[0];
            if (entry) {
              window.__perfMonitor.fid = entry.processingStart - entry.startTime;
            }
          });
          window.__fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (e) {}

        // 重新创建 INP Observer
        try {
          window.__perfMonitor.inp = null;
          
          window.__inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const duration = entry.duration;
              if (!window.__perfMonitor.inp || duration > window.__perfMonitor.inp) {
                window.__perfMonitor.inp = duration;
              }
            }
          });
          window.__inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch (e) {}

        // 重新创建 Long Tasks Observer
        try {
          window.__perfMonitor.longTasks = [];
          
          window.__longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__perfMonitor.longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
          window.__longTaskObserver.observe({ type: 'longtask', buffered: false });
        } catch (e) {}

        // TTFB 和 Navigation Timing
        try {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) {
            window.__perfMonitor.ttfb = nav.responseStart;
            window.__perfMonitor.navigation = {
              domContentLoaded: nav.domContentLoadedEventEnd,
              loadComplete: nav.loadEventEnd,
              domInteractive: nav.domInteractive
            };
          }
        } catch (e) {}
      });

      this.logger?.debug('Web Vitals 监控已注入');
    } catch (e) {
      this.logger?.warn('注入 Web Vitals 失败', e);
    }
  }

  async collect(pageName) {
    const result = {
      pageName,
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      pageLoadTime: this.currentPageStartTime ? Date.now() - this.currentPageStartTime : null,
      webVitals: {},
      memory: {},
      dom: {},
      cpu: {},
      resources: {}
    };

    try {
      // 等待数据稳定
      if (this.config.performanceSettleTime) {
        await this.page.waitForTimeout(this.config.performanceSettleTime);
      }

      // 收集 Web Vitals
      const webVitals = await this.page.evaluate(() => {
        const pm = window.__perfMonitor || {};
        return {
          lcp: pm.lcp,
          fcp: pm.fcp,
          cls: pm.cls,
          fid: pm.fid,
          inp: pm.inp,
          ttfb: pm.ttfb,
          longTasksCount: pm.longTasks?.length || 0,
          maxLongTaskDuration: pm.longTasks?.reduce((max, t) => Math.max(max, t.duration), 0) || 0
        };
      });
      result.webVitals = webVitals;

      // 收集 CDP 指标
      if (this.cdpSession && this.isInitialized) {
        try {
          const { metrics } = await this.cdpSession.send('Performance.getMetrics');
          const m = {};
          metrics.forEach(metric => m[metric.name] = metric.value);

          result.memory = {
            usedJSHeapSize: m.JSHeapUsedSize,
            totalJSHeapSize: m.JSHeapTotalSize,
            usedJSHeapMB: m.JSHeapUsedSize ? Math.round(m.JSHeapUsedSize / 1024 / 1024 * 100) / 100 : null
          };

          // DOM 指标（轻量级模式）
          if (this.config.lightweight) {
            result.dom = {
              nodes: Math.round(m.Nodes || 0),
              jsEventListeners: Math.round(m.JSEventListeners || 0)
            };
          } else {
            // 完整 DOM 采集
            const domStats = await this.page.evaluate(() => {
              const allElements = document.querySelectorAll('*');
              return {
                nodes: allElements.length,
                scripts: document.querySelectorAll('script').length,
                stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
                images: document.querySelectorAll('img').length,
                forms: document.querySelectorAll('form').length,
                inputs: document.querySelectorAll('input, textarea, select').length
              };
            });
            result.dom = {
              ...domStats,
              jsEventListeners: Math.round(m.JSEventListeners || 0)
            };
          }

          result.cpu = {
            scriptDuration: Math.round((m.ScriptDuration || 0) * 1000),
            taskDuration: Math.round((m.TaskDuration || 0) * 1000)
          };
        } catch (e) {
          this.logger?.warn('CDP 指标采集失败', e);
        }
      }

      // 收集资源统计（轻量级）
      const resourceStats = await this.page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const stats = { 
          total: resources.length, 
          byType: {},
          slowResources: [],
          largeResources: []
        };
        
        resources.forEach(r => {
          const type = r.initiatorType;
          if (!stats.byType[type]) {
            stats.byType[type] = { count: 0, totalDuration: 0, totalSize: 0 };
          }
          stats.byType[type].count++;
          stats.byType[type].totalDuration += r.duration;
          
          const size = r.transferSize || r.encodedBodySize || 0;
          stats.byType[type].totalSize += size;
          
          // 记录慢资源
          if (r.duration > 500) {
            stats.slowResources.push({
              url: r.name.split('?')[0].split('/').pop() || r.name.substring(0, 50),
              duration: Math.round(r.duration),
              type: type
            });
          }
          
          // 记录大资源
          if (size > 100 * 1024) {
            stats.largeResources.push({
              url: r.name.split('?')[0].split('/').pop() || r.name.substring(0, 50),
              size: Math.round(size / 1024),
              type: type
            });
          }
        });
        
        // 只保留前5个
        stats.slowResources = stats.slowResources.slice(0, 5);
        stats.largeResources = stats.largeResources.slice(0, 5);
        
        return stats;
      });
      result.resources = resourceStats;

      this.logger?.performance(result, pageName);
      
    } catch (e) {
      this.logger?.error('采集性能数据失败', e, { pageName });
    }

    return result;
  }

  async stop() {
    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Performance.disable');
      } catch (e) {}
    }
  }
}
PERFMONITOR_EOF
echo "✅ PerformanceMonitor.js 替换完成"
echo ""

# 替换 NetworkMonitor.js (简化版)
echo "📄 替换 src/monitor/NetworkMonitor.js..."
cat > src/monitor/NetworkMonitor.js << 'NETWORKMONITOR_EOF'
import { EventEmitter } from 'events';

export class NetworkMonitor extends EventEmitter {
  constructor(page, config, logger) {
    super();
    this.page = page;
    this.config = config;
    this.logger = logger;
    this.requests = [];
  }

  async start() {
    try {
      this.page.on('request', request => this.onRequest(request));
      this.page.on('response', response => this.onResponse(response));
      this.page.on('requestfailed', request => this.onRequestFailed(request));
      
      this.logger?.debug('网络监控已启动');
    } catch (e) {
      this.logger?.error('网络监控启动失败', e);
    }
  }

  onRequest(request) {
    const requestInfo = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: Date.now(),
      resourceType: request.resourceType()
    };
    
    this.requests.push(requestInfo);
  }

  async onResponse(response) {
    const request = response.request();
    const requestInfo = this.requests.find(r => 
      r.url === request.url() && 
      r.method === request.method() &&
      Date.now() - r.timestamp < 60000
    );
    
    if (requestInfo) {
      requestInfo.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers()
      };
      
      requestInfo.duration = Date.now() - requestInfo.timestamp;
      
      if (this.isApiRequest(request)) {
        if (this.config.captureBody) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('json')) {
              requestInfo.responseBody = await response.json().catch(() => null);
            }
          } catch (e) {}
        }
        
        this.analyzeError(requestInfo);
        this.emit('request', requestInfo);
      }
    }
  }

  onRequestFailed(request) {
    const requestInfo = {
      url: request.url(),
      method: request.method(),
      error: {
        type: 'network_error',
        message: request.failure()?.errorText || 'Unknown error'
      }
    };
    
    if (this.isApiRequest(request)) {
      this.emit('request', requestInfo);
    }
  }

  isApiRequest(request) {
    const resourceType = request.resourceType();
    const url = request.url();
    
    if (!['xhr', 'fetch'].includes(resourceType)) {
      return false;
    }
    
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
    if (staticExtensions.some(ext => url.toLowerCase().includes(ext))) {
      return false;
    }
    
    return true;
  }

  analyzeError(requestInfo) {
    const status = requestInfo.response?.status;
    
    if (status >= 400) {
      requestInfo.error = {
        type: status >= 500 ? 'server_error' : 'client_error',
        message: `HTTP ${status}: ${requestInfo.response.statusText}`,
        status
      };
    }
    
    if (requestInfo.responseBody) {
      const body = requestInfo.responseBody;
      
      if (body.code !== undefined && body.code !== 0 && body.code !== 200 && body.code !== '0' && body.code !== '200') {
        requestInfo.error = {
          type: 'api_error',
          message: body.msg || body.message || 'API Error',
          code: body.code
        };
      }
      
      if (body.success === false) {
        requestInfo.error = {
          type: 'api_error',
          message: body.message || body.msg || 'API Failed'
        };
      }
      
      if (body.error) {
        requestInfo.error = {
          type: 'api_error',
          message: typeof body.error === 'string' ? body.error : (body.error.message || 'API Error'),
          details: body.error
        };
      }
    }
  }

  clear() {
    this.requests = [];
  }

  async stop() {
    // Playwright 会自动清理事件监听器
  }
}
NETWORKMONITOR_EOF
echo "✅ NetworkMonitor.js 替换完成"
echo ""

# 更新 TestRunner.js
echo "📄 更新 src/core/TestRunner.js..."
cat > src/core/TestRunner.js << 'TESTRUNNER_EOF'
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { TestCase } from './TestCase.js';
import { HTMLReporter } from '../reporter/HTMLReporter.js';
import Logger from '../logger/Logger.js';

export class TestRunner {
  constructor(config, rootDir = process.cwd()) {
    this.config = config;
    this.rootDir = rootDir;
    this.logger = new Logger(config.logging || {});
    this.results = {
      startTime: null,
      endTime: null,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: [],
      thresholdViolations: [],
      apiErrors: [],
      allNetworkRequests: []
    };
    this.browser = null;
    
    const reportDir = path.isAbsolute(config.report.outputDir)
      ? config.report.outputDir 
      : path.join(rootDir, config.report.outputDir);
    this.reporter = new HTMLReporter(reportDir, config, this.logger);
  }

  async run(testFiles, options = {}) {
    this.results.startTime = new Date();
    const devices = options.devices || ['desktop'];

    console.log('\n🧪 UI 自动化测试平台 (修复版)');
    console.log('══════════════════════════════════════════');
    console.log(`📋 测试文件: ${testFiles.length} 个`);
    console.log(`📱 测试设备: ${devices.join(', ')}`);
    console.log('══════════════════════════════════════════\n');

    try {
      this.logger.info('启动浏览器...');
      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo,
        args: this.config.browser.args
      });

      for (const deviceName of devices) {
        const device = this.config.devices[deviceName];
        if (!device) {
          this.logger.warn(`未找到设备配置: ${deviceName}`);
          continue;
        }

        console.log(`\n📱 设备: ${device.name}`);
        console.log('━'.repeat(50));

        for (const file of testFiles) {
          await this.runTestFile(file, device);
        }
      }
    } catch (error) {
      this.logger.error('测试运行失败', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }

    this.results.endTime = new Date();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    // 生成报告
    await this.reporter.generate(this.results);
    
    // 打印总结
    console.log('\n══════════════════════════════════════════');
    console.log('📊 测试结果');
    console.log('──────────────────────────────────────────');
    console.log(`✅ 通过: ${this.results.passed}`);
    console.log(`❌ 失败: ${this.results.failed}`);
    console.log(`⏭️  跳过: ${this.results.skipped}`);
    console.log(`⏱️  耗时: ${(this.results.duration / 1000).toFixed(2)}s`);
    
    if (this.results.thresholdViolations.length > 0) {
      console.log(`\n⚠️ 性能告警: ${this.results.thresholdViolations.length} 个`);
      const critical = this.results.thresholdViolations.filter(v => v.level === 'critical').length;
      const warning = this.results.thresholdViolations.filter(v => v.level === 'warning').length;
      console.log(`   🔴 严重: ${critical}`);
      console.log(`   🟡 警告: ${warning}`);
    }
    
    console.log('══════════════════════════════════════════\n');

    return this.results;
  }

  async runTestFile(filePath, device) {
    console.log(`\n📁 ${path.basename(filePath)}`);
    
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(this.rootDir, filePath);
      
      if (!fs.existsSync(absolutePath)) {
        this.logger.error(`文件不存在: ${absolutePath}`);
        return;
      }

      const testModule = await import('file://' + absolutePath);
      if (typeof testModule.default !== 'function') {
        this.logger.error('测试文件必须导出默认函数');
        return;
      }

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
        startTime: new Date(),
        performance: [],
        networkRequests: [],
        thresholdViolations: [],
        apiErrors: [],
        pageRecords: []
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
      
      // 收集所有数据
      suite.performance = testCase.performanceData;
      suite.networkRequests = testCase.networkRequests;
      suite.thresholdViolations = testCase.getThresholdViolations();
      suite.apiErrors = testCase.getApiErrors();
      suite.pageRecords = testCase.getPageRecords();

      // 汇总到总结果
      this.results.thresholdViolations.push(...suite.thresholdViolations);
      this.results.apiErrors.push(...suite.apiErrors);
      this.results.allNetworkRequests.push(...suite.networkRequests);
      
      this.results.suites.push(suite);

      await context.close();
    } catch (error) {
      this.logger.error('测试文件执行失败', error);
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

    console.log(`\n  🧪 ${test.name}`);
    testCase.currentTest = result;
    testCase.stepCount = 0;
    testCase.currentSteps = [];

    try {
      if (testCase.beforeEachFn) {
        await testCase.beforeEachFn();
      }
      
      await test.fn();
      
      // 完成最后一个页面的数据采集
      if (testCase.currentPageRecord) {
        await testCase.finishCurrentPage();
      }
      
      result.status = 'passed';
      console.log('\n    ✅ 测试通过');
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        stack: error.stack
      };
      console.log('\n    ❌ 测试失败:', error.message);
      
      // 失败时截图
      if (this.config.report.screenshots.onError) {
        try {
          const screenshot = await testCase.screenshotManager.capture(
            'test-failed',
            'error',
            testCase.currentPageName
          );
          if (screenshot) {
            result.screenshots.push({
              type: 'error',
              path: screenshot,
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {}
      }
    } finally {
      if (testCase.afterEachFn) {
        try {
          await testCase.afterEachFn();
        } catch (e) {
          this.logger.error('afterEach 执行失败', e);
        }
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
TESTRUNNER_EOF
echo "✅ TestRunner.js 更新完成"
echo ""

# 更新 HTMLReporter.js
echo "📄 更新 src/reporter/HTMLReporter.js..."
cat > src/reporter/HTMLReporter.js << 'HTMLREPORTER_EOF'
import fs from 'fs';
import path from 'path';

export class HTMLReporter {
  constructor(outputDir, config, logger) {
    this.outputDir = outputDir;
    this.config = config;
    this.logger = logger;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  async generate(results) {
    const html = this.buildHTML(results);
    const outputPath = path.join(this.outputDir, 'report.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    this.logger?.info(`HTML报告已生成: ${outputPath}`);
    console.log(`\n📊 测试报告: file://${outputPath}`);
    
    return outputPath;
  }

  buildHTML(results) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI自动化测试报告 - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    
    .header {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    
    .card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .card.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .card.error { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
    
    .suite {
      background: white;
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    
    .test {
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 2px solid transparent;
    }
    .test.passed { border-color: #38ef7d; background: #f0fff4; }
    .test.failed { border-color: #f45c43; background: #fff5f5; }
    
    .page-records {
      margin-top: 20px;
    }
    
    .page-record {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .page-name {
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    
    .metric {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
    }
    
    .metric-label {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    
    .metric.warning .metric-value { color: #f5a623; }
    .metric.critical .metric-value { color: #f45c43; }
    
    .api-errors {
      margin-top: 10px;
      padding: 10px;
      background: #fff5f5;
      border-radius: 6px;
      border: 1px solid #feb2b2;
    }
    
    .screenshots {
      display: flex;
      gap: 10px;
      margin-top: 10px;
      overflow-x: auto;
    }
    
    .screenshot-thumb {
      width: 150px;
      height: 100px;
      object-fit: cover;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 UI 自动化测试报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <div class="summary-cards">
        <div class="card">
          <h3>${results.total}</h3>
          <p>总测试数</p>
        </div>
        <div class="card success">
          <h3>${results.passed}</h3>
          <p>通过</p>
        </div>
        <div class="card error">
          <h3>${results.failed}</h3>
          <p>失败</p>
        </div>
        <div class="card">
          <h3>${(results.duration / 1000).toFixed(1)}s</h3>
          <p>总耗时</p>
        </div>
      </div>
    </div>
    
    ${results.suites.map(suite => this.buildSuiteHTML(suite)).join('')}
  </div>
</body>
</html>`;
  }

  buildSuiteHTML(suite) {
    return `
    <div class="suite">
      <h2>${suite.name} - ${suite.device}</h2>
      <p>耗时: ${(suite.duration / 1000).toFixed(2)}s</p>
      
      ${suite.tests.map(test => this.buildTestHTML(test)).join('')}
    </div>`;
  }

  buildTestHTML(test) {
    const statusClass = test.status === 'passed' ? 'passed' : 'failed';
    
    return `
    <div class="test ${statusClass}">
      <h3>${test.name} - ${test.status === 'passed' ? '✅ 通过' : '❌ 失败'}</h3>
      
      ${test.error ? `
        <div style="margin-top: 10px; color: red;">
          错误: ${test.error.message}
        </div>
      ` : ''}
      
      ${test.pageRecords && test.pageRecords.length > 0 ? `
        <div class="page-records">
          <h4>📄 页面性能数据</h4>
          ${test.pageRecords.map((page, index) => this.buildPageRecordHTML(page, index + 1)).join('')}
        </div>
      ` : ''}
    </div>`;
  }

  buildPageRecordHTML(page, index) {
    const perf = page.performanceData || {};
    const webVitals = perf.webVitals || {};
    
    return `
    <div class="page-record">
      <div class="page-header">
        <div class="page-name">#${index}. ${page.name}</div>
        <div>${perf.pageLoadTime ? (perf.pageLoadTime / 1000).toFixed(2) + 's' : ''}</div>
      </div>
      
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${webVitals.lcp ? webVitals.lcp.toFixed(0) : '-'}</div>
          <div class="metric-label">LCP (ms)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${webVitals.fcp ? webVitals.fcp.toFixed(0) : '-'}</div>
          <div class="metric-label">FCP (ms)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${webVitals.cls ? webVitals.cls.toFixed(3) : '-'}</div>
          <div class="metric-label">CLS</div>
        </div>
        <div class="metric">
          <div class="metric-value">${perf.memory?.usedJSHeapMB || '-'}</div>
          <div class="metric-label">Memory (MB)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${perf.dom?.nodes || '-'}</div>
          <div class="metric-label">DOM Nodes</div>
        </div>
      </div>
      
      ${page.apiErrors && page.apiErrors.length > 0 ? `
        <div class="api-errors">
          <strong>API 错误:</strong>
          ${page.apiErrors.map(e => `<div>${e.message}</div>`).join('')}
        </div>
      ` : ''}
      
      ${page.screenshots && page.screenshots.length > 0 ? `
        <div class="screenshots">
          ${page.screenshots.map(s => `
            <img src="${s.path.replace(/\\/g, '/')}" class="screenshot-thumb" onclick="window.open(this.src)">
          `).join('')}
        </div>
      ` : ''}
    </div>`;
  }
}
HTMLREPORTER_EOF
echo "✅ HTMLReporter.js 更新完成"
echo ""

# 创建示例测试文件
echo "📄 创建示例测试 tests/example-fixed.test.js..."
cat > tests/example-fixed.test.js << 'EXAMPLE_EOF'
export default async function(t) {
  t.test('多页面独立性能测试', async () => {
    // ========================================
    // 页面1: Google 首页
    // ========================================
    await t.goto('https://www.google.com', { 
      pageName: 'Google首页' 
    });
    
    await t.waitForTimeout(2000); // 让页面稳定
    
    // ========================================
    // 操作: 执行搜索
    // ========================================
    await t.step('输入搜索关键词', async () => {
      await t.fill('textarea[name="q"]', 'Playwright automation');
    });
    
    await t.step('触发搜索', async () => {
      await t.page.keyboard.press('Enter');
    });
    
    // ========================================
    // 页面2: 搜索结果页
    // ========================================
    await t.switchToPage('搜索结果页', {
      waitForSelector: '#search',
      waitTime: 3000,
      collectPreviousPage: true  // 会先完成首页的数据采集
    });
    
    await t.step('验证搜索结果', async () => {
      await t.assert.visible('#search');
    });
    
    // ========================================
    // 操作: 点击第一个结果
    // ========================================
    await t.step('点击第一个搜索结果', async () => {
      const firstResult = await t.page.locator('#search h3').first();
      const href = await firstResult.evaluate(el => {
        const link = el.closest('a');
        return link ? link.href : null;
      });
      
      if (href) {
        await t.page.goto(href);
      }
    });
    
    // ========================================
    // 页面3: 目标网站
    // ========================================
    await t.switchToPage('Playwright文档', {
      waitTime: 3000,
      collectPreviousPage: true  // 会先完成搜索结果页的数据采集
    });
    
    await t.step('验证页面加载', async () => {
      await t.assert.urlContains('playwright');
    });
  });

  t.test('使用 clickAndSwitchTo 便捷方法', async () => {
    await t.goto('https://example.com', { 
      pageName: '示例网站首页' 
    });
    
    // 使用便捷方法：点击并切换页面
    await t.clickAndSwitchTo('更多信息页', 
      async () => {
        await t.click('a[href*="more"]').catch(() => {
          console.log('未找到更多信息链接');
        });
      },
      {
        waitTime: 2000,
        collectPreviousPage: true
      }
    );
  });
}
EXAMPLE_EOF
echo "✅ 示例测试创建完成"
echo ""

# 完成提示
echo ""
echo "════════════════════════════════════════════"
echo "✅ 修复完成！"
echo "════════════════════════════════════════════"
echo ""
echo "📝 主要修复内容："
echo "   1. ✅ 页面性能数据独立采集"
echo "   2. ✅ switchToPage 方法优化"
echo "   3. ✅ 智能截图管理（每页限制5张）"
echo "   4. ✅ 增强错误日志系统"
echo "   5. ✅ API错误自动截图"
echo ""
echo "🚀 测试修复效果："
echo "   npm test"
echo ""
echo "📁 新增/修改的文件："
echo "   - config.js (更新配置)"
echo "   - src/logger/Logger.js (新增)"
echo "   - src/utils/ScreenshotManager.js (新增)"
echo "   - src/core/TestCase.js (核心修复)"
echo "   - src/monitor/PerformanceMonitor.js (优化)"
echo "   - src/monitor/NetworkMonitor.js (简化)"
echo "   - tests/example-fixed.test.js (示例)"
echo ""
echo "⚠️  注意事项："
echo "   1. 已创建备份目录: $BACKUP_DIR"
echo "   2. 使用 switchToPage() 进行页面切换"
echo "   3. 设置 collectPreviousPage: true 采集上一页数据"
echo ""