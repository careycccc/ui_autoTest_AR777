# 邀请转盘执行逻辑

## 重要修复记录

### 🔧 修复：规则弹窗关闭方式（2026-02-28）

**问题描述**：
1. 规则弹窗关闭时应该点击 "Confirm" 按钮，而不是点击左上角的返回按钮
2. 点击后需要等待 2 秒让页面稳定，避免连续快速点击导致问题

**修复内容**：
- 优先查找并点击 "Confirm" 按钮关闭规则弹窗
- 点击后增加 2 秒等待时间，确保页面稳定
- 如果找不到 Confirm 按钮，才使用备用关闭方式（关闭按钮、遮罩层、ESC 键）

**修复文件**：
- `scenarios/turntable/turntable-rules.js` - 修改规则弹窗关闭逻辑

---

### 🔧 修复：CASH OUT 按钮重复点击问题（2026-02-28）

**问题描述**：
- 在 `rotateTurntable()` 中已经点击了 CASH OUT 按钮并等待 5 秒
- 但在 `turntable-cases.js` 的"转盘旋转功能"用例中又调用了 `verifyCashOut()`
- `verifyCashOut()` 内部会通过 `clickCashOutButton()` 再次尝试点击 CASH OUT 按钮
- 由于按钮已经被点击过，页面已经跳转，导致第二次点击超时失败

**错误日志**：
```
🎉 检测到奖励页面（Congratulations），页面正在自动跳转...
⏳ 等待 5 秒让页面完全稳定（自动跳转 + 数据加载）...
✅ 页面稳定后重新找到 CASH OUT 按钮
✅ 已点击 CASH OUT 按钮
💰 CASH OUT 按钮已点击，等待弹窗处理...
✅ 转盘旋转完成
🔍 开始验证提现功能...
✅ 找到 CASH OUT 按钮
⚠️ CASH OUT 弹窗处理失败: locator.click: Timeout 30000ms exceeded.
```

**根本原因**：
- `rotateTurntable()` 已经完成了按钮点击，并设置了 `cashOutClicked: true`
- 但 `turntable-cases.js` 中仍然调用 `verifyCashOut()`，该函数会再次点击按钮
- 应该直接处理已经出现的弹窗，而不是再次点击按钮

**解决方案**：
当 `rotateResult.cashOutClicked` 为 true 时：
- ❌ 不要调用 `verifyCashOut()`（会再次点击按钮）
- ✅ 应该调用 `handleCashOutDialog()`（直接处理弹窗）

**修复代码**（turntable-cases.js）：
```javascript
if (rotateResult.cashOutClicked) {
    console.log('✅ CASH OUT 按钮已点击');
    
    // 🔥 按钮已经在 rotateTurntable() 中点击过了
    // 直接处理已经出现的弹窗，不要再次点击按钮
    try {
        const { handleCashOutDialog } = await import('../turntable/turntable-catchout.js');
        const cashOutResult = await handleCashOutDialog(page, auth, test);
        console.log(`✅ CASH OUT 弹窗处理完成 (类型: ${cashOutResult.type})`);
        
        if (cashOutResult.successHandled) {
            console.log('🎊 已完成 CASH OUT 并进入下一轮活动');
        }
    } catch (error) {
        console.log(`⚠️ CASH OUT 弹窗处理失败: ${error.message}`);
    }
}
```

**函数对比**：

| 函数 | 功能 | 是否点击按钮 | 使用场景 |
|------|------|-------------|---------|
| `verifyCashOut()` | 点击按钮 + 处理弹窗 | ✅ 是 | 按钮未点击时使用 |
| `handleCashOutDialog()` | 仅处理弹窗 | ❌ 否 | 按钮已点击时使用 |

**修复文件**：
- `scenarios/turntable/turntable-cases.js` - 修改"转盘旋转功能"用例

---

## 概述

邀请转盘父用例根据首次进入时检测到的页面状态，采用不同的执行策略：

- **情况A**: 检测到 Congratulations（CASH OUT 页面）→ 直接处理 CASH OUT，跳过其他子用例
- **情况B**: 检测到正常转盘页面 → 先执行其他子用例（规则、历史、邀请），最后执行旋转

## 执行策略

### 情况A：首次进入检测到 Congratulations（CASH OUT 页面）

**触发条件**:
- 页面状态：`state === 'reward_ready'`
- 页面元素：同时存在 "Congratulations" 和 "CASH OUT" 文本
- **说明**: 上一轮活动已完成，奖励已满足，需要提现

**执行流程**:
```
进入邀请转盘页面
  ↓
[1/5] 转盘页面加载
  ├─ 检测到 Congratulations 页面
  ├─ 点击 CASH OUT 按钮
  ├─ 处理 Cash out 确认弹窗（点击 Confirm）
  ├─ 处理 Success 弹窗（点击 OK）
  ├─ 进入下一轮活动
  └─ 🔥 标记 auth.turntableParentCaseCompleted = true
  ↓
[2/5] 规则弹窗检测 → ℹ️ 跳过（父用例已完成）
[3/5] 领取奖励历史 → ℹ️ 跳过（父用例已完成）
[4/5] 邀请按钮 → ℹ️ 跳过（父用例已完成）
[5/5] 转盘旋转功能 → ℹ️ 跳过（父用例已完成）
  ↓
父用例执行完毕
  ↓
🏠 强制导航回首页
```

**日志示例**:
```
[1/5] 📄 转盘页面加载
    🎯 开始转盘初始化...
    ✅ 检测到状态3: Congratulations 奖励已满足
    💰 检测到 Congratulations 奖励页面
    ✅ 已点击 CASH OUT 按钮
    🖱️ 已点击 Confirm 按钮
    🖱️ 已点击 OK 按钮
    ✅ 本轮活动已满足，无需等待 Canvas 渲染
    ✅ 转盘初始化成功 (状态: reward_ready)
    🎊 检测到已完成 CASH OUT 并进入下一轮活动
    ✅ 邀请转盘父用例已完成，跳过所有后续子用例
    ✅ 通过 (11184ms)

[2/5] 📄 规则弹窗检测
    ℹ️ 父用例已完成（已进入下一轮），跳过当前用例
    ✅ 通过 (0ms)
```

### 情况B-1：首次进入检测到活动开始页面（Cash everyday）

**触发条件**:
- 页面状态：`state === 'gift_selection'`
- 页面元素：显示 "Cash everyday" 和 "Choose your reward"
- **说明**: 新一轮活动开始，需要选择礼物

**执行流程**:
```
进入邀请转盘页面
  ↓
[1/5] 转盘页面加载
  ├─ 检测到 Cash everyday 礼物选择页面
  ├─ 随机选择一个礼物盒
  ├─ 等待转盘界面出现
  ├─ 验证 Canvas 加载
  └─ 🔥 标记 auth.turntableShouldExecuteOtherCasesFirst = true
  ↓
[2/5] 规则弹窗检测 → ✅ 执行
  ↓
[3/5] 领取奖励历史 → ✅ 执行
  ↓
[4/5] 邀请按钮 → ✅ 执行
  ↓
[5/5] 转盘旋转功能 → ✅ 执行（包含旋转和 CASH OUT）
  ├─ 循环旋转直到满足条件
  ├─ 检测到 Congratulations 页面
  ├─ 点击 CASH OUT → Confirm → Success → OK
  └─ 进入下一轮活动
  ↓
父用例执行完毕
  ↓
🏠 强制导航回首页
```

**日志示例**:
```
[1/5] 📄 转盘页面加载
    🎯 开始转盘初始化...
    ✅ 检测到状态1: Cash everyday 礼物选择界面
    🎁 开始处理礼物选择...
    📦 找到 4 个礼物盒
    ✅ 已点击第 2 个礼物盒
    ✅ 礼物选择后，转盘界面已出现
    ✅ 转盘初始化成功 (状态: gift_selection)
    ℹ️ 检测到正常转盘页面，将先执行其他子用例（规则、历史、邀请）
    ✅ Canvas 已正确加载并渲染内容
    ✅ 通过 (6234ms)

[2/5] 📄 规则弹窗检测
    ✅ 通过 (1523ms)
```

### 情况B-2：首次进入检测到活动进行中页面（Invitation Wheel）

**触发条件**:
- 页面状态：`state === 'wheel_active'`
- 页面元素：显示 "Invitation Wheel" 或 "INVITE FRIENDS FOR REWARDS"
- **说明**: 活动正在进行中，转盘已激活，可以直接旋转

**执行流程**:
```
进入邀请转盘页面
  ↓
[1/5] 转盘页面加载
  ├─ 检测到 Invitation Wheel 转盘界面
  ├─ 验证 Canvas 加载
  └─ 🔥 标记 auth.turntableShouldExecuteOtherCasesFirst = true
  ↓
[2/5] 规则弹窗检测 → ✅ 执行
  ↓
[3/5] 领取奖励历史 → ✅ 执行
  ↓
[4/5] 邀请按钮 → ✅ 执行
  ↓
[5/5] 转盘旋转功能 → ✅ 执行（包含旋转和 CASH OUT）
  ├─ 循环旋转直到满足条件
  ├─ 检测到 Congratulations 页面
  ├─ 点击 CASH OUT → Confirm → Success → OK
  └─ 进入下一轮活动
  ↓
父用例执行完毕
  ↓
🏠 强制导航回首页
```

**日志示例**:
```
[1/5] 📄 转盘页面加载
    🎯 开始转盘初始化...
    ✅ 检测到状态2: Invitation Wheel 转盘界面
    ✅ 转盘初始化成功 (状态: wheel_active)
    ℹ️ 检测到正常转盘页面，将先执行其他子用例（规则、历史、邀请）
    ✅ Canvas 已正确加载并渲染内容
    ✅ 通过 (5234ms)

[2/5] 📄 规则弹窗检测
    ✅ 通过 (1523ms)

[3/5] 📄 领取奖励历史
    ✅ 通过 (2134ms)

[4/5] 📄 邀请按钮
    ✅ 通过 (1876ms)

[5/5] 📄 转盘旋转功能
    🎰 开始循环旋转...
    🎯 第 1 次旋转
    ✅ 第 1 次旋转成功
    ...
    🎉 已跳转到奖励页面（Congratulations）
    ✅ CASH OUT 按钮已点击
    ✅ CASH OUT 弹窗处理完成
    ✅ 通过 (15234ms)
```

## 关键代码

### 1. 状态检测和标记（turntable-cases.js）

```javascript
console.log(`✅ 转盘初始化成功 (状态: ${initResult.state})`);

// 🔥 情况A：检查是否已经完成 CASH OUT 并进入下一轮
if (initResult.cashOutClicked && initResult.skipCanvasCheck) {
    console.log('🎊 检测到已完成 CASH OUT 并进入下一轮活动');
    console.log('✅ 邀请转盘父用例已完成，跳过所有后续子用例');
    
    // 标记父用例已完成
    auth.turntableParentCaseCompleted = true;
    auth.turntablePageFailed = false;
    auth.turntableInitialized = true;
    
    return;  // 直接返回，跳过 Canvas 检查
}

// 🔥 情况B：如果是正常转盘页面，标记需要先执行其他子用例
if (initResult.state === 'wheel_active' || initResult.state === 'gift_selection') {
    console.log('ℹ️ 检测到正常转盘页面，将先执行其他子用例（规则、历史、邀请）');
    auth.turntableShouldExecuteOtherCasesFirst = true;
}
```

### 2. 子用例跳过检查（所有后续子用例）

```javascript
runner.registerCase('邀请转盘', '规则弹窗检测', async (page, auth, test) => {
    // 🔥 检查父用例是否已完成（情况A）
    if (auth.turntableParentCaseCompleted) {
        console.log('ℹ️ 父用例已完成（已进入下一轮），跳过当前用例');
        return;
    }
    
    if (auth.turntablePageFailed) {
        console.log('⚠️ 转盘页面加载失败，跳过当前用例');
        return;
    }
    
    // 🔥 情况B：正常执行
    console.log('🎯 开始规则弹窗检测...');
    // ... 正常执行用例逻辑
});
```

## 状态标志

### auth.turntableParentCaseCompleted

- **类型**: Boolean
- **默认值**: undefined/false
- **设置条件**: 检测到 Congratulations 并完成 CASH OUT（情况A）
- **作用**: 跳过所有后续子用例
- **清除时机**: 下一个父用例开始前

### auth.turntableShouldExecuteOtherCasesFirst

- **类型**: Boolean
- **默认值**: undefined/false
- **设置条件**: 检测到正常转盘页面（情况B）
- **作用**: 标记需要先执行其他子用例，最后执行旋转
- **清除时机**: 下一个父用例开始前

### initResult.skipCanvasCheck

- **类型**: Boolean
- **设置位置**: `turntable-init.js` - turntablePlay() 函数
- **含义**: 跳过 Canvas 加载检查（因为已经进入下一轮）

### initResult.cashOutClicked

- **类型**: Boolean
- **设置位置**: `turntable-init.js` - turntablePlay() 函数
- **含义**: 是否成功点击了 CASH OUT 按钮

## 页面状态说明

### 状态1: gift_selection（礼物选择 - 活动开始）

- **特征**: 显示 "Cash everyday" 和 "Choose your reward"
- **含义**: 新一轮活动开始，需要选择礼物
- **处理**: 随机选择一个礼物盒，进入转盘界面
- **执行策略**: 情况B-1（先执行其他子用例）
- **后续状态**: 选择礼物后进入 wheel_active 状态

### 状态2: wheel_active（转盘激活 - 活动进行中）

- **特征**: 显示 "Invitation Wheel" 或 "INVITE FRIENDS FOR REWARDS"
- **含义**: 活动正在进行中，转盘已激活
- **处理**: 转盘已激活，可以直接旋转
- **执行策略**: 情况B-2（先执行其他子用例）
- **后续状态**: 旋转后可能进入 reward_ready 状态

### 状态3: reward_ready（奖励已满足 - 活动完成）

- **特征**: 同时显示 "Congratulations" 和 "CASH OUT"
- **含义**: 上一轮活动已完成，奖励已满足
- **处理**: 直接点击 CASH OUT 并处理弹窗
- **执行策略**: 情况A（直接 CASH OUT，跳过其他子用例）
- **后续状态**: 点击 OK 后进入新一轮的 gift_selection 状态

## 状态转换流程

```
新用户首次进入
  ↓
gift_selection (状态1 - 活动开始)
  ↓ 选择礼物
wheel_active (状态2 - 活动进行中)
  ↓ 旋转达到目标
reward_ready (状态3 - 活动完成)
  ↓ CASH OUT
gift_selection (状态1 - 新一轮开始)
  ↓
循环...
```

## 为什么需要不同的执行策略？

### 情况A的优势（Congratulations 页面）

1. **避免重复操作**: 已经完成 CASH OUT，不需要再测试其他功能
2. **提高效率**: 跳过不必要的子用例，节省约 15 秒
3. **状态一致**: 快速进入下一个父用例，避免状态污染
4. **逻辑合理**: 活动已完成，测试其他功能没有意义

### 情况B-1的必要性（Cash everyday 页面）

1. **完整测试**: 新一轮活动开始，需要测试所有功能
2. **礼物选择**: 需要先选择礼物才能进入转盘界面
3. **功能验证**: 规则、历史、邀请按钮都需要验证
4. **顺序合理**: 先测试静态功能，最后测试动态功能（旋转）

### 情况B-2的必要性（Invitation Wheel 页面）

1. **完整测试**: 活动进行中，需要测试所有功能
2. **无需选择**: 转盘已激活，可以直接测试
3. **功能验证**: 规则、历史、邀请按钮都需要验证
4. **顺序合理**: 先测试静态功能，最后测试动态功能（旋转）

## 测试用例执行顺序

### 情况A（Congratulations 页面 - 活动完成）

| 序号 | 用例名称 | 执行状态 | 耗时 | 说明 |
|------|---------|---------|------|------|
| 1 | 转盘页面加载 | ✅ 执行（处理 CASH OUT） | ~11s | 检测到 reward_ready 状态 |
| 2 | 规则弹窗检测 | ⏭️ 跳过 | 0ms | 父用例已完成 |
| 3 | 领取奖励历史 | ⏭️ 跳过 | 0ms | 父用例已完成 |
| 4 | 邀请按钮 | ⏭️ 跳过 | 0ms | 父用例已完成 |
| 5 | 转盘旋转功能 | ⏭️ 跳过 | 0ms | 父用例已完成 |

**总耗时**: ~11秒

### 情况B-1（Cash everyday 页面 - 活动开始）

| 序号 | 用例名称 | 执行状态 | 耗时 | 说明 |
|------|---------|---------|------|------|
| 1 | 转盘页面加载 | ✅ 执行 | ~6s | 检测到 gift_selection 状态，选择礼物 |
| 2 | 规则弹窗检测 | ✅ 执行 | ~2s | 测试规则功能 |
| 3 | 领取奖励历史 | ✅ 执行 | ~2s | 测试历史功能 |
| 4 | 邀请按钮 | ✅ 执行 | ~2s | 测试邀请功能 |
| 5 | 转盘旋转功能 | ✅ 执行（包含 CASH OUT） | ~15s | 旋转并完成 CASH OUT |

**总耗时**: ~27秒

### 情况B-2（Invitation Wheel 页面 - 活动进行中）

| 序号 | 用例名称 | 执行状态 | 耗时 | 说明 |
|------|---------|---------|------|------|
| 1 | 转盘页面加载 | ✅ 执行 | ~5s | 检测到 wheel_active 状态 |
| 2 | 规则弹窗检测 | ✅ 执行 | ~2s | 测试规则功能 |
| 3 | 领取奖励历史 | ✅ 执行 | ~2s | 测试历史功能 |
| 4 | 邀请按钮 | ✅ 执行 | ~2s | 测试邀请功能 |
| 5 | 转盘旋转功能 | ✅ 执行（包含 CASH OUT） | ~15s | 旋转并完成 CASH OUT |

**总耗时**: ~26秒

## 相关文件

- `scenarios/turntable/turntable-cases.js` - 子用例注册和执行策略
- `scenarios/turntable/turntable-init.js` - 状态检测和初始化
- `scenarios/turntable/turntable-rotate.js` - 旋转和 CASH OUT 逻辑
- `scenarios/turntable/turntable-catchout.js` - CASH OUT 弹窗处理
- `src/core/TestModle.js` - 父用例完成后导航回首页

## 注意事项

1. **状态检测准确性**: 必须准确识别页面状态，避免误判
2. **标志清除**: 所有标志会在下一个父用例开始前自动清除
3. **日志完整性**: 即使跳过子用例，也会记录日志
4. **测试报告**: 跳过的子用例标记为"通过"（0ms）

## 未来优化

- [ ] 支持更多页面状态的识别
- [ ] 添加状态转换的日志记录
- [ ] 优化等待时间，使用智能等待
- [ ] 支持配置执行策略
