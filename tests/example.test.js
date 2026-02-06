/**
 * 示例测试用例 - 展示各种断言和操作
 */
export default async function(t) {

  // 故意失败的测试用例（演示错误截图）
  t.test('故意失败的测试 - 演示错误截图', async () => {
    await t.goto('https://www.baidu.com');
    
    await t.step('这一步会通过', async () => {
      await t.assert.visible('#kw');
    });
    
    await t.step('这一步会失败', async () => {
      // 故意查找不存在的元素
      await t.assert.visible('#not-exist-element', '这个元素不存在');
    });
  });

  // 演示各种断言
  t.test('断言功能演示', async () => {
    await t.goto('https://www.baidu.com');
    
    await t.step('基础断言', async () => {
      t.assert.equal(1 + 1, 2, '1+1应该等于2');
      t.assert.ok(true, '值应该为真');
      t.assert.includes([1, 2, 3], 2, '数组应该包含2');
    });
    
    await t.step('页面断言', async () => {
      await t.assert.urlContains('baidu.com');
      await t.assert.titleContains('百度');
    });
    
    await t.step('元素断言', async () => {
      await t.assert.visible('#kw');
      await t.assert.enabled('#kw');
      await t.assert.exists('#su');
    });
  });

  // 演示网络请求监控
  t.test('网络请求监控演示', async () => {
    // 清空之前的请求
    t.clearNetworkRequests();
    
    await t.goto('https://www.baidu.com');
    
    await t.step('查看网络请求', async () => {
      const requests = t.getNetworkRequests();
      console.log('      📡 共捕获 ' + requests.length + ' 个网络请求');
      
      // 检查是否有请求
      t.assert.ok(requests.length > 0, '应该有网络请求');
    });
  });

}
