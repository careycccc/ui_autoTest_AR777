# 活动配置池使用指南

## 概述

活动配置池是一个智能识别系统，用于自动识别和处理活动资讯页面中的各种活动类型。

## 工作原理

1. **点击活动** → 自动判断是弹窗还是直接跳转（通过 URL 变化）
2. **智能匹配** → 在活动配置池中匹配当前活动类型
3. **执行处理** → 根据匹配到的配置执行相应的处理逻辑
4. **自动返回** → 处理完成后自动返回活动列表页
5. **错误处理** → 未匹配到活动时截图报错并继续下一个

## 活动配置结构

```javascript
{
    name: '活动名称',                    // 活动的显示名称
    identifiers: [                      // 识别方式数组（支持多种）
        { type: 'url', value: '/daily' },           // 通过 URL 识别
        { type: 'text', value: 'Daily Rewards' },   // 通过页面文本识别
        { type: 'selector', value: '.daily-page' }, // 通过 CSS 选择器识别
        { type: 'image', value: 'daily-icon.png' }  // 通过图片 src 识别
    ],
    hasPopup: false,                    // 是否有弹窗（自动检测，此字段仅供参考）
    targetPageConfig: {                 // 目标页面配置
        name: '每日签到页',
        waitForSelector: '.daily-signin',
        waitTime: 1000
    },
    handler: async (page, test) => {   // 自定义处理函数（可选）
        // 在目标页面执行的额外操作
    }
}
```

## 识别器类型说明

### 1. URL 识别 (type: 'url')

通过页面 URL 包含特定字符串来识别活动。

```javascript
{ type: 'url', value: '/daily' }        // URL 包含 /daily
{ type: 'url', value: '/recharge' }     // URL 包含 /recharge
```

**优点**: 最准确，不受页面内容变化影响  
**缺点**: 需要知道目标页面的 URL 路径

### 2. 文本识别 (type: 'text')

通过页面中是否存在特定文本来识别活动。

```javascript
{ type: 'text', value: 'Daily Rewards' }    // 页面包含 "Daily Rewards" 文本
{ type: 'text', value: 'VIP' }              // 页面包含 "VIP" 文本
```

**优点**: 简单直观，适合有明显标题的页面  
**缺点**: 可能受多语言影响

### 3. 选择器识别 (type: 'selector')

通过页面中是否存在特定 CSS 选择器来识别活动。

```javascript
{ type: 'selector', value: '.daily-signin' }    // 页面有 .daily-signin 元素
{ type: 'selector', value: '#vip-level' }       // 页面有 #vip-level 元素
```

**优点**: 精确，适合有独特元素的页面  
**缺点**: 需要了解页面结构

### 4. 图片识别 (type: 'image')

通过页面中是否存在包含特定 src 的图片来识别活动。

```javascript
{ type: 'image', value: 'daily-icon.png' }      // 图片 src 包含 daily-icon.png
{ type: 'image', value: '/banner/vip' }         // 图片 src 包含 /banner/vip
```

**优点**: 适合有独特图标的页面  
**缺点**: 图片路径可能变化

## 如何添加新活动

### 步骤 1: 确定活动信息

首先，你需要确定以下信息：
- 活动名称
- 如何识别这个活动（URL、文本、选择器等）
- 是否有弹窗
- 目标页面的特征元素

### 步骤 2: 编写配置

在 `scenarios/promo/activity-pool.js` 的 `ACTIVITY_POOL` 数组中添加新配置：

```javascript
// 示例：添加"签到活动"
{
    name: '签到活动',
    identifiers: [
        { type: 'url', value: '/signin' },              // 优先使用 URL
        { type: 'text', value: 'Sign In' },             // 备用：文本识别
        { type: 'selector', value: '.signin-page' }     // 备用：选择器识别
    ],
    hasPopup: false,  // 无弹窗
    targetPageConfig: {
        name: '签到页',
        waitForSelector: '.signin-calendar',  // 等待签到日历出现
        waitTime: 1000
    }
}
```

### 步骤 3: 测试验证

运行测试，查看日志输出：
```bash
npm test
```

查看日志中的匹配信息：
```
✅ 通过 URL "/signin" 匹配到活动: 签到活动
```

## 实际案例

### 案例 1: 简单的直接跳转活动

```javascript
{
    name: '每日签到',
    identifiers: [
        { type: 'url', value: '/daily' },
        { type: 'text', value: 'Daily deposit rewards' }
    ],
    hasPopup: false,
    targetPageConfig: {
        name: '每日签到页',
        waitForSelector: '.daily-signin',
        waitTime: 1000
    }
}
```

### 案例 2: 有弹窗的活动

```javascript
{
    name: '充值活动',
    identifiers: [
        { type: 'url', value: '/recharge' },
        { type: 'text', value: 'Deposit' }
    ],
    hasPopup: true,  // 有弹窗（系统会自动检测和处理）
    targetPageConfig: {
        name: '充值页',
        waitForSelector: '.recharge-page',
        waitTime: 1000
    }
}
```

### 案例 3: 多种识别方式的活动

```javascript
{
    name: 'VIP特权',
    identifiers: [
        { type: 'url', value: '/vip' },                 // 第一优先级
        { type: 'text', value: 'VIP' },                 // 第二优先级
        { type: 'selector', value: '.vip-level' },      // 第三优先级
        { type: 'image', value: 'vip-icon.png' }        // 第四优先级
    ],
    hasPopup: false,
    targetPageConfig: {
        name: 'VIP页',
        waitForSelector: '.vip-level, .vip-benefits',  // 支持多个选择器
        waitTime: 1000
    }
}
```

### 案例 4: 带自定义处理函数的活动

```javascript
{
    name: '转盘抽奖',
    identifiers: [
        { type: 'url', value: '/turntable' },
        { type: 'selector', value: '.turntable-container' }
    ],
    hasPopup: false,
    targetPageConfig: {
        name: '转盘页',
        waitForSelector: '.turntable-container',
        waitTime: 1500
    },
    handler: async (page, test) => {
        // 在转盘页面执行额外操作
        console.log('      🎰 检查转盘是否可用...');
        
        const spinButton = page.locator('.spin-button');
        const isEnabled = await spinButton.isEnabled().catch(() => false);
        
        if (isEnabled) {
            console.log('      ✅ 转盘可用');
        } else {
            console.log('      ⚠️ 转盘不可用（可能次数已用完）');
        }
    }
}
```

## 调试技巧

### 1. 查看匹配日志

运行测试时，注意查看日志输出：

```
🔍 开始匹配活动...
📍 当前 URL: https://example.com/daily
✅ 通过 URL "/daily" 匹配到活动: 每日签到
```

### 2. 未匹配到活动

如果看到：
```
❌ 活动 #0 未匹配到任何已知活动类型
```

说明需要：
1. 检查目标页面的 URL
2. 查看页面上的文本内容
3. 检查页面的 DOM 结构
4. 添加或修改识别器

### 3. 查看截图

失败时会自动截图，文件名格式：
- `activity-0-no-match.png` - 未匹配到活动
- `activity-0-error.png` - 处理过程出错

### 4. 临时添加调试日志

在 `activity-pool.js` 的 `matchActivity` 函数中添加：

```javascript
console.log(`      🔍 尝试匹配: ${activity.name}`);
console.log(`      📋 识别器: ${JSON.stringify(identifier)}`);
```

## 最佳实践

### 1. 识别器优先级

建议按以下顺序添加识别器：
1. **URL** - 最准确
2. **选择器** - 较准确
3. **文本** - 可能受多语言影响
4. **图片** - 最不稳定

### 2. 多个识别器

为每个活动添加 2-3 个识别器，提高匹配成功率：

```javascript
identifiers: [
    { type: 'url', value: '/daily' },           // 主要识别方式
    { type: 'text', value: 'Daily Rewards' },   // 备用方式 1
    { type: 'selector', value: '.daily-page' }  // 备用方式 2
]
```

### 3. 选择器的灵活性

使用多个选择器，用逗号分隔：

```javascript
waitForSelector: '.daily-signin, .signin-page, .page-content'
```

系统会依次尝试，只要有一个匹配即可。

### 4. 合理的等待时间

根据页面加载速度设置 `waitTime`：
- 简单页面: 1000ms
- 复杂页面: 1500-2000ms
- 需要加载数据的页面: 2000-3000ms

## 常见问题

### Q1: 活动点击后没有反应？

**A**: 检查是否：
1. 活动元素选择器正确（默认 `.activeList .activeItem`）
2. 活动元素可见且可点击
3. 页面加载完成

### Q2: 匹配不到活动？

**A**: 
1. 查看截图，确认跳转到了哪个页面
2. 检查该页面的 URL、文本、选择器
3. 在配置池中添加或修改识别器

### Q3: 弹窗处理失败？

**A**: 系统会自动检测和处理弹窗，如果失败：
1. 查看日志中的弹窗检测信息
2. 检查弹窗按钮的选择器是否正确
3. 可能需要增加等待时间

### Q4: 如何跳过某些活动？

**A**: 在 `verifyAllActivities` 中添加跳过逻辑：

```javascript
// 跳过第 3 和第 5 个活动
if (i === 2 || i === 4) {
    console.log(`      ⏭️ 跳过活动 #${i}`);
    continue;
}
```

## 维护建议

1. **定期更新配置池**: 当网站更新时，及时更新识别器
2. **记录失败原因**: 在日志中记录为什么某个活动匹配失败
3. **保持配置简洁**: 只添加必要的识别器，避免过度复杂
4. **测试覆盖**: 确保每个活动类型都有对应的配置

## 总结

活动配置池系统的优势：
- ✅ 自动识别活动类型
- ✅ 自动判断弹窗/直接跳转
- ✅ 灵活的识别方式
- ✅ 详细的日志输出
- ✅ 自动错误处理
- ✅ 易于维护和扩展

只需要在配置池中添加活动配置，系统就能自动处理所有活动的点击、识别、跳转和返回！
