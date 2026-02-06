import { getSmss } from '../src/api/smss.test.js';
import { dataConfig } from '../config.js';
import { NetworkMonitor } from '../src/monitor/NetworkMonitor.js';

/**
 * AR777搜索测试 - 包含交互操作以触发 FID/INP
 */
export default async function (t) {

  t.test('AR777首页 - 首次加载性能', async () => {
    await t.goto(dataConfig.url);
    await t.step('验证页面加载', async () => {
      await t.assert.textContains('#home', 'Home', '首页底部栏未发现 Home 文字');
    });
    // 新增：处理可能出现的ClaimMyBonus弹窗
    await t.step('检查并处理弹窗', async () => {
      try {
        // 检查Claim My Bonus弹窗是否存在
        const ttPopup = await t.page.locator('text=Claim My Bonus').first();
        const isVisible = await ttPopup.isVisible();

        if (isVisible) {
          await t.click('text=Claim My Bonus');
        }
      } catch (e) {
        // 如果没有找到tt弹窗或出现其他错误，继续执行后续操作
        console.log('未检测到Claim My Bonus弹窗，继续执行测试');
      }
    });

    // 执行交互操作来触发 FID/INP
    await t.step('触发用户交互 (点击登录按钮)', async () => {
      try {
        // 使用class选择器定位登录按钮
        await t.page.locator('.signin-btn.login').click({ timeout: 10000 });

      } catch (e) {
        // 如果通过class定位失败，尝试通过文本和class组合定位
        console.log('尝试备用定位方式');
        await t.page.locator('.signin-btn:has-text("Login")').click({ timeout: 10000 });
      }
    })



    // 进入了登录页面进行登录
    await t.step('登录页面 - 验证页面加载', async () => {
      // 创建NetworkMonitor实例并配置
      const networkMonitor = new NetworkMonitor(t.page, {
        captureBody: true,  // 是否捕获响应体
        maxBodySize: 1024 * 1024,  // 最大响应体大小（字节）
        urlFilter: [
          /^https:\/\/arplatsaassit4\.club\/api\/.*/i  // 只监听指定域名的API请求
        ]
      });
      // 启动网络监控
      await networkMonitor.start();
      // 监听'request'事件，获取请求和响应数据
      networkMonitor.on('request', (requestData) => {
        // 添加URL过滤判断，只处理匹配目标域名的请求
        if (!/^https:\/\/arplatsaassit4\.club\/api\/.*/i.test(requestData.url)) {
          return; // 跳过不符合URL过滤条件的请求
        }

        // console.log('请求URL:', requestData.url);
        // console.log('请求方法:', requestData.method);
        // console.log('请求状态:', requestData.status);
        // console.log('请求持续时间:', requestData.duration, 'ms');
        // console.log('请求大小:', requestData.size, 'bytes');

        if (requestData.response) {
          if (requestData.response.status >= 300 && requestData.response.status < 400) {
            console.log(`[-]${requestData.response.status}重定向到:${requestData.response.url}`);
          } else if (requestData.response.status >= 400 && requestData.response.status < 500) {
            console.log(`[-]客户端错误/身份认证失败:${requestData.response.status},url->${requestData.url}`);
          } else if (requestData.response.status >= 500) {
            console.log(`[-]服务器错误:${requestData.response.status},url->${requestData.url}`);
          } else if (200 <= requestData.response.status < 300) {
            // 检查响应体是否存在
            if (requestData.responseBody) {
              // 进行响应体的处理
              if (requestData.responseBody.code != 0) {
                console.log(`[-]API响应失败,code:${requestData.responseBody.code},msg:${requestData.responseBody.msg},url->${requestData.url}`);
              } else if (requestData.responseBody.msg != 'Success' && requestData.responseBody.msg != 'Succeed') {
                console.log(`[-]API响应消息异常,msg:${requestData.responseBody.msg},url->${requestData.url}`);
              }
            } else {
              // 响应体不存在，但不是图片类型，记录警告
              if (requestData.response.mimeType !== 'image/webp' && requestData.response.mimeType !== 'image/png') {
                console.log(`[-]API响应消息没有响应体,url->${requestData.url}`);
              }
            }
          }
          console.log('响应类型:', requestData.response.mimeType);
        }
        // 在这里可以添加自定义的处理逻辑
        // 例如：保存到数据库、写入文件、发送到分析服务等
      });

      await t.assert.textEquals('[data-testid="login-tab-mobile"]', 'Phone number', '登录页手机号 Tab 文字不正确');

      // 判断当前页面有没有OPT登录
      const optLogin = await t.page.locator('[data-testid="login-switch-otp"]').isVisible();
      if (optLogin) {
        // 点击，进入opt登录界面
        await t.page.getByTestId('login-switch-otp').click();
        await t.waitForTimeout(2000);
        // 进行页面断言
        await t.assert.textEquals('[data-testid="login-send-code-btn"]', 'Send', '没有发现 Send 文字');
        const areaCode = await t.page.getByTestId('phone-area-code').textContent();
        const areacodeStr = '+' + dataConfig.areaCodeData;
        if (areaCode !== areacodeStr) {
          console.log('区号不对，还没有进行处理')
        } else {
          // --- 输入流程 ---
          await t.page.locator('[data-testid="form-input-userName"]').fill(dataConfig.userName);
          await t.page.locator('[data-testid="login-send-code-btn"]').click();
          await t.page.getByTestId('form-input-verifyCode').click();
          await t.waitForTimeout(1000);
          const smss = dataConfig.areaCodeData + dataConfig.userName
          let result = ''
          result = await getSmss(smss)
          if (result == '') {
            for (let i = 0; i < 3; i++) {
              console.log(`正在第${i + 1}次收集短信验证码...`)
              await t.waitForTimeout(1000);
              result = await getSmss(smss)
              if (result != '') {
                break;
              }
            }
          }
          await t.page.getByTestId('form-input-verifyCode').fill(result);
          await t.page.getByTestId('login-submit-btn').click();
        }
      }
      // 点击登录
      await t.page.locator('[data-testid="login-submit-btn"]').click();
    });
    // 等待一下让指标更新
    await t.waitForTimeout(5000);
    // 再次采集性能，此时应该有 FID 和 INP 数据
    await t.collectPerformance();
    await t.page.pause();
  });
}
