# 首页弹窗智能处理机制

## 概述

系统会自动从 `/api/Home/GetCommonPopup` 接口获取弹窗配置数据，并根据配置智能处理弹窗。

## 工作原理

### 1. 获取弹窗配置
每次进入首页时，系统会从网络监控中获取 `/api/Home/GetCommonPopup` 接口的响应数据：

```json
{
  "data": [
    {
      "id": 700020,
      "title": "弹窗标题",
      "popupInfo": {
        "jumpPageText": "充值",
        "jumpPage": 1,
        "jumpTypeText": "界面"
      }
    }
  ],
  "code": 0,
  "msg": "Succeed"
}
```

### 2. 弹窗类型判断

系统根据两个条件判断弹窗类型：

#### 类型 1：需要页面跳转
- **条件**：`popupInfo.jumpPageText` 存在 且 点击后路由发生变化
- **处理方式**：
  1. 点击弹窗图片
  2. 等待页面跳转
  3. 根据 `jumpPageText` 进行断言
  4. 使用 `page.goBack()` 返回首页

#### 类型 2：不需要页面跳转
- **条件**：点击后路由未发生变化
- **处理方式**：
  1. 点击弹窗图片
  2. 弹窗自动关闭
  3. 无需额外操作

### 3. jumpPageText 映射表

| jumpPageText | 断言文本 | 说明 |
|-------------|---------|------|
| 充值 | Deposit | 充值页面 |
| 洗码 | Rebate | 洗码页面 |
| 邀请转盘 | Invitation Wheel | 转盘页面（支持 "Cash everyday"） |
| 亏损救援金 | Loss Rebate | 亏损救援页面 |
| 每日签到 | Daily deposit rewards | 签到页面 |

## 处理流程

```
开始
  ↓
检测到弹窗
  ↓
获取弹窗配置数据
  ↓
点击弹窗图片
  ↓
记录 URL 变化
  ↓
┌─────────────────┐
│ 路由是否变化？   │
└─────────────────┘
  ↓           ↓
 是          否
  ↓           ↓
有 jumpPageText?  弹窗已关闭
  ↓           ↓
 是          结束
  ↓
根据映射表断言
  ↓
返回首页 (goBack)
  ↓
结束
```

## 代码示例

### 使用智能弹窗处理

```javascript
// 进入首页后自动处理弹窗
await auth.checkAndHandleHomePopups(20);
```

### 日志输出示例

```
🔍 开始检查首页弹窗（最多 20 次）...
📊 获取到 3 个弹窗配置
✓ 通过选择器 ".popup-content" 检测到弹窗
🎁 第1次检查：发现第1个弹窗，处理中...
📋 使用配置数据处理弹窗 1/3
📋 弹窗标题: 弹窗-页面-跳转充值_对比洗码
📋 跳转页面: 充值
📍 点击前 URL: https://example.com/home
🖼️ 点击弹窗图片 (.popup_img)...
📍 点击后 URL: https://example.com/deposit
📊 路由是否变化: 是
🎯 检测到页面跳转，使用 switchToPage 处理...
✓ 映射断言文本: Deposit
✅ 断言成功: Deposit
🔙 返回首页...
✅ 成功返回首页
✅ 第2次检查：无弹窗
📊 弹窗检查完成：共处理 1 个弹窗
```

## 注意事项

1. **接口数据依赖**：系统依赖 `/api/Home/GetCommonPopup` 接口数据，如果接口未调用或数据异常，会降级使用传统处理方式

2. **映射表维护**：如果有新的 `jumpPageText` 值，需要在 `_getAssertTextByJumpPage` 方法中添加映射

3. **多断言支持**：对于"邀请转盘"，支持 "Invitation Wheel" 或 "Cash everyday" 两个断言文本

4. **降级处理**：如果智能处理失败，系统会自动降级使用传统的 `_tryClosePopup` 方法

## 扩展映射表

如需添加新的跳转页面映射，修改 `src/utils/auth.js` 中的 `_getAssertTextByJumpPage` 方法：

```javascript
_getAssertTextByJumpPage(jumpPageText) {
    const jumpPageMap = {
        "充值": "Deposit",
        "洗码": "Rebate",
        "邀请转盘": "Invitation Wheel",
        "亏损救援金": "Loss Rebate",
        "每日签到": "Daily deposit rewards",
        // 添加新的映射
        "新活动": "New Activity"
    };

    return jumpPageMap[jumpPageText] || null;
}
```



{"周卡月卡":"Promotions"，"每日每周任务":"Tasks","首页":"Home","我的":"UID","充值转盘"："Deposit Wheel","新版返佣":"My Rewards","站内信":"Notifications","锦标赛":"Championship","VIP":"VIP","超级大奖":"Super Jackpot","优惠券":"Coupons","礼品码":"Home","提现":"Withdraw"}