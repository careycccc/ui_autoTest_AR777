# 活动系统总结

## 🎯 问题

你的项目中有多个地方可以进入同一个活动：
- 首页弹窗
- 活动资讯列表
- 菜单入口
- 其他页面的按钮

每个活动的处理逻辑都是一样的，但之前需要在每个地方重复编写代码。

## ✅ 解决方案

创建了一个**通用活动系统**，实现了：
1. 活动处理逻辑的统一管理
2. 在项目任何地方都可以复用
3. 自动识别活动类型
4. 自动处理弹窗和页面跳转

## 📁 文件结构

```
scenarios/activities/
├── activity-handlers.js      # 16个活动的处理器
├── activity-registry.js       # 活动注册表（统一管理）
└── activity-executor.js       # 通用执行器（可在任何地方调用）

scenarios/promo/
├── promo.js                   # 原版本（使用旧的配置池）
└── promo-v2.js                # 新版本（使用新的活动系统）

docs/
├── UNIVERSAL_ACTIVITY_SYSTEM.md  # 详细使用指南
└── ACTIVITY_SYSTEM_SUMMARY.md    # 本文档
```

## 🚀 使用方式

### 1. 从活动列表批量执行

```javascript
import { executeBatchActivities } from './scenarios/activities/activity-executor.js';

const result = await executeBatchActivities({
    page,
    test,
    listSelector: '.activeList',
    itemSelector: '.activeItem'
});
```

### 2. 从首页弹窗进入活动

```javascript
import { executeActivity } from './scenarios/activities/activity-executor.js';

const result = await executeActivity({
    page,
    test,
    clickSelector: '.popup-content .daily-signin-btn',
    autoReturn: true
});
```

### 3. 从菜单进入活动

```javascript
const result = await executeActivity({
    page,
    test,
    clickSelector: '.menu-item.daily-signin',
    autoReturn: true,
    returnSelector: '.menu-list'
});
```

### 4. 已经在活动页面，直接执行

```javascript
import { executeActivityById } from './scenarios/activities/activity-executor.js';

const result = await executeActivityById({
    page,
    test,
    activityId: 'daily-signin'
});
```

## 📋 支持的16种活动

1. daily-signin - 每日签到
2. recharge - 充值活动
3. vip - VIP特权
4. invite - 邀请好友
5. turntable - 转盘抽奖
6. rescue - 救援金
7. coupon - 优惠券
8. rebate - 返水活动
9. task - 任务中心
10. championship - 锦标赛
11. jackpot - 超级大奖
12. membership-card - 周卡月卡
13. notification - 站内信
14. deposit-wheel - 充值转盘
15. commission - 新版返佣
16. withdraw - 提现活动

## 🔧 如何添加新活动

### 步骤 1: 添加处理器

在 `scenarios/activities/activity-handlers.js` 中：

```javascript
export async function handleNewActivity(page, test) {
    console.log('      🎯 处理新活动...');
    
    // 检查是否在新活动页面
    const isOnPage = await page.locator('.new-activity').first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
    
    if (!isOnPage) {
        return { success: false, reason: '不在新活动页面' };
    }

    // 处理逻辑
    console.log('      ✅ 新活动处理完成');
    
    return { success: true, activityName: '新活动' };
}
```

### 步骤 2: 注册活动

在 `scenarios/activities/activity-registry.js` 中：

```javascript
'new-activity': {
    id: 'new-activity',
    name: '新活动',
    identifiers: [
        { type: 'url', value: '/new-activity' },
        { type: 'text', value: 'New Activity' },
        { type: 'selector', value: '.new-activity' }
    ],
    handler: handlers.handleNewActivity
}
```

### 步骤 3: 使用

```javascript
const result = await executeActivity({
    page,
    test,
    clickSelector: '.new-activity-button'
});
```

## 🎨 实际应用场景

### 场景 1: 首页弹窗处理（auth.js）

```javascript
// src/utils/auth.js
import { executeActivity } from '../../scenarios/activities/activity-executor.js';

async function handleHomePopup(page, test) {
    const result = await executeActivity({
        page,
        test,
        clickSelector: '.popup-content .activity-btn',
        autoReturn: true,
        returnSelector: '#home'
    });
}
```

### 场景 2: 活动资讯列表（promo-v2.js）

```javascript
// scenarios/promo/promo-v2.js
import { executeBatchActivities } from '../activities/activity-executor.js';

export async function verifyAllActivities(page, auth, test) {
    return await executeBatchActivities({
        page,
        test,
        listSelector: '.activeList',
        itemSelector: '.activeItem'
    });
}
```

### 场景 3: 菜单入口（menu-index.js）

```javascript
// scenarios/menu/menu-index.js
import { executeActivity } from '../activities/activity-executor.js';

export async function openDailySignIn(page, test) {
    return await executeActivity({
        page,
        test,
        clickSelector: '.menu-item[data-activity="daily"]',
        autoReturn: true
    });
}
```

## 📊 系统工作流程

```
1. 点击元素（或已在活动页面）
   ↓
2. 检查 URL 是否变化
   ├─ 变化 → 直接跳转
   └─ 未变化 → 检测弹窗 → 点击弹窗按钮
   ↓
3. 识别活动类型（通过 URL/文本/选择器）
   ↓
4. 执行对应的活动处理器
   ↓
5. 返回原页面（如果 autoReturn=true）
```

## 🎉 优势

### 1. 统一管理
- 所有活动处理逻辑集中管理
- 修改一次，全项目生效

### 2. 灵活复用
- 可以在任何地方调用
- 支持多种入口方式

### 3. 自动识别
- 自动判断弹窗/直接跳转
- 自动识别活动类型

### 4. 易于维护
- 添加新活动只需两步
- 清晰的代码结构

### 5. 详细日志
- 完整的执行过程记录
- 便于调试和排查问题

## 📚 相关文档

- [UNIVERSAL_ACTIVITY_SYSTEM.md](./UNIVERSAL_ACTIVITY_SYSTEM.md) - 详细使用指南
- [activity-handlers.js](../scenarios/activities/activity-handlers.js) - 活动处理器
- [activity-registry.js](../scenarios/activities/activity-registry.js) - 活动注册表
- [activity-executor.js](../scenarios/activities/activity-executor.js) - 活动执行器

## 🔄 迁移指南

### 从旧版本迁移到新版本

**旧版本（promo.js）:**
```javascript
import { handleActivityClick } from './scenarios/promo/promo.js';

await handleActivityClick({
    page,
    test,
    index: 0,
    targetPage: { ... },
    popup: { ... }
});
```

**新版本（使用活动系统）:**
```javascript
import { executeActivity } from './scenarios/activities/activity-executor.js';

await executeActivity({
    page,
    test,
    clickSelector: '.activeList .activeItem',
    clickIndex: 0
});
```

更简单，更灵活！

## 🎯 下一步

1. 在 `activity-handlers.js` 中完善每个活动的处理逻辑
2. 在项目的其他地方（首页弹窗、菜单等）使用新的活动系统
3. 根据实际需求添加新的活动

---

**现在你有了一个统一的活动处理系统，可以在项目的任何地方复用！** 🎉
