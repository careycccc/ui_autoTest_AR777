# 智能活动识别系统

## 🎯 系统概述

智能活动识别系统是一个全自动的活动验证框架，能够：
- ✅ 自动判断活动是弹窗还是直接跳转
- ✅ 智能匹配活动类型（从配置池中）
- ✅ 自动处理弹窗和页面跳转
- ✅ 自动返回活动列表页
- ✅ 失败时自动截图并继续下一个
- ✅ 详细的日志输出

## 🚀 快速开始

### 最简单的使用方式

```javascript
import { verifyAllActivities } from './scenarios/promo/promo.js';

// 一行代码验证所有活动！
const result = await verifyAllActivities(page, auth, test);

console.log(`成功: ${result.success}, 失败: ${result.fail}`);
```

就这么简单！系统会自动：
1. 获取页面上的所有活动
2. 依次点击每个活动
3. 判断是弹窗还是直接跳转
4. 匹配活动类型
5. 执行处理逻辑
6. 返回活动列表页
7. 继续下一个活动

## 📁 文件结构

```
scenarios/promo/
├── promo.js                      # 核心函数（handleActivityClick, verifyAllActivities）
├── promo-cases.js                # 测试用例注册
├── activity-pool.js              # 活动配置池（16种活动配置）
├── promo-smart-example.js        # 使用示例
└── promo-example-usage.js        # 旧版示例（已废弃）

docs/
├── SMART_ACTIVITY_SYSTEM.md      # 本文档
├── activity-pool-guide.md        # 配置池详细指南
└── handleActivityClick-examples.md  # 旧版文档（已废弃）
```

## 🔧 核心组件

### 1. handleActivityClick (智能版)

自动识别和处理单个活动的核心函数。

```javascript
const result = await handleActivityClick({
    page,
    test,
    index: 0  // 活动索引
});

if (result.success) {
    console.log(`成功: ${result.activityName}`);
    console.log(`类型: ${result.hasPopup ? '弹窗' : '直接跳转'}`);
}
```

**工作流程**:
1. 点击活动
2. 检查 URL 是否变化
3. 如果未变化 → 检测弹窗 → 点击弹窗按钮
4. 在配置池中匹配活动类型
5. 等待目标页面加载
6. 返回活动列表页

### 2. verifyAllActivities

批量验证所有活动的函数。

```javascript
const result = await verifyAllActivities(page, auth, test);

// 返回结果
{
    total: 16,        // 总活动数
    success: 14,      // 成功数
    fail: 2,          // 失败数
    results: [        // 详细结果数组
        {
            index: 0,
            success: true,
            activityName: '每日签到',
            hasPopup: false
        },
        // ...
    ]
}
```

### 3. activity-pool.js (活动配置池)

定义所有可能的活动类型及其识别方式。

```javascript
export const ACTIVITY_POOL = [
    {
        name: '每日签到',
        identifiers: [
            { type: 'url', value: '/daily' },
            { type: 'text', value: 'Daily deposit rewards' },
            { type: 'selector', value: '.daily-signin' }
        ],
        hasPopup: false,
        targetPageConfig: {
            name: '每日签到页',
            waitForSelector: '.daily-signin',
            waitTime: 1000
        }
    },
    // ... 更多活动配置
];
```

## 📋 活动配置池

当前支持 16 种活动类型：

1. 每日签到
2. 充值活动
3. VIP 特权
4. 邀请好友
5. 转盘抽奖
6. 救援金
7. 优惠券
8. 返水活动
9. 任务中心
10. 锦标赛
11. 超级大奖
12. 周卡月卡
13. 站内信
14. 充值转盘
15. 新版返佣
16. 提现活动

## 🎨 识别方式

系统支持 4 种识别方式：

### 1. URL 识别 (最准确)
```javascript
{ type: 'url', value: '/daily' }
```

### 2. 文本识别
```javascript
{ type: 'text', value: 'Daily Rewards' }
```

### 3. 选择器识别
```javascript
{ type: 'selector', value: '.daily-signin' }
```

### 4. 图片识别
```javascript
{ type: 'image', value: 'daily-icon.png' }
```

每个活动可以有多个识别器，系统会依次尝试，只要有一个匹配即可。

## 📊 日志输出示例

```
🔍 开始验证各个活动资讯活动...
📚 活动配置池: 共 16 种活动类型
📋 活动列表: 每日签到, 充值活动, VIP特权, ...
📊 页面显示 19 个活动需要验证

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 验证活动 1/19
🎯 处理活动 #0...
📍 点击前 URL: https://example.com/activity
👆 点击活动 #0...
📍 点击后 URL: https://example.com/daily
📊 URL 是否变化: 是（直接跳转）
✅ 检测到直接跳转
🔍 开始匹配活动...
📍 当前 URL: https://example.com/daily
✅ 通过 URL "/daily" 匹配到活动: 每日签到
✅ 匹配到活动: 每日签到
📋 活动类型: 直接跳转类型
⏳ 等待目标页面加载...
✅ 找到目标元素: .daily-signin
↩️ 返回 活动资讯页...
📍 返回后 URL: https://example.com/activity
✅ 已返回 活动资讯页
✅ 活动 #0 验证成功: 每日签到
📊 类型: 直接跳转类型

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 验证活动 2/19
🎯 处理活动 #1...
📍 点击前 URL: https://example.com/activity
👆 点击活动 #1...
📍 点击后 URL: https://example.com/activity
📊 URL 是否变化: 否（可能是弹窗）
🔍 检查是否有弹窗...
✅ 检测到弹窗: .popup-container
👆 点击弹窗中的按钮...
✅ 点击了按钮: .confirm-btn
📍 点击弹窗按钮后 URL: https://example.com/recharge
🔍 开始匹配活动...
✅ 通过 URL "/recharge" 匹配到活动: 充值活动
✅ 匹配到活动: 充值活动
📋 活动类型: 弹窗类型
...
```

## 🔍 如何添加新活动

### 步骤 1: 点击活动，查看跳转到哪里

手动点击活动，观察：
- URL 变化
- 页面上的文本
- 页面的特征元素

### 步骤 2: 在 activity-pool.js 中添加配置

```javascript
{
    name: '新活动名称',
    identifiers: [
        { type: 'url', value: '/new-activity' },      // 必需：URL 识别
        { type: 'text', value: 'New Activity' },      // 可选：文本识别
        { type: 'selector', value: '.new-activity' }  // 可选：选择器识别
    ],
    hasPopup: false,  // 是否有弹窗（仅供参考，系统会自动检测）
    targetPageConfig: {
        name: '新活动页',
        waitForSelector: '.new-activity-content',
        waitTime: 1000
    }
}
```

### 步骤 3: 运行测试

```bash
npm test
```

查看日志，确认是否匹配成功。

## 🐛 调试技巧

### 1. 查看匹配日志

日志会显示：
- 当前 URL
- 尝试的识别器
- 是否匹配成功

### 2. 查看截图

失败时会自动截图：
- `activity-0-no-match.png` - 未匹配到活动
- `activity-0-error.png` - 处理出错

### 3. 临时添加日志

在 `activity-pool.js` 中添加调试日志：

```javascript
console.log(`尝试匹配: ${activity.name}`);
console.log(`当前 URL: ${currentUrl}`);
```

## ⚠️ 常见问题

### Q1: 活动未匹配到？

**原因**: 配置池中没有对应的活动配置

**解决**: 
1. 查看截图，确认跳转到了哪个页面
2. 在 activity-pool.js 中添加该活动的配置

### Q2: 弹窗处理失败？

**原因**: 弹窗按钮选择器不正确

**解决**: 
系统会自动尝试多个常见的按钮选择器：
- `.popup-confirm`
- `.confirm-btn`
- `.modal-confirm`
- `button`

如果都失败，检查弹窗的 HTML 结构。

### Q3: 返回失败？

**原因**: 返回页面的选择器不正确

**解决**: 
默认等待 `.activeList` 元素，如果不对，可以自定义：

```javascript
await handleActivityClick({
    page,
    test,
    index: 0,
    returnWaitForSelector: '.custom-selector'
});
```

## 📈 性能优化

### 1. 合理的等待时间

```javascript
targetPageConfig: {
    waitTime: 1000  // 简单页面
    // waitTime: 2000  // 复杂页面
}
```

### 2. 精确的选择器

使用更精确的选择器可以减少等待时间：

```javascript
waitForSelector: '.daily-signin'  // 好
// waitForSelector: 'div'  // 不好，太宽泛
```

### 3. 跳过不需要的活动

```javascript
// 在 verifyAllActivities 中添加跳过逻辑
if (i === 2 || i === 4) {
    console.log(`跳过活动 #${i}`);
    continue;
}
```

## 🎉 优势总结

### 旧版 vs 新版

| 特性 | 旧版 | 新版 |
|------|------|------|
| 配置方式 | 每个活动手动配置 | 配置池自动匹配 |
| 弹窗检测 | 手动指定 | 自动检测 |
| 活动识别 | 手动配置选择器 | 多种方式自动识别 |
| 错误处理 | 中断测试 | 截图并继续 |
| 日志输出 | 简单 | 详细 |
| 维护成本 | 高 | 低 |

### 新版优势

1. **零配置使用**: 只需调用 `verifyAllActivities()`
2. **智能识别**: 自动判断弹窗和活动类型
3. **灵活匹配**: 支持 URL、文本、选择器、图片 4 种识别方式
4. **容错性强**: 失败不中断，自动截图并继续
5. **易于维护**: 只需在配置池中添加新活动
6. **详细日志**: 完整的执行过程记录

## 📚 相关文档

- [activity-pool-guide.md](./activity-pool-guide.md) - 配置池详细指南
- [promo-smart-example.js](../scenarios/promo/promo-smart-example.js) - 使用示例代码

## 🤝 贡献

如果你添加了新的活动配置，请：
1. 在 activity-pool.js 中添加配置
2. 测试验证
3. 更新文档

---

**享受自动化测试的乐趣！** 🎉
