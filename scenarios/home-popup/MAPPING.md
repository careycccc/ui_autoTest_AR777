# 首页弹窗跳转映射表

## 完整映射表

| jumpPageText (中文) | 断言文本 (assertText) | 处理函数 | 说明 |
|-------------------|---------------------|---------|------|
| 充值 | Deposit | handleDepositPopup | 充值页面 |
| 洗码 | Rebate | handleRebatePopup | 洗码页面 |
| 邀请转盘 | Invitation Wheel | null | 已有专门用例 |
| 亏损救援金 | Loss Rebate | handleLossRebatePopup | 亏损救援页面 |
| 每日签到 | Daily deposit rewards | handleDailyDepositRewardsPopup | 签到页面 |
| 周卡月卡 | Promotions | null | 父用例（活动资讯） |
| 每日每周任务 | Tasks | handleTasksPopup | 任务页面 |
| 首页 | Home | null | 父用例（首页） |
| 我的 | UID | handleUIDPopup | 我的页面（特殊匹配） |
| 充值转盘 | Deposit Wheel | handleDepositWheelPopup | 充值转盘页面 |
| 新版返佣 | My Rewards | handleMyRewardsPopup | 新版返佣页面 |
| 站内信 | Notifications | handleNotificationsPopup | 站内信页面 |
| 锦标赛 | Championship | handleChampionshipPopup | 锦标赛页面 |
| VIP | VIP | handleVIPPopup | VIP页面 |
| 超级大奖 | Super Jackpot | handleSuperJackpotPopup | 超级大奖页面 |
| 优惠券 | Coupons | handleCouponsPopup | 优惠券页面 |
| 礼品码 | Home | null | 父用例（首页） |
| 提现 | Withdraw | handleWithdrawPopup | 提现页面 |

## 特殊处理说明

### 1. UID 特殊匹配
**jumpPageText**: "我的"  
**断言文本**: "UID"  
**匹配方式**: 部分匹配（正则表达式）

由于 UID 后面可能有不固定的内容（如 "UID: 123456"），系统使用正则表达式进行部分匹配：
```javascript
selector = 'text=/UID/i';  // 不区分大小写，只要包含 UID 即可
```

### 2. 父用例页面
以下页面属于父用例，已有专门的测试用例处理，弹窗跳转时无需额外处理：

- **Promotions** (周卡月卡) - 对应"活动资讯"父用例
- **Home** (首页/礼品码) - 对应"首页"父用例
- **Invitation Wheel** (邀请转盘) - 对应"邀请转盘"父用例

这些页面在弹窗处理时会跳过，不调用处理函数。

### 3. 多个 jumpPageText 映射到同一个断言文本
- "首页" → Home
- "礼品码" → Home

这两个不同的 jumpPageText 都映射到 Home，因为它们都跳转到首页。

## 文件结构

```
scenarios/home-popup/
├── index.js                      # 主入口，统一导出
├── deposit.js                    # 充值
├── rebate.js                     # 洗码
├── loss-rebate.js                # 亏损救援金
├── daily-deposit-rewards.js      # 每日签到
├── tasks.js                      # 每日每周任务
├── uid.js                        # 我的
├── deposit-wheel.js              # 充值转盘
├── my-rewards.js                 # 新版返佣
├── notifications.js              # 站内信
├── championship.js               # 锦标赛
├── vip.js                        # VIP
├── super-jackpot.js              # 超级大奖
├── coupons.js                    # 优惠券
├── withdraw.js                   # 提现
├── MAPPING.md                    # 本文档
└── README.md                     # 使用文档
```

## 断言逻辑

### 普通文本匹配
```javascript
selector = `text=${text}`;
const exists = await page.locator(selector).isVisible({ timeout: 2000 });
```

### UID 特殊匹配
```javascript
selector = 'text=/UID/i';  // 正则表达式，不区分大小写
const exists = await page.locator(selector).first().isVisible({ timeout: 2000 });
```

## 日志输出示例

### 普通页面
```
📋 跳转页面: 充值
✓ 映射断言文本: Deposit
⏳ 等待页面加载完成...
✅ 页面加载完成
✅ 断言成功: Deposit
🎯 执行 "Deposit" 页面处理函数...
🎯 处理充值页面弹窗...
✅ 活动页面处理完成
```

### UID 特殊匹配
```
📋 跳转页面: 我的
✓ 映射断言文本: UID
⏳ 等待页面加载完成...
✅ 页面加载完成
✅ 断言成功: UID (部分匹配)
🎯 执行 "UID" 页面处理函数...
🎯 处理我的页面弹窗...
✅ 活动页面处理完成
```

### 父用例页面
```
📋 跳转页面: 周卡月卡
✓ 映射断言文本: Promotions
⏳ 等待页面加载完成...
✅ 页面加载完成
✅ 断言成功: Promotions
ℹ️ "Promotions" 页面无需额外处理（父用例或已有专门测试）
```

## 添加新映射

如需添加新的跳转页面映射：

1. 在 `src/utils/auth.js` 的 `_getAssertTextByJumpPage` 方法中添加映射
2. 创建对应的处理函数文件（如 `new-page.js`）
3. 在 `scenarios/home-popup/index.js` 中导入并注册处理函数
4. 更新本文档的映射表

## 注意事项

1. **断言文本必须准确**：确保页面上确实存在对应的文本
2. **UID 特殊处理**：只有 UID 使用正则匹配，其他都是精确匹配
3. **父用例跳过**：父用例页面会自动跳过，不会调用处理函数
4. **等待时间**：每个页面跳转后都会等待至少 3 秒或页面加载完成
