# 通用活动系统使用指南

## 🎯 系统概述

通用活动系统是一个可以在项目任何地方复用的活动处理框架。无论是从首页弹窗、活动资讯列表、还是其他任何地方进入活动，都使用相同的处理逻辑。

## 🏗️ 架构设计

```
scenarios/activities/
├── activity-handlers.js      # 活动处理器（每个活动的具体逻辑）
├── activity-registry.js       # 活动注册表（统一管理所有活动）
└── activity-executor.js       # 活动执行器（通用执行流程）
```

### 核心概念

1. **活动处理器（Handler）** - 定义每个活动的具体处理逻辑
2. **活动注册表（Registry）** - 统一管理所有活动的配置和识别方式
3. **活动执行器（Executor）** - 提供通用的执行流程，可在任何地方调用

## 🚀 快速开始

### 场景 1: 从活动列表批量执行

```javascript
import { executeBatchActivities } from './scenarios/activities/activity-executor.js';

// 批量执行活动列表中的所有活动
const result = await executeBatchActivities({
    page,
    test,
    listSelector: '.activeList',      // 列表容器选择器
    itemSelector: '.activeItem'       // 活动项选择器
});

console.log(`成功: ${result.success}, 失败: ${result.fail}`);
```

### 场景 2: 从首页弹窗进入活动

```javascript
import { executeActivity } from './scenarios/activities/activity-executor.js';

// 点击首页弹窗中的按钮进入活动
const result = await executeActivity({
    page,
    test,
    clickSelector: '.popup-content .daily-signin-btn',  // 弹窗中的按钮
    autoReturn: true                                     // 自动返回首页
});

if (result.success) {
    console.log(`进入了: ${result.activityName}`);
}
```

### 场景 3: 从菜单进入活动

```javascript
import { executeActivity } from './scenarios/activities/activity-executor.js';

// 点击菜单中的活动入口
const result = await executeActivity({
    page,
    test,
    clickSelector: '.menu-item.daily-signin',
    autoReturn: true,
    returnSelector: '.menu-list'  // 返回后验证菜单列表是否存在
});
```

### 场景 4: 已经在活动页面，直接执行处理逻辑

```javascript
import { executeActivityById } from './scenarios/activities/activity-executor.js';

// 直接执行每日签到的处理逻辑
const result = await executeActivityById({
    page,
    test,
    activityId: 'daily-signin'
});
```

### 场景 5: 自动识别当前活动并执行

```javascript
import { identifyAndExecuteActivity } from './scenarios/activities/activity-registry.js';

// 自动识别当前在哪个活动页面，并执行对应的处理逻辑
const result = await identifyAndExecuteActivity(page, test);

if (result.success) {
    console.log(`识别并处理了: ${result.activityName}`);
}
```

## 📋 支持的活动列表

| 活动 ID | 活动名称 | 识别方式 |
|---------|----------|----------|
| daily-signin | 每日签到 | URL: /daily, 文本: Daily Rewards |
| recharge | 充值活动 | URL: /recharge, 文本: Deposit |
| vip | VIP特权 | URL: /vip, 文本: VIP |
| invite | 邀请好友 | URL: /invite, 文本: Invite |
| turntable | 转盘抽奖 | URL: /turntable, 文本: Turntable |
| rescue | 救援金 | URL: /rescue, 文本: Rescue |
| coupon | 优惠券 | URL: /coupon, 文本: Coupon |
| rebate | 返水活动 | URL: /rebate, 文本: Rebate |
| task | 任务中心 | URL: /task, 文本: Task |
| championship | 锦标赛 | URL: /championship, 文本: Championship |
| jackpot | 超级大奖 | URL: /jackpot, 文本: Jackpot |
| membership-card | 周卡月卡 | URL: /card, 文本: Weekly Card |
| notification | 站内信 | URL: /notification, 文本: Notification |
| deposit-wheel | 充值转盘 | URL: /deposit-wheel, 文本: Deposit Wheel |
| commission | 新版返佣 | URL: /commission, 文本: My Rewards |
| withdraw | 提现活动 | URL: /withdraw, 文本: Withdraw |

## 🔧 如何添加新活动

### 步骤 1: 在 activity-handlers.js 中添加处理器

```javascript
// scenarios/activities/activity-handlers.js

export async function handleNewActivity(page, test) {
    console.log('      🎯 处理新活动...');
    
    try {
        // 检查是否在新活动页面
        const isOnPage = await page.locator('.new-activity-page').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);
        
        if (!isOnPage) {
            return { success: false, reason: '不在新活动页面' };
        }

        // 这里添加新活动的具体处理逻辑
        console.log('      ✅ 新活动页面验证完成');
        
        await page.waitForTimeout(1000);
        
        return { success: true, activityName: '新活动' };
        
    } catch (error) {
        console.log(`      ❌ 新活动处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}
```

### 步骤 2: 在 activity-registry.js 中注册活动

```javascript
// scenarios/activities/activity-registry.js

import * as handlers from './activity-handlers.js';

export const ACTIVITY_REGISTRY = {
    // ... 其他活动 ...
    
    // 新活动
    'new-activity': {
        id: 'new-activity',
        name: '新活动',
        identifiers: [
            { type: 'url', value: '/new-activity' },
            { type: 'text', value: 'New Activity' },
            { type: 'selector', value: '.new-activity-page' }
        ],
        handler: handlers.handleNewActivity
    }
};
```

### 步骤 3: 测试新活动

```javascript
import { executeActivity } from './scenarios/activities/activity-executor.js';

const result = await executeActivity({
    page,
    test,
    clickSelector: '.new-activity-button'
});

console.log(result.success ? '成功' : '失败');
```

## 📖 API 文档

### executeActivity(options)

通用活动执行器，从任何地方点击进入活动。

**参数:**
- `page` (Object) - Playwright page 对象
- `test` (Object) - TestCase 实例
- `clickSelector` (String, 可选) - 要点击的元素选择器
- `clickIndex` (Number, 可选) - 点击第几个元素（默认 0）
- `autoReturn` (Boolean, 可选) - 是否自动返回（默认 true）
- `returnSelector` (String, 可选) - 返回页面的验证选择器
- `waitAfterClick` (Number, 可选) - 点击后等待时间（默认 1000ms）

**返回:**
```javascript
{
    success: true,
    activityId: 'daily-signin',
    activityName: '每日签到',
    hasPopup: false,
    urlChanged: true
}
```

### executeBatchActivities(options)

批量执行活动列表中的所有活动。

**参数:**
- `page` (Object) - Playwright page 对象
- `test` (Object) - TestCase 实例
- `listSelector` (String, 可选) - 列表容器选择器（默认 '.activeList'）
- `itemSelector` (String, 可选) - 活动项选择器（默认 '.activeItem'）
- `maxActivities` (Number, 可选) - 最多处理多少个活动
- `skipIndexes` (Array, 可选) - 要跳过的活动索引

**返回:**
```javascript
{
    total: 16,
    success: 14,
    fail: 2,
    skip: 0,
    results: [...]
}
```

### executeActivityById(options)

直接执行指定活动的处理逻辑（适用于已经在活动页面）。

**参数:**
- `page` (Object) - Playwright page 对象
- `test` (Object) - TestCase 实例
- `activityId` (String) - 活动 ID

**返回:**
```javascript
{
    success: true,
    activityId: 'daily-signin',
    activityName: '每日签到'
}
```

### identifyAndExecuteActivity(page, test)

自动识别当前活动并执行处理逻辑。

**参数:**
- `page` (Object) - Playwright page 对象
- `test` (Object) - TestCase 实例

**返回:**
```javascript
{
    success: true,
    activityId: 'daily-signin',
    activityName: '每日签到'
}
```

## 🎨 实际使用案例

### 案例 1: 首页弹窗处理

```javascript
// src/utils/auth.js

import { executeActivity } from '../../scenarios/activities/activity-executor.js';

async function handleHomePopup(page, test) {
    // 点击首页弹窗中的"每日签到"按钮
    const result = await executeActivity({
        page,
        test,
        clickSelector: '.popup-content .daily-signin-btn',
        autoReturn: true,
        returnSelector: '#home'
    });
    
    if (result.success) {
        console.log(`✅ 处理了首页弹窗: ${result.activityName}`);
    }
}
```

### 案例 2: 活动资讯列表

```javascript
// scenarios/promo/promo.js

import { executeBatchActivities } from '../activities/activity-executor.js';

export async function verifyAllActivities(page, auth, test) {
    const result = await executeBatchActivities({
        page,
        test,
        listSelector: '.activeList',
        itemSelector: '.activeItem'
    });
    
    return result;
}
```

### 案例 3: 菜单入口

```javascript
// scenarios/menu/menu-index.js

import { executeActivity } from '../activities/activity-executor.js';

export async function testMenuDailySignIn(page, auth, test) {
    // 从菜单进入每日签到
    const result = await executeActivity({
        page,
        test,
        clickSelector: '.menu-item[data-activity="daily-signin"]',
        autoReturn: true,
        returnSelector: '.menu-list'
    });
    
    return result;
}
```

### 案例 4: 直接在活动页面

```javascript
// scenarios/daily/daily-signin.js

import { executeActivityById } from '../activities/activity-executor.js';

export async function handleDailySignInPage(page, test) {
    // 已经在每日签到页面，直接执行处理逻辑
    const result = await executeActivityById({
        page,
        test,
        activityId: 'daily-signin'
    });
    
    return result;
}
```

## 🔍 调试技巧

### 1. 查看活动注册表

```javascript
import { getActivityStats } from './scenarios/activities/activity-registry.js';

const stats = getActivityStats();
console.log(`共 ${stats.total} 个活动`);
stats.activities.forEach(a => {
    console.log(`- ${a.name} (${a.identifiersCount} 种识别方式)`);
});
```

### 2. 测试活动识别

```javascript
import { identifyActivity } from './scenarios/activities/activity-registry.js';

const currentUrl = page.url();
const activity = await identifyActivity(page, currentUrl);

if (activity) {
    console.log(`识别到: ${activity.name}`);
} else {
    console.log('未识别到活动');
}
```

### 3. 查看执行日志

系统会输出详细的日志：
```
📍 起始 URL: https://example.com/activity
👆 点击元素: .activeItem (索引: 0)
📊 URL 是否变化: 是
📍 当前 URL: https://example.com/daily
🔍 识别当前活动...
✅ 通过 URL "/daily" 识别为: 每日签到
🎯 处理每日签到活动...
✅ 每日签到页面验证完成
↩️ 返回原页面...
✅ 已返回原页面
```

## ⚠️ 注意事项

1. **活动处理器必须返回标准格式**
   ```javascript
   return { success: true, activityName: '活动名称' };
   // 或
   return { success: false, error: '错误信息' };
   ```

2. **活动 ID 必须唯一**
   - 在 ACTIVITY_REGISTRY 中，每个活动的 id 必须唯一

3. **识别器优先级**
   - URL 识别 > 选择器识别 > 文本识别
   - 建议每个活动至少有 2-3 种识别方式

4. **自动返回**
   - 默认会自动返回原页面
   - 如果不需要返回，设置 `autoReturn: false`

## 🎉 优势总结

### 统一管理
- 所有活动的处理逻辑集中在一个地方
- 修改一次，全项目生效

### 灵活复用
- 可以在任何地方调用
- 支持多种入口方式

### 自动识别
- 自动判断弹窗/直接跳转
- 自动识别活动类型

### 易于维护
- 添加新活动只需两步
- 清晰的代码结构

### 详细日志
- 完整的执行过程记录
- 便于调试和排查问题

---

**现在你可以在项目的任何地方使用相同的活动处理逻辑了！** 🎉
