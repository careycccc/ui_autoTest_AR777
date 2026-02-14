import { performanceConfig } from './performance.config.js';

export default {
  // 调试模式（设为 true 时测试完成后不关闭浏览器）
  debug: true,
  // 调试时暂停时间（毫秒，设为 0 则无限等待）
  debugPauseTime: 0,

  // 浏览器配置
  browser: {
    headless: false,
    slowMo: 0,
    args: [
      '--disable-gpu-sandbox',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  },

  timeout: {
    test: 60000,
    navigation: 30000,
    action: 10000
  },

  report: {
    outputDir: './reports',
    screenshots: true,
    video: false
  },

  // 🔥 性能配置（从 performance.config.js 导入）
  performance: performanceConfig.monitoring,
  thresholds: {
    // 将嵌套的阈值配置展平
    ...performanceConfig.thresholds.webVitals,
    ...performanceConfig.thresholds.resources,
    ...performanceConfig.thresholds.rendering,
    ...performanceConfig.thresholds.cpu,
    ...performanceConfig.thresholds.network
  },
  screenshot: performanceConfig.screenshot,
  network: performanceConfig.network,

  // 控制台错误监控配置
  consoleError: {
    enabled: true,
    screenshotDir: './reports/console-errors',
    screenshotPrefix: 'console-error',
    massErrorThreshold: 10,
    massErrorScreenshotInterval: 10,
    errorTypes: ['error'],  // 只监控错误，不监控警告
    deduplicateErrors: true,  // 启用错误去重
    ignorePatterns: [
      /favicon\.ico/,  // 忽略 favicon 相关错误
    ]
  },

  // ============================================================
  // 设备配置 - 优化版（降低 deviceScaleFactor）
  // ============================================================
  devices: {
    // 桌面设备
    desktop: {
      name: 'Desktop Chrome',
      viewport: { width: 1920, height: 1080 },
      userAgent: null,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },

    // ============================================================
    // iPhone 系列 - 优化配置
    // 关键改动：deviceScaleFactor 从 3 降到 1，大幅提升流畅度
    // ============================================================
    iphone14: {
      name: 'iPhone 14',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,  // 从 3 改为 1，大幅提升性能
      isMobile: true,
      hasTouch: false        // 从 true 改为 false，减少开销
    },

    iphone14pro: {
      name: 'iPhone 14 Pro',
      viewport: { width: 393, height: 852 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    iphone14promax: {
      name: 'iPhone 14 Pro Max',
      viewport: { width: 430, height: 932 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    iphone12: {
      name: 'iPhone 12',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    iphoneSE: {
      name: 'iPhone SE',
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    // ============================================================
    // 高保真版本（如果确实需要高分辨率截图）
    // ============================================================
    iphone14_hifi: {
      name: 'iPhone 14 (High Fidelity)',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,  // 2 倍，平衡质量和性能
      isMobile: true,
      hasTouch: true
    },

    // ============================================================
    // Android 系列 - 优化配置
    // ============================================================
    pixel7: {
      name: 'Google Pixel 7',
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    pixel6: {
      name: 'Google Pixel 6',
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    samsungS23: {
      name: 'Samsung Galaxy S23',
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    samsungS22: {
      name: 'Samsung Galaxy S22',
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    xiaomi13: {
      name: 'Xiaomi 13',
      viewport: { width: 393, height: 873 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; 2211133C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    huaweiP60: {
      name: 'Huawei P60',
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; MNA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    // ============================================================
    // 平板设备
    // ============================================================
    ipadPro12: {
      name: 'iPad Pro 12.9',
      viewport: { width: 1024, height: 1366 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    },

    ipadAir: {
      name: 'iPad Air',
      viewport: { width: 820, height: 1180 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: false
    }
  },

  retry: {
    count: 0,
    delay: 1000
  }
};

// dataConfig
export const dataConfig = {
  userName: '2002199799',  // 测试的前台登录账号
  areaCodeData: '91',  // 区号
  url: 'https://arplatsaassit4.club', // 前台地址
  adminUrl: 'https://arsitasdfghjklusa.com',//后台地址
  adminUser: 'carey3004',
  adminPwd: 'qwer1234',
}
