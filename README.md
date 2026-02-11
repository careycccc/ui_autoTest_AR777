# 🧪 UI 自动化测试平台

基于 Playwright 的 UI 自动化测试平台，支持性能监控、网络请求采集、控制台错误监控和精美 HTML 报告。

## ✨ 核心特性

- ✅ 简洁的测试用例 API
- 📊 性能数据采集 (CPU、内存、DOM、Web Vitals)
- 🌐 网络请求/响应捕获与 API 错误分析
- 💥 控制台错误监控与智能截图
- 📸 自动截图（步骤截图、错误截图）
- 📈 精美的 HTML 报告（支持子用例分组）
- 🔄 可配置的重试机制
- 🎯 多设备支持（桌面、移动端）

---

## 📦 安装

```bash
npm install
npx playwright install chromium
```

---

## 🚀 快速开始

### 基本用例

```javascript
import { test } from '@playwright/test';
import { TestCase } from './src/core/TestCase.js';
import config from './config.js';

test('测试示例', async ({ page }) => {
  const t = new TestCase(page, config);
  
  // 访问页面
  await t.goto('https://example.com');
  
  // 切换页面
  await t.switchToPage('登录页', {
    waitForSelector: '#login-form'
  });
  
  // 执行操作
  await t.fill('#username', 'testuser');
  await t.fill('#password', 'password');
  await t.click('#login-btn');
  
  // 断言
  await t.assert.toBeVisible('#dashboard');
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行指定测试
npm test -- tests/example.test.js

# 调试模式
npm run test:debug
```

---

## 📊 性能监控

自动采集页面性能数据，包括：

- **Web Vitals**: LCP, FCP, CLS, INP, TTFB
- **资源加载**: JS、CSS、图片、字体等
- **内存使用**: JS Heap 大小
- **DOM 分析**: 节点数量、嵌套深度
- **长任务监控**: 超过 50ms 的任务
- **SPA 页面切换**: 路由切换性能

### 配置阈值

在 `performance.config.js` 中配置性能阈值：

```javascript
export const performanceConfig = {
  thresholds: {
    webVitals: {
      lcp: { warning: 2500, critical: 4000 },
      fcp: { warning: 1800, critical: 3000 },
      cls: { warning: 0.1, critical: 0.25 },
      // ...
    }
  }
};
```

---

## 🌐 网络监控

### API 请求捕获

自动捕获所有 API 请求，并分析错误：

- HTTP 错误（4xx, 5xx）
- 业务错误（code !== 0）
- 网络错误（超时、连接失败）

### 获取 API 数据

```javascript
// 获取所有 API 请求
const requests = t.getNetworkRequests();

// 获取 API 错误
const errors = t.getApiErrors();

// 过滤特定 API
t.setNetworkFilter(/api\/user/);
```

---

## 💥 控制台错误监控

自动监控页面控制台错误，并智能截图。

### 核心功能

- ✅ 只监控错误（error），不监控警告（warning）
- ✅ 自动去重：相同错误只截图一次
- ✅ 跨页面去重：整个测试过程中保持
- ✅ 智能截图：大规模报错时每 N 个错误截一张图
- ✅ 错误过滤：支持正则表达式和字符串匹配

### 配置

在 `config.js` 中配置：

```javascript
export default {
  consoleError: {
    enabled: true,                              // 启用监控
    screenshotDir: './reports/console-errors',  // 截图目录
    errorTypes: ['error'],                      // 只监控错误
    deduplicateErrors: true,                    // 启用去重
    massErrorThreshold: 10,                     // 大规模报错阈值
    massErrorScreenshotInterval: 10,            // 每 N 个错误截一张图
    ignorePatterns: [                           // 忽略的错误
      /favicon\.ico/,
    ]
  }
}
```

### 错误去重机制

基于以下信息生成错误指纹：
- 错误消息
- 文件路径（最后两级）
- 行号

**示例：**
```
页面 A:
  🔴 [1] ERROR: Uncaught TypeError at app.js:123
     📸 截图: console-error-error-1-xxx.png

页面 B:
  🔴 [2] ERROR: Uncaught TypeError at app.js:123 (重复)
     ⏭️ 已跳过截图（重复错误）
```

### 使用 API

```javascript
// 获取所有控制台错误
const errors = t.getConsoleErrors();

// 获取错误统计
const stats = t.getConsoleErrorStats();
// 输出: { total: 5, byType: { error: 3 } }

// 获取页面级错误
const pageRecords = t.getPageRecords();
pageRecords.forEach(page => {
  console.log(page.name, page.consoleErrors);
});
```

---

## 📸 截图功能

### 自动截图

- 页面切换时自动截图
- 控制台错误时自动截图
- 测试失败时自动截图

### 手动截图

```javascript
await t.captureScreenshot('custom-screenshot');
```

### 截图策略

**正常情况（< 10 个错误）：**
- 每个错误都截图

**大规模报错（≥ 10 个错误）：**
- 每 10 个错误截一张图

---

## 📈 HTML 报告

### 报告内容

- 测试概览（通过率、失败数、耗时）
- 页面性能数据（Web Vitals、资源加载）
- API 请求列表（包括错误详情）
- 控制台错误列表（包括截图）
- 性能问题分析（自动识别瓶颈）
- 截图展示

### 子用例分组

支持按大类自动分组显示子用例：

```
新版返佣 (3)
  ├─ 新版返佣 - 进入团队详情
  ├─ 新版返佣 - 查看返佣数据
  └─ 新版返佣 - 返回首页

活动资讯 (2)
  ├─ 活动资讯 - 查看活动列表
  └─ 活动资讯 - 查看活动详情
```

### 查看报告

```bash
open reports/test-report-2026-02-11T08-41-18-662Z.html
```

---

## 🎯 多设备支持

### 配置设备

在 `config.js` 中配置设备：

```javascript
export default {
  devices: {
    iphone14: {
      name: 'iPhone 14',
      viewport: { width: 390, height: 844 },
      userAgent: '...',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },
    // 更多设备...
  }
}
```

### 使用设备

```javascript
// 切换到 iPhone 14
await t.setDevice('iphone14');

// 执行测试...
```

---

## 🔧 配置说明

### 主配置文件 (config.js)

```javascript
export default {
  // 调试模式
  debug: true,
  debugPauseTime: 0,

  // 浏览器配置
  browser: {
    headless: false,
    slowMo: 0,
  },

  // 超时配置
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
  performance: performanceConfig.monitoring,
  thresholds: { /* 性能阈值 */ },

  // 网络监控配置
  network: {
    enabled: true,
    captureBody: true,
    maxBodySize: 100000,
  },

  // 控制台错误监控配置
  consoleError: {
    enabled: true,
    errorTypes: ['error'],
    deduplicateErrors: true,
    massErrorThreshold: 10,
    massErrorScreenshotInterval: 10,
    ignorePatterns: [/favicon\.ico/],
  },

  // 设备配置
  devices: { /* 设备列表 */ },

  // 重试配置
  retry: {
    count: 0,
    delay: 1000
  }
};
```

### 性能配置文件 (performance.config.js)

详细的性能监控和阈值配置。

---

## 📝 高级用法

### 页面切换

```javascript
// 基本切换
await t.switchToPage('详情页', {
  waitForSelector: '#detail',
  waitTime: 2000
});

// 点击并切换
await t.clickAndSwitchTo('详情页', async () => {
  await page.click('#detail-btn');
}, {
  waitForSelector: '#detail'
});
```

### 步骤记录

```javascript
await t.step('登录', async () => {
  await t.fill('#username', 'testuser');
  await t.fill('#password', 'password');
  await t.click('#login-btn');
});
```

### 子用例自动返回

使用 `TestModle` 时，子用例执行完成后会自动返回父用例界面。详见 [SUBCASE_AUTO_RETURN.md](./SUBCASE_AUTO_RETURN.md)。

```javascript
// 注册父用例
runner.registerTab('新版返佣', {
  selector: '#promotion',
  waitForSelector: 'text=My Rewards',  // 父界面特征元素
  switchPage: true
});

// 注册子用例（执行完自动返回）
runner.registerCase('新版返佣', '检查团队详情', async (page, auth, test) => {
  // 执行测试逻辑
  // ✅ 执行完成后自动返回到"新版返佣"界面
});
```

### 断言

```javascript
// 元素可见性
await t.assert.toBeVisible('#element');

// 文本内容
await t.assert.toHaveText('#element', 'Expected Text');

// URL 检查
await t.assert.toHaveURL(/dashboard/);
```

### 性能数据采集

```javascript
// 采集当前页面性能
const perfData = await t.collectPerformance();

// 获取所有页面记录
const pageRecords = t.getPageRecords();
```

---

## 🧩 项目结构

```
.
├── config.js                    # 主配置文件
├── performance.config.js        # 性能配置文件
├── src/
│   ├── core/                    # 核心模块
│   │   ├── TestCase.js          # 测试用例基类
│   │   ├── TestModle.js         # 测试模型（子用例支持）
│   │   ├── TestRunner.js        # 测试运行器
│   │   └── Assertions.js        # 断言库
│   ├── monitor/                 # 监控模块
│   │   ├── PerformanceMonitor.js    # 性能监控
│   │   ├── NetworkMonitor.js        # 网络监控
│   │   ├── ConsoleErrorMonitor.js   # 控制台错误监控
│   │   └── ThresholdChecker.js      # 阈值检查
│   ├── reporter/                # 报告生成
│   │   ├── HTMLReporter.js      # HTML 报告生成器
│   │   └── PageLoadReporter.js  # 页面加载报告
│   └── utils/                   # 工具类
│       ├── PageManager.js       # 页面管理器
│       ├── ApiAnalyzer.js       # API 分析器
│       ├── PerformanceAnalyzer.js   # 性能分析器
│       └── helpers.js           # 辅助函数
├── tests/                       # 测试用例
│   ├── example.test.js
│   └── runAll.test.js
├── scenarios/                   # 测试场景
│   ├── earn/                    # 返佣场景
│   └── promo/                   # 活动场景
└── reports/                     # 测试报告
    ├── screenshots/             # 截图
    ├── console-errors/          # 控制台错误截图
    └── test-report-xxx.html     # HTML 报告
```

---

## 🔍 故障排查

### 控制台错误没有被捕获

**检查：**
1. `consoleError.enabled` 是否为 `true`
2. `errorTypes` 是否包含该错误类型
3. 是否被 `ignorePatterns` 过滤

### 截图失败

**检查：**
1. 截图目录是否存在且有写入权限
2. 磁盘空间是否充足
3. 查看控制台的警告信息

### 性能数据不准确

**检查：**
1. 是否在页面加载完成后采集
2. 是否有足够的等待时间
3. 网络环境是否稳定

### 子用例分组显示错误

**检查：**
1. `parentTab` 和 `parentCase` 是否正确设置
2. 是否使用了 `TestModle` 的子用例功能

---

## 📚 API 参考

### TestCase

```javascript
// 页面操作
await t.goto(url, options)
await t.click(selector, options)
await t.fill(selector, value, options)
await t.waitForTimeout(ms)

// 页面切换
await t.switchToPage(pageName, options)
await t.clickAndSwitchTo(pageName, action, options)

// 截图
await t.captureScreenshot(name)

// 性能采集
await t.collectPerformance()

// 数据获取
t.getPageRecords()
t.getNetworkRequests()
t.getApiErrors()
t.getConsoleErrors()
t.getConsoleErrorStats()
t.getThresholdViolations()

// 断言
await t.assert.toBeVisible(selector)
await t.assert.toHaveText(selector, text)
await t.assert.toHaveURL(pattern)
```

### ConsoleErrorMonitor

```javascript
// 获取错误
t.consoleErrorMonitor.getErrors()
t.consoleErrorMonitor.getStats()

// 生成报告
t.consoleErrorMonitor.generateReport()

// 清空/重置
t.consoleErrorMonitor.clear()    // 清空错误记录（保留指纹）
t.consoleErrorMonitor.reset()    // 完全重置（包括指纹）
```

---

## 🎓 最佳实践

### 1. 合理使用页面切换

```javascript
// ✅ 推荐：使用 switchToPage
await t.switchToPage('详情页', {
  waitForSelector: '#detail'
});

// ❌ 不推荐：手动管理页面状态
await page.click('#detail-btn');
await page.waitForSelector('#detail');
```

### 2. 使用步骤记录

```javascript
// ✅ 推荐：使用 step 记录关键步骤
await t.step('登录', async () => {
  await t.fill('#username', 'testuser');
  await t.click('#login-btn');
});

// ❌ 不推荐：没有步骤记录
await t.fill('#username', 'testuser');
await t.click('#login-btn');
```

### 3. 配置错误过滤

```javascript
// ✅ 推荐：过滤无关错误
consoleError: {
  ignorePatterns: [
    /favicon\.ico/,
    /Google Analytics/,
  ]
}
```

### 4. 合理设置阈值

```javascript
// ✅ 推荐：根据实际情况设置阈值
thresholds: {
  lcp: { warning: 2500, critical: 4000 },
  fcp: { warning: 1800, critical: 3000 },
}
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT

---

## 📞 联系方式

如有问题，请提交 Issue。
