# 每日签到和充值页面实现文档

## 概述

本文档详细说明了每日签到和充值页面的实现逻辑，包括弹窗处理、页面切换和充值流程。

## 每日签到实现

### 文件位置
- 处理器：[`scenarios/activities/handlers/daily-signin.js`](../scenarios/activities/handlers/daily-signin.js)

### 处理流程

#### 1. 检查活动形式
```javascript
// 检查是否是弹窗形式
const isPopup = await checkForDailySignInPopup(page);
```

**判断标准：**
- 弹窗：检测到 `.sheet-panel` 包含文本 "Daily check-in"
- 页面：检测到 `.daily-name` 包含文本 "Daily deposit rewards"

#### 2. 弹窗处理（两种情况）

##### 情况1：可领取奖励
**特征：**
- 弹窗标题：`Daily check-in`
- 按钮：`Claim`（可点击）

**处理逻辑：**
```javascript
// 1. 点击 "Claim" 按钮
await claimButton.click();

// 2. 等待 "Reward Claimed" 弹窗出现
const hasRewardPopup = await elementExists(page, {
    selector: '.received-dialog',
    hasText: 'Reward Claimed',
    timeout: 3000
});

// 3. 点击 "Closed" 按钮关闭弹窗
await closeButton.click();
```

**HTML结构：**
```html
<!-- 初始弹窗 -->
<div class="sheet-panel">
    <div class="bottom-head">
        <span>Daily check-in</span>
        <div>Details > </div>
    </div>
    <div class="bottom-body">
        <div class="dayRecharge">
            <div class="title">Daily deposit bonus</div>
            <div class="content">
                <div class="top">
                    <div class="processBar">
                        <div class="line" style="width: 100%;"></div>
                    </div>
                    <p class="processText">
                        <span>₹4,011</span>/₹100
                    </p>
                    <div class="amount">₹10.00</div>
                </div>
                <div class="activity-handle">
                    <div class="activity-btn btn_main_style text_shadow">Claim</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- 领取成功弹窗 -->
<div class="received-dialog">
    <div class="top-img">
        <img src="/assets/blue/icon_successfully.webp" alt="" class="img">
    </div>
    <div class="received-text">Reward Claimed</div>
    <div class="received-money">₹10.00</div>
    <div class="receive-btn">Closed</div>
</div>
```

##### 情况2：需要充值
**特征：**
- 弹窗标题：`Daily check-in`
- 按钮：`Deposit Now`（不可领取）

**处理逻辑：**
```javascript
// 1. 点击 "Details >" 按钮
await detailsButton.click();

// 2. 使用 switchToPage 切换到每日签到页面
await test.switchToPage('每日签到页面', {
    waitForSelector: '.daily-name',
    waitTime: 2000
});

// 3. 处理每日签到页面
return await handleDailySignInPage(page, test);
```

**HTML结构：**
```html
<div class="sheet-panel">
    <div class="bottom-head">
        <span>Daily check-in</span>
        <div>Details > </div>
    </div>
    <div class="bottom-body">
        <div class="dayRecharge">
            <div class="title">Daily deposit bonus</div>
            <div class="content">
                <div class="top">
                    <div class="processBar">
                        <div class="line" style="width: 0%;"></div>
                    </div>
                    <p class="processText">
                        <span>₹0</span>/₹100
                    </p>
                    <div class="amount">₹10.00</div>
                </div>
                <div class="activity-handle">
                    <div class="activity-btn btn_main_style text_shadow">Deposit Now</div>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### 3. 每日签到页面处理

**页面特征：**
- 页面标题：`Daily deposit rewards`（选择器：`.daily-name`）
- 充值按钮：`Deposit`（选择器：`.btn.topup`）

**处理逻辑：**
```javascript
// 1. 检查是否有 "Deposit" 按钮
const hasDepositButton = await elementExists(page, {
    selector: '.btn.topup',
    hasText: 'Deposit',
    timeout: 2000
});

if (hasDepositButton) {
    // 2. 点击 "Deposit" 按钮
    await depositButton.click();

    // 3. 使用 switchToPage 切换到充值页面
    await test.switchToPage('充值页面', {
        waitForSelector: '.route-name',
        waitTime: 2000
    });

    // 4. 处理充值页面（使用充值处理器）
    const { handleDepositPage } = await import('../deposit/deposit-handler.js');
    return await handleDepositPage(page, test);
}
```

## 充值页面实现

### 文件位置
- 处理器：[`scenarios/deposit/deposit-handler.js`](../scenarios/deposit/deposit-handler.js)
- 用例注册：[`scenarios/deposit/deposit-cases.js`](../scenarios/deposit/deposit-cases.js)

### 处理流程

#### 1. 检查弹窗
```javascript
// 检查是否出现 "Deposit Tutorial Video" 弹窗
const hasTutorialPopup = await checkForTutorialPopup(page);
```

**判断标准：**
- 弹窗标题：`Deposit Tutorial Video`（选择器：`.dialogTitle`）
- 关闭按钮：`.close-btn`

#### 2. 弹窗处理（情况1）

**处理逻辑：**
```javascript
// 1. 点击关闭按钮
const closeButton = page.locator('.close-btn').first();
await closeButton.click();

// 2. 处理充值页面内容
return await handleDepositPageContent(page, test, { depositAmount });
```

**HTML结构：**
```html
<h3 class="dialogTitle">Deposit Tutorial Video</h3>
<span class="ar_icon close-btn" aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_785_11992)">
            <path d="M39 20C39 30.4934 30.4934 39 20 39C9.50659 39 1 30.4934 1 20C1 9.50659 9.50659 1 20 1C30.4934 1 39 9.50659 39 20Z" stroke="var(--text_btn_main)" stroke-width="2" stroke-linejoin="round"></path>
            <path d="M28.75 11.25L11.25 28.75" stroke="var(--text_btn_main)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M11.25 11.25L28.75 28.75" stroke="var(--text_btn_main)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </g>
    </svg>
</span>
```

#### 3. 充值页面内容处理（情况2）

**页面特征：**
- 页面标题：`Deposit`（选择器：`.route-name`）
- 充值方式列表：`.payment-method`, `.deposit-method`, `.recharge-method`
- 充值金额输入框：`input[type="number"]`, `input[placeholder*="amount"]`
- 充值按钮：`button:has-text("Deposit")`, `.deposit-btn`

**处理逻辑：**
```javascript
// 1. 验证充值页面元素
const hasPageTitle = await elementExists(page, {
    selector: '.route-name',
    hasText: 'Deposit',
    timeout: 2000
});

const hasPaymentMethods = await elementExists(page, {
    selector: '.payment-method, .deposit-method, .recharge-method',
    timeout: 2000
});

const hasAmountInput = await elementExists(page, {
    selector: 'input[type="number"], input[placeholder*="amount"]',
    timeout: 2000
});

const hasDepositButton = await elementExists(page, {
    selector: 'button:has-text("Deposit"), .deposit-btn',
    timeout: 2000
});

// 2. 如果有充值金额，填写充值金额
if (depositAmount) {
    console.log(`📝 填写充值金额: ${depositAmount}`);
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount"]').first();
    await amountInput.clear();
    await amountInput.fill(depositAmount);
    await page.waitForTimeout(500);
    console.log('✅ 充值金额已填写');
}

// 3. 返回成功（页面验证通过）
return { 
    success: true, 
    activityName: '充值页面', 
    action: '页面验证',
    depositAmount: depositAmount || null
};
```

## 充值金额获取

### 模式2：从每日签到页面获取

**HTML结构：**
```html
<div class="topup daily-reward box_shadow_1">
    <div class="daily-type-img">
        <img class="img" src="/images/coins-KjHi6MkM.webp" alt="">
    </div>
    <div class="daily-reward-info">
        <div class="reward-amount">Day 1 reward <span class="i">₹10.00</span></div>
        <div class="reward-description">Recharge  <span class="i">100</span> today</div>
    </div>
    <div class="daily-reward-btn">
        <div class="btn topup">
            <span>Deposit</span>
        </div>
    </div>
</div>
```

**充值金额位置：**
- 选择器：`.reward-description .i`
- 文本内容：`100`（示例）
- 含义：需要充值 100 才能满足条件

**获取逻辑：**
```javascript
// 1. 查找充值金额元素
const amountElement = page.locator('.reward-description .i').first();
const isVisible = await amountElement.isVisible({ timeout: 2000 }).catch(() => false);

if (!isVisible) {
    console.log('⚠️ 未找到充值金额元素');
    return null;
}

// 2. 获取充值金额文本
const amountText = await amountElement.textContent().catch(() => '');
console.log(`📊 充值金额文本: "${amountText}"`);

// 3. 提取数字
const amountMatch = amountText.match(/\d+/);
if (amountMatch) {
    const amount = amountMatch[0];
    console.log(`✅ 提取到充值金额: ${amount}`);
    return amount;
} else {
    console.log('⚠️ 未能从文本中提取充值金额');
    return null;
}
```

**传递给充值处理器：**
```javascript
// 1. 获取充值金额
const depositAmount = await getDepositAmountFromDailySignIn(page);

// 2. 点击 "Deposit" 按钮
await depositButton.click();

// 3. 切换到充值页面
await test.switchToPage('充值页面', {
    waitForSelector: '.route-name',
    waitTime: 2000
});

// 4. 处理充值页面（传递充值金额和模式2标志）
const { handleDepositPage } = await import('../deposit/deposit-handler.js');
return await handleDepositPage(page, test, { depositAmount, isMode2: true });
```

## 模式1完整流程

### 流程图

```
每日签到弹窗（Deposit Now）
    ↓
点击 "Details >" 按钮
    ↓
切换到每日签到页面
    ↓
检查是否是模式1（需要充值）
    ↓
模式1：获取充值金额 + 点击 "Go to deposit" + 充值 + 返回 + 点击 "Claim" + 处理弹窗 + 进入首页
模式2：点击 "Claim" + 处理弹窗 + 进入首页
```

### 模式1判断标准

**模式1特征：**
- 页面标题：`Daily deposit rewards`（选择器：`.daily-name`）
- 充值提示：`Deposit ₹100.00 more today to claim ₹10.00.`（选择器：`.footer-tips`）
- 奖励天数：`Days 28`（选择器：`.reward-day`）

**模式2特征：**
- 页面标题：`Daily deposit rewards`（选择器：`.daily-name`）
- 没有 "Go to deposit" 按钮
- 有 "Claim" 按钮（选择器：`.btn.claim`）

### 详细步骤

#### 1. 每日签到弹窗（Deposit Now）
```javascript
// 检测到 "Deposit Now" 按钮
const hasDepositButton = await elementExists(page, {
    selector: '.activity-btn',
    hasText: 'Deposit Now',
    timeout: 2000
});

// 点击 "Details >" 按钮
await detailsButton.click();

// 切换到每日签到页面
await test.switchToPage('每日签到页面', {
    waitForSelector: '.daily-name',
    waitTime: 2000
});
```

#### 2. 检查模式
```javascript
// 检查是否是模式1（需要充值）
const isMode1 = await checkIsMode1(page);

if (isMode1) {
    console.log('✅ 检测到模式1（需要充值）');
    return await handleMode1(page, test);
} else {
    console.log('✅ 检测到模式2（已满足条件）');
    return await handleMode2(page, test);
}
```

#### 3. 模式1：获取充值金额
```javascript
// 从 .footer-tips 获取充值金额
const tipsElement = page.locator('.footer-tips').first();
const tipsText = await tipsElement.textContent().catch(() => '');
console.log(`📊 充值提示文本: "${tipsText}"`);

// 提取充值金额（格式：Deposit ₹100.00 more today to claim ₹10.00.）
const amountMatch = tipsText.match(/₹([\d,]+\.?\d*)/);
if (amountMatch) {
    const amount = amountMatch[1];
    console.log(`✅ 提取到充值金额: ${amount}`);
    return amount;
} else {
    console.log('⚠️ 未能从文本中提取充值金额');
    return null;
}
```

#### 4. 模式1：点击 "Go to deposit" 按钮
```javascript
// 点击 "Go to deposit" 按钮
const goToDepositButton = page.locator('.daily-footer-btn').filter({ hasText: 'Go to deposit' }).first();
await goToDepositButton.click();

// 切换到充值页面
await test.switchToPage('充值页面', {
    waitForSelector: '.route-name',
    waitTime: 2000
});
```

#### 5. 模式1：充值页面处理
```javascript
// 填写充值金额
const amountInput = page.locator('input[type="number"]').first();
await amountInput.clear();
await amountInput.fill(depositAmount);

// 点击充值按钮
const depositButton = page.locator('button:has-text("Deposit")').first();
await depositButton.click();

// 等待充值成功
await page.waitForTimeout(3000);
```

#### 6. 模式1：返回每日签到页面
```javascript
// 返回每日签到页面
await page.goBack();
await page.waitForTimeout(2000);

// 检查是否返回到每日签到页面
const isOnDailySignInPage = await elementExists(page, {
    selector: '.daily-name',
    hasText: 'Daily deposit rewards',
    timeout: 3000
});
```

#### 7. 模式1：点击 "Claim" 按钮
```javascript
// 查找 "Claim" 按钮
const claimButton = page.locator('.btn.claim').filter({ hasText: 'Claim' }).first();

// 点击 "Claim" 按钮
await claimButton.click();
await page.waitForTimeout(2000);
```

#### 8. 模式1：处理 "Reward Claimed" 弹窗
```javascript
// 检查是否出现 "Reward Claimed" 弹窗
const hasRewardPopup = await elementExists(page, {
    selector: '.received-dialog',
    hasText: 'Reward Claimed',
    timeout: 3000
});

// 点击 "Bet Now" 按钮
const betNowButton = page.locator('.receive-btn').filter({ hasText: 'Bet Now' }).first();
await betNowButton.click();
await page.waitForTimeout(2000);

// 进入首页（模式1完成）
console.log('✅ 模式1每日签到流程完成');
```

### HTML结构

#### 模式1：每日签到页面
```html
<div class="daily-name">Daily deposit rewards</div>
<div class="daily-footer-fixed">
    <div class="footer-tips">Deposit <span class="i">₹100.00</span> more today to claim <span class="i">₹10.00</span>.</div>
    <div class="daily-footer-btn">Go to deposit</div>
</div>
<div class="daily-everyday">
    <div class="daily-everyday-item-container golden-border">
        <div class="reward-amount"> + 10</div>
        <div class="reward-type-img">
            <img class="img" src="/images/coins-KjHi6MkM.webp" alt="">
        </div>
        <div class="reward-day">Days 1</div>
    </div>
    <div class="daily-everyday-item-container lock">
        <div class="reward-amount no"> + 11</div>
        <div class="reward-type-img">
            <img class="img" src="/images/coins-KjHi6MkM.webp" alt="">
        </div>
        <div class="reward-day">Days 2</div>
    </div>
    <!-- 更多天数项... -->
</div>
<div class="claim daily-reward box_shadow_1">
    <div class="daily-type-img">
        <img class="img" src="/images/coins-KjHi6MkM.webp" alt="">
    </div>
    <div class="daily-reward-info">
        <div class="reward-amount">Day 1 reward <span class="i">₹10.00</span></div>
        <div class="reward-description">Recharge  <span class="i">100</span> today</div>
    </div>
    <div class="daily-reward-btn">
        <div class="btn claim golden-border">
            <span>Claim</span>
        </div>
    </div>
</div>
```

#### "Reward Claimed" 弹窗
```html
<div class="received-dialog">
    <div class="top-img">
        <img src="/assets/blue/icon_successfully.webp" alt="" class="img">
    </div>
    <div class="received-text">Reward Claimed</div>
    <div class="received-money">₹10.00</div>
    <div class="received-tips">The reward has been added to your account balance, please use it as soon as possible!</div>
    <div class="receive-btn">Bet Now</div>
</div>
```

### 模式2：已实现

**说明：**
- 模式2的充值金额获取方式已在前面实现
- 模式2的完整流程已在前面实现
- 模式1和模式2只能出现一个

#### 模式2补充逻辑

**已领取状态检查：**
- 检查按钮的 class 是否包含 "claimed"
- 如果已领取，直接返回，不执行任何操作

**HTML结构：**
```html
<div class="claimed daily-reward box_shadow_1">
    <div class="daily-type-img">
        <img class="img" src="/images/coins-KjHi6MkM.webp" alt="">
    </div>
    <div class="daily-reward-info">
        <div class="reward-amount">Day 1 reward <span class="i">₹10.00</span></div>
        <div class="reward-description">Recharge  <span class="i">100</span> today</div>
    </div>
    <div class="daily-reward-btn">
        <div class="btn claimed">
            <span>Claimed</span>
        </div>
    </div>
</div>
```

**处理逻辑：**
```javascript
// 检查按钮是否已经领取
const claimButton = page.locator('.btn.claim').filter({ hasText: 'Claim' }).first();
const buttonClass = await claimButton.getAttribute('class').catch(() => '');
const isClaimed = buttonClass && buttonClass.includes('claimed');

if (isClaimed) {
    console.log('ℹ️ 按钮已领取（class 包含 "claimed"），直接返回');
    return { 
        success: true, 
        activityName: '每日签到', 
        action: '已领取' 
    };
}
```

## 页面切换说明

### switchToPage 使用

**作用：**
- 切换页面时进行性能数据采集
- 等待目标页面元素出现
- 记录页面切换信息

**使用示例：**
```javascript
// 切换到每日签到页面
await test.switchToPage('每日签到页面', {
    waitForSelector: '.daily-name',
    waitTime: 2000
});

// 切换到充值页面
await test.switchToPage('充值页面', {
    waitForSelector: '.route-name',
    waitTime: 2000
});
```

**参数说明：**
- `pageName`：页面名称（用于日志和性能数据）
- `waitForSelector`：等待出现的选择器
- `waitTime`：额外等待时间（毫秒）

## 复用性设计

### 充值处理器复用

充值处理器设计为独立模块，可以从任何页面调用：

```javascript
// 从每日签到页面调用
const { handleDepositPage } = await import('../deposit/deposit-handler.js');
return await handleDepositPage(page, test);

// 从其他页面调用
const { handleDepositPage } = await import('../deposit/deposit-handler.js');
return await handleDepositPage(page, test);
```

### 弹窗处理复用

充值页面的弹窗处理逻辑可以复用到其他场景：

```javascript
// 检查是否有弹窗
const hasPopup = await checkForTutorialPopup(page);

// 处理弹窗
if (hasPopup) {
    await handleTutorialPopup(page, test);
}
```

## 测试用例注册

### 充值用例大类

**文件：** [`scenarios/deposit/deposit-cases.js`](../scenarios/deposit/deposit-cases.js)

**注册方式：**
```javascript
import { registerDepositCases } from './scenarios/index.js';

// 注册充值用例
registerDepositCases(runner);
```

**可用用例：**
- `充值` -> `验证充值页面`

### 统一注册入口

**文件：** [`scenarios/index.js`](../scenarios/index.js)

**注册方式：**
```javascript
import { registerAllCases } from './scenarios/index.js';

// 注册所有用例（包括充值）
registerAllCases(runner);

// 只注册充值用例
registerAllCases(runner, { only: ['充值'] });
```

## 注意事项

1. **页面切换时机**：每次页面切换都要使用 `test.switchToPage()` 进行性能采集
2. **弹窗处理优先级**：先检查弹窗，再处理页面内容
3. **选择器稳定性**：使用稳定的选择器，避免使用动态生成的类名
4. **等待时间**：合理设置等待时间，确保页面加载完成
5. **错误处理**：捕获所有可能的异常，避免测试中断
6. **日志输出**：输出详细的日志，便于调试
7. **截图保存**：在错误时保存截图，便于分析问题

## 相关文件

- [`scenarios/activities/handlers/daily-signin.js`](../scenarios/activities/handlers/daily-signin.js) - 每日签到处理器
- [`scenarios/deposit/deposit-handler.js`](../scenarios/deposit/deposit-handler.js) - 充值页面处理器
- [`scenarios/deposit/deposit-cases.js`](../scenarios/deposit/deposit-cases.js) - 充值用例注册
- [`scenarios/index.js`](../scenarios/index.js) - 统一注册入口
- [`src/core/TestCase.js`](../src/core/TestCase.js) - TestCase 类（包含 switchToPage 方法）
- [`src/utils/element-finder.js`](../src/utils/element-finder.js) - 元素查找工具
