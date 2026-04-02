# 活动资讯增强版解决方案

## 问题描述

在执行活动资讯验证时，前3个活动（索引0、1、2）成功验证，但从第4个活动（索引3）开始，所有活动都失败，错误信息为：

```
❌ 处理活动 #3 失败: 活动索引 3 超出范围（总共 0 个活动）
```

## 根本原因

在 [`handleActivityClick`](../scenarios/promo/promo.js:40-258) 函数中，返回逻辑存在缺陷：

1. **弹窗活动处理后的返回逻辑不完整**：当活动是弹窗类型（如通知权限开启）时，`matchedActivity.activityId` 存在，导致跳过返回逻辑（第211-235行）
2. **页面状态未恢复**：处理完活动后，页面停留在其他页面，活动列表消失
3. **索引失效**：后续活动索引超出范围，因为活动列表已经不存在

## 解决方案

创建了增强版的活动验证系统，包含以下核心改进：

### 1. 新增文件

#### [`scenarios/promo/promo-enhanced.js`](../scenarios/promo/promo-enhanced.js)
增强版活动验证器，核心功能：

- **`verifyAllActivitiesEnhanced()`**：增强版活动验证函数
  - 每次处理前确保在活动资讯页面
  - 重新获取当前活动列表数量，确保索引有效
  - 每次处理完后强制返回活动资讯页面

- **`ensureOnActivityPage()`**：确保在活动资讯页面
  - 检查当前 URL 和活动列表状态
  - 自动返回或导航到活动资讯页面

- **`forceNavigateToActivityPage()`**：强制导航到活动资讯页面
  - 尝试点击底部菜单的活动按钮
  - 直接导航到活动页面
  - 等待活动列表加载完成

#### [`scenarios/promo/promo-cases-enhanced.js`](../scenarios/promo/promo-cases-enhanced.js)
增强版子用例注册模块，提供新的测试用例：

- **"验证各个活动资讯活动（增强版）"**：使用增强版验证函数

### 2. 修改文件

#### [`scenarios/index.js`](../scenarios/index.js)
- 导入 `registerPromoCasesEnhanced`
- 在 `registerAllCases()` 函数中添加 `useEnhanced` 参数
- 导出 `registerPromoCasesEnhanced` 供外部使用

## 使用方法

### 方法1：使用增强版注册函数（推荐）

```javascript
import { registerPromoCasesEnhanced } from './scenarios/index.js';

// 直接使用增强版注册函数
registerPromoCasesEnhanced(runner);
```

### 方法2：通过 registerAllCases 使用增强版

```javascript
import { registerAllCases } from './scenarios/index.js';

// 使用 useEnhanced 参数启用增强版
registerAllCases(runner, { 
    useEnhanced: true  // 启用增强版活动资讯验证
});
```

### 方法3：单独注册增强版用例

```javascript
import { registerPromoCasesEnhanced } from './scenarios/promo/promo-cases-enhanced.js';

// 只注册活动资讯的增强版用例
registerPromoCasesEnhanced(runner);
```

## 核心改进点

### 1. 页面状态管理
```javascript
// 每次处理前确保在活动资讯页面
await ensureOnActivityPage(page, test);

// 重新获取当前活动列表数量
const currentActivityCount = await page.locator('.activeList .activeItem').count();

// 检查索引是否有效
if (i >= currentActivityCount) {
    console.log(`⚠️ 活动索引 ${i} 超出范围`);
    continue;
}
```

### 2. 强制返回机制
```javascript
// 每次处理完后强制返回活动资讯页面
await ensureOnActivityPage(page, test);

// 异常时强制返回
try {
    await forceNavigateToActivityPage(page, test);
} catch (navError) {
    console.log(`❌ 强制返回活动页失败: ${navError.message}`);
}
```

### 3. 多重返回策略
```javascript
// 策略1: 检查 URL 和活动列表
if (currentUrl.includes('/activity') && activityListVisible) {
    return; // 已在正确页面
}

// 策略2: 浏览器返回
await page.goBack();

// 策略3: 点击底部菜单
await activityMenuButton.click();

// 策略4: 直接导航
await page.goto(`${baseUrl}/activity`);
```

## 预期效果

使用增强版后，所有活动都应该能够成功验证：

```
📊 页面显示 15 个活动需要验证

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 验证活动 1/15
✅ 活动 #0 验证成功: 通知权限开启
📊 类型: 弹窗类型

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 验证活动 2/15
✅ 活动 #1 验证成功: 站内信
📊 类型: 直接跳转类型

...（所有15个活动都能成功验证）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 验证完成统计:
✅ 成功: 15/15
❌ 失败: 0/15
📈 成功率: 100.00%
```

## 兼容性说明

- **向后兼容**：原有的 `verifyAllActivities()` 函数保持不变
- **可选使用**：通过 `useEnhanced` 参数控制是否使用增强版
- **独立模块**：增强版代码在独立文件中，不影响现有逻辑

## 注意事项

1. **性能影响**：增强版会增加一些页面检查和导航操作，可能会略微增加执行时间
2. **网络依赖**：强制导航依赖网络连接，确保网络稳定
3. **页面结构**：假设活动列表选择器为 `.activeList .activeItem`，如果页面结构变化需要调整

## 相关文件

- [`scenarios/promo/promo.js`](../scenarios/promo/promo.js) - 原始活动验证逻辑
- [`scenarios/promo/promo-enhanced.js`](../scenarios/promo/promo-enhanced.js) - 增强版活动验证逻辑
- [`scenarios/promo/promo-cases-enhanced.js`](../scenarios/promo/promo-cases-enhanced.js) - 增强版用例注册
- [`scenarios/index.js`](../scenarios/index.js) - 统一注册入口
