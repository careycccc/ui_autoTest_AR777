# 红包雨活动处理

## 概述

红包雨是首页的一个特殊弹窗活动，当活动进行时需要等待活动结束后才能继续执行其他操作。

## HTML 结构

```html
<div data-v-996a8234="" data-v-8ba94d33="" class="red-pack-canvas-container" style="display: none;">
    <div data-v-996a8234="" class="countdown_clock">
        <div data-v-996a8234="" class="clock_inner">
            <img data-v-996a8234="" src="/images/red_pack_clock-DXEPZHRX.webp" alt="">
            <span data-v-996a8234="" class="countdown_text">Ends in：0s</span>
        </div>
    </div>
    <canvas data-v-996a8234="" class="red-pack-canvas" width="938" height="905" style="width: 938px; height: 905px;"></canvas>
</div>
```

## 检测逻辑

### 1. 容器检测
- 选择器：`.red-pack-canvas-container`
- 检查容器是否存在
- 检查容器的 `display` 样式是否不是 `none`

### 2. 倒计时检测
- 选择器：`.countdown_text`
- 提取倒计时文本中的秒数（例如："Ends in：5s" → 5）
- 用于显示剩余时间

### 3. Canvas 说明
- 红包雨容器内包含 Canvas 元素（`.red-pack-canvas`）
- 但不需要检测 Canvas 的渲染状态
- 只需要检测容器的可见性和倒计时

## 处理流程

```
检测到首页弹窗
  ↓
检查是否是红包雨活动
  ├─ 检查 .red-pack-canvas-container 是否存在
  ├─ 检查容器是否可见（display !== 'none'）
  └─ 检查倒计时文本
  ↓
如果是红包雨活动
  ├─ 显示日志：🌧️ 检测到红包雨活动
  ├─ 循环检查活动状态（每 1 秒检查一次）
  ├─ 显示倒计时：⏳ 红包雨倒计时: Xs
  └─ 最多等待 10 秒
  ↓
活动结束或超时
  ├─ 成功：✅ 红包雨活动已结束
  └─ 超时：⚠️ 红包雨等待超时，继续执行
  ↓
继续检查其他弹窗
```

## 集成位置

### 1. 首页弹窗检查循环（src/utils/auth.js）

在 `checkAndHandleHomePopups()` 函数中，检测到弹窗后：

```javascript
if (hasPopup) {
    // 🔥 优先检查是否是红包雨活动
    const { detectRedPackRain, waitForRedPackRainEnd } = await import('../../scenarios/home-popup/red-pack-rain.js');
    const redPackDetection = await detectRedPackRain(this.page);
    
    if (redPackDetection.isActive) {
        console.log(`        🌧️ 检测到红包雨活动正在进行`);
        const waitResult = await waitForRedPackRainEnd(this.page, {
            maxWaitTime: 10000,
            checkInterval: 1000
        });
        
        if (waitResult.success) {
            console.log(`        ✅ 红包雨活动已结束，继续检查其他弹窗`);
        } else {
            console.log(`        ⚠️ 红包雨等待超时，继续执行`);
        }
        
        // 红包雨结束后继续检查是否还有其他弹窗
        await this.safeWait(1000);
        continue;
    }
    
    // 处理其他类型的弹窗...
}
```

### 2. 弹窗处理器注册（scenarios/home-popup/index.js）

```javascript
import { handleRedPackRainPopup } from './red-pack-rain.js';

const handlers = {
    'Red Pack Rain': handleRedPackRainPopup,
    // ... 其他处理器
};
```

## API 说明

### detectRedPackRain(page)

检测红包雨是否正在进行。

**参数**:
- `page` - Playwright page 对象

**返回值**:
```javascript
{
    isActive: boolean,           // 是否正在进行
    remainingSeconds: number,    // 剩余秒数（如果可以提取）
    countdownText: string,       // 倒计时文本
    reason: string              // 不活跃的原因（如果 isActive 为 false）
}
```

### waitForRedPackRainEnd(page, options)

等待红包雨活动结束。

**参数**:
- `page` - Playwright page 对象
- `options` - 配置选项
  - `maxWaitTime` - 最大等待时间（毫秒），默认 10000ms (10秒)
  - `checkInterval` - 检查间隔（毫秒），默认 1000ms

**返回值**:
```javascript
{
    success: boolean,      // 是否成功等待到结束
    timeout: boolean,      // 是否超时（仅在失败时）
    waitTime: number,      // 实际等待时间（毫秒）
    checkCount: number,    // 检查次数
    reason: string        // 结束原因
}
```

### handleRedPackRainPopup(page, auth, test)

处理红包雨弹窗（首页弹窗处理函数）。

**参数**:
- `page` - Playwright page 对象
- `auth` - auth 对象
- `test` - TestCase 实例

**返回值**:
```javascript
{
    success: boolean,      // 是否成功处理
    skipped: boolean,      // 是否跳过（红包雨未激活）
    timeout: boolean,      // 是否超时
    waitTime: number,      // 等待时间
    checkCount: number,    // 检查次数
    reason: string        // 处理结果说明
}
```

## 配置选项

### 等待时间

默认等待时间为 10 秒，可以通过修改 `waitForRedPackRainEnd()` 的 `maxWaitTime` 参数调整：

```javascript
const waitResult = await waitForRedPackRainEnd(page, {
    maxWaitTime: 15000,  // 等待 15 秒
    checkInterval: 1000
});
```

### 检查间隔

默认每 1 秒检查一次，可以通过 `checkInterval` 参数调整：

```javascript
const waitResult = await waitForRedPackRainEnd(page, {
    maxWaitTime: 10000,
    checkInterval: 500  // 每 0.5 秒检查一次
});
```

## 日志示例

### 成功场景

```
🔍 开始检查首页弹窗（最多 20 次）...
✓ 通过选择器 ".popup-content" 检测到弹窗
🎁 第1次检查：发现第1个弹窗，处理中...
🌧️ 检测到红包雨活动正在进行
🌧️ 检测到红包雨活动，等待活动结束...
⏳ 红包雨倒计时: 5s (第 1 次检查)
⏳ 红包雨倒计时: 4s (第 2 次检查)
⏳ 红包雨倒计时: 3s (第 3 次检查)
⏳ 红包雨倒计时: 2s (第 4 次检查)
⏳ 红包雨倒计时: 1s (第 5 次检查)
⏳ 红包雨倒计时: 0s (第 6 次检查)
✅ 红包雨活动已结束 (等待了 6234ms, 检查了 6 次)
✅ 红包雨活动已结束，继续检查其他弹窗
✅ 第2次检查：无弹窗
📊 弹窗检查完成：共处理 1 个弹窗
```

### 超时场景

```
🔍 开始检查首页弹窗（最多 20 次）...
✓ 通过选择器 ".popup-content" 检测到弹窗
🎁 第1次检查：发现第1个弹窗，处理中...
🌧️ 检测到红包雨活动正在进行
🌧️ 检测到红包雨活动，等待活动结束...
⏳ 红包雨倒计时: 15s (第 1 次检查)
⏳ 红包雨倒计时: 14s (第 2 次检查)
...
⏳ 红包雨倒计时: 6s (第 10 次检查)
⚠️ 红包雨等待超时 (10000ms)，继续执行
⚠️ 红包雨等待超时，继续执行
✅ 第2次检查：无弹窗
📊 弹窗检查完成：共处理 1 个弹窗
```

### 未激活场景

```
🔍 开始检查首页弹窗（最多 20 次）...
✓ 通过选择器 ".popup-content" 检测到弹窗
🎁 第1次检查：发现第1个弹窗，处理中...
ℹ️ 红包雨未激活: 红包雨容器不存在
📋 使用配置数据处理弹窗 1/2
...
```

## 注意事项

1. **优先级**: 红包雨检测在所有弹窗处理之前执行，确保不会被其他弹窗处理逻辑干扰
2. **Canvas**: 虽然红包雨容器内有 Canvas 元素，但不需要检测 Canvas 的渲染状态
3. **超时处理**: 如果等待超时，不会抛出错误，而是继续执行后续流程
4. **循环检查**: 红包雨结束后会继续检查是否还有其他弹窗
5. **倒计时显示**: 如果能提取到倒计时秒数，会在日志中显示

## 相关文件

- `scenarios/home-popup/red-pack-rain.js` - 红包雨检测和处理逻辑
- `src/utils/auth.js` - 首页弹窗检查循环（集成红包雨检测）
- `scenarios/home-popup/index.js` - 弹窗处理器注册

## 未来优化

- [ ] 支持动态配置等待时间
- [ ] 添加红包雨活动的点击交互（如果需要）
- [ ] 支持红包雨活动的统计（收集了多少红包）
- [ ] 优化倒计时提取逻辑，支持更多格式
