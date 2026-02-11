import { test } from '@playwright/test';
import { TestCase } from '../src/core/TestCase.js';
import config from '../config.js';

test('控制台错误监控演示', async ({ page }) => {
    const t = new TestCase(page, config);

    console.log('\n========================================');
    console.log('🧪 控制台错误监控功能演示');
    console.log('========================================\n');

    // 创建一个测试页面，包含各种错误
    await page.goto('about:blank');

    await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>控制台错误测试页面</title>
    </head>
    <body>
      <h1>控制台错误监控测试</h1>
      <button id="error-btn">触发错误</button>
      <button id="warning-btn">触发警告</button>
      <button id="exception-btn">触发异常</button>
      <button id="mass-error-btn">触发大量错误</button>
      
      <script>
        // 1. 控制台错误
        document.getElementById('error-btn').addEventListener('click', () => {
          console.error('这是一个控制台错误');
        });
        
        // 2. 控制台警告
        document.getElementById('warning-btn').addEventListener('click', () => {
          console.warn('这是一个控制台警告');
        });
        
        // 3. 未捕获的异常
        document.getElementById('exception-btn').addEventListener('click', () => {
          throw new Error('这是一个未捕获的异常');
        });
        
        // 4. 大量错误
        document.getElementById('mass-error-btn').addEventListener('click', () => {
          for (let i = 1; i <= 25; i++) {
            console.error('批量错误 #' + i);
          }
        });
      </script>
    </body>
    </html>
  `);

    await t.switchToPage('测试页面');

    console.log('\n📝 测试场景 1: 单个错误（会截图）');
    await page.click('#error-btn');
    await page.waitForTimeout(500);

    console.log('\n📝 测试场景 2: 单个警告（会截图）');
    await page.click('#warning-btn');
    await page.waitForTimeout(500);

    console.log('\n📝 测试场景 3: 未捕获的异常（会截图）');
    try {
        await page.click('#exception-btn');
    } catch (e) {
        // 忽略异常
    }
    await page.waitForTimeout(500);

    console.log('\n📝 测试场景 4: 大量错误（每10个截一张图）');
    await page.click('#mass-error-btn');
    await page.waitForTimeout(1000);

    // 获取错误统计
    const errors = t.getConsoleErrors();
    const stats = t.getConsoleErrorStats();

    console.log('\n========================================');
    console.log('📊 错误统计报告');
    console.log('========================================');
    console.log(`总错误数: ${stats.total}`);
    console.log(`按类型统计:`, stats.byType);
    console.log(`\n详细错误列表:`);

    errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.type.toUpperCase()}`);
        console.log(`   消息: ${error.message}`);
        console.log(`   时间: ${error.timestamp}`);
        if (error.screenshot) {
            console.log(`   截图: ${error.screenshot}`);
        }
    });

    // 生成完整报告
    const report = t.consoleErrorMonitor.generateReport();
    console.log('\n========================================');
    console.log('📋 完整报告');
    console.log('========================================');
    console.log(JSON.stringify(report.summary, null, 2));

    console.log('\n✅ 测试完成！');
    console.log(`📸 截图保存在: ${config.consoleError.screenshotDir}`);
});
