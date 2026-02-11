# 子用例自动返回功能说明

## 📋 功能概述

子用例执行完成后，会自动返回到父用例界面，无需手动处理返回逻辑。

## 🎯 工作原理

### 1. 自动返回流程

```
子用例执行 → 执行完成 → 自动返回父用例界面 → 准备执行下一个子用例
```

### 2. 返回策略

系统会按以下顺序尝试返回：

#### 方法1：点击返回按钮（最多5次）
- 查找并点击左上角返回按钮
- 支持多种返回按钮选择器：
  - `.back-btn`
  - `.nav-back`
  - `[data-testid="back"]`
  - `.header-back`
  - `.van-nav-bar__left`
  - 等等...
- 如果找不到选择器，点击左上角坐标 (30, 30)

#### 方法2：验证是否回到父界面
- 每次点击返回后，检查父用例的特征元素
- 如果检测到父用例界面，停止返回

#### 方法3：强制导航（兜底方案）
- 如果返回按钮方式失败
- 直接通过点击父用例的 Tab 强制导航

## 💡 使用示例

### 基本用例

```javascript
// 注册父用例（新版返佣）
runner.registerTab('新版返佣', {
    selector: '#promotion',
    waitForSelector: 'text=My Rewards',  // 🔥 重要：父界面的特征元素
    switchPage: true
});

// 注册子用例1
runner.registerCase('新版返佣', '检查团队详情', async (page, auth, test) => {
    await clickDetailInCarousel(page);
    await test.switchToPage('进入团队详情', {
        waitForSelector: 'text=Subordinate Data',
        waitTime: 1000,
        collectPreviousPage: true
    });
    // ... 执行测试逻辑
    // ✅ 执行完成后自动返回到"新版返佣"界面
});

// 注册子用例2
runner.registerCase('新版返佣', '检查邀请界面', async (page, auth, test) => {
    await earnInviteLink(page, test);
    // ✅ 执行完成后自动返回到"新版返佣"界面
});
```

### 多层嵌套场景

如果子用例进入了多层页面：

```javascript
runner.registerCase('新版返佣', '深层测试', async (page, auth, test) => {
    // 第1层：进入详情页
    await page.click('.detail-btn');
    await test.switchToPage('详情页', { waitForSelector: '.detail-content' });
    
    // 第2层：进入子详情页
    await page.click('.sub-detail-btn');
    await test.switchToPage('子详情页', { waitForSelector: '.sub-detail-content' });
    
    // 第3层：进入更深层页面
    await page.click('.deep-btn');
    await test.switchToPage('深层页面', { waitForSelector: '.deep-content' });
    
    // ✅ 执行完成后会自动点击多次返回，直到回到"新版返佣"界面
});
```

## 🔧 配置要点

### 1. 父用例必须配置 `waitForSelector`

```javascript
runner.registerTab('新版返佣', {
    selector: '#promotion',
    waitForSelector: 'text=My Rewards',  // ✅ 必须配置，用于验证是否回到父界面
    switchPage: true
});
```

### 2. 子用例无需额外配置

```javascript
// ✅ 正确：自动返回
runner.registerCase('新版返佣', '测试用例', async (page, auth, test) => {
    // 执行测试逻辑
});

// ❌ 错误：不要手动返回
runner.registerCase('新版返佣', '测试用例', async (page, auth, test) => {
    // 执行测试逻辑
    await page.goBack();  // ❌ 不需要，会自动返回
});
```

## 📊 执行日志示例

```
[1/3] 🔘 检查团队详情
      🔄 页面切换: → 进入团队详情
      ✓ 已进入: 进入团队详情
      ✅ 通过 (1234ms)
      🔙 返回父用例: 新版返佣
      🔙 第1次尝试返回...
      ← 点击返回按钮: .van-nav-bar__left
      ✓ 成功返回父用例界面

[2/3] 🔘 检查邀请界面
      🔄 页面切换: → 进入新版返佣的邀请界面
      ✓ 已进入: 进入新版返佣的邀请界面
      ✅ 通过 (2345ms)
      🔙 返回父用例: 新版返佣
      🔙 第1次尝试返回...
      ← 点击返回按钮: .back-btn
      ✓ 成功返回父用例界面
```

## ⚠️ 注意事项

### 1. 返回失败的情况

如果返回按钮方式失败（最多尝试5次），系统会：
- 使用强制导航（点击父用例 Tab）
- 确保能回到父用例界面

### 2. 失败重试

如果子用例执行失败需要重试：
- 会先尝试返回父用例界面
- 然后再重新执行子用例
- 确保每次重试都从父用例界面开始

### 3. 性能考虑

- 每次返回最多尝试5次
- 每次尝试间隔1秒
- 如果父界面特征元素已可见，立即停止返回

## 🎨 自定义返回逻辑

如果需要自定义返回逻辑，可以在子用例中手动处理：

```javascript
runner.registerCase('新版返佣', '自定义返回', async (page, auth, test) => {
    // 执行测试逻辑
    
    // 自定义返回逻辑
    await page.click('.custom-back-btn');
    await page.waitForTimeout(1000);
    
    // 注意：如果手动返回了，自动返回会检测到已在父界面，不会重复返回
});
```

## 🔍 调试技巧

### 查看返回日志

```
🔙 返回父用例: 新版返佣
🔙 第1次尝试返回...
← 点击返回按钮: .van-nav-bar__left
✓ 成功返回父用例界面
```

### 返回失败时

```
🔙 第1次尝试返回...
← 未找到返回按钮选择器，尝试点击左上角坐标
🔙 第2次尝试返回...
⚠️ 返回按钮方式失败，使用强制导航
✓ 强制导航成功
```

## 📝 最佳实践

1. **始终配置父用例的 `waitForSelector`**
   ```javascript
   waitForSelector: 'text=My Rewards'  // 父界面的唯一特征
   ```

2. **子用例专注于测试逻辑**
   - 不要手动处理返回
   - 让系统自动处理导航

3. **合理设置重试次数**
   ```javascript
   runner.runSequential({
       defaultRetries: 3  // 失败后会自动返回并重试
   });
   ```

4. **使用清晰的日志**
   - 观察返回过程
   - 及时发现问题

## 🚀 优势

1. **简化代码**：子用例无需关心返回逻辑
2. **提高可靠性**：多种返回策略确保成功
3. **支持深层嵌套**：自动处理多层返回
4. **失败恢复**：重试前自动返回父界面
5. **灵活性**：支持自定义返回逻辑
