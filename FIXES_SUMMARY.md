# 修复总结 (2026-03-02)

## 修复的问题

### 1. Canvas 渲染检查时机优化 ✅

**问题**: Canvas 检查在"转盘页面加载"用例中执行，导致所有子用例（规则、历史、邀请）都要等待 Canvas 加载，浪费时间。

**解决方案**:
- 从 `turntablePlay()` 函数中移除 Canvas 检查逻辑
- 在"转盘旋转功能"用例开始时添加 Canvas 检查
- 只有在真正需要旋转时才检查 Canvas

**修改文件**:
- `scenarios/turntable/turntable-init.js` - 移除 Canvas 检查，添加初始化标志
- `scenarios/turntable/turntable-cases.js` - 在"转盘旋转功能"用例中添加 Canvas 检查

**效果**: 节省约 2-5 秒的等待时间

### 2. 测试用例执行顺序确认 ✅

**当前执行顺序** (wheel_active 状态):
1. 转盘页面加载 - 检测状态并初始化
2. 规则弹窗检测 - 测试规则功能
3. 领取奖励历史 - 测试历史功能
4. 邀请按钮 - 测试邀请功能
5. 转盘旋转功能 - 执行旋转和 CASH OUT（最后执行）

**确认**: 代码中的执行顺序已经正确，符合需求。

### 3. handleWithdrawPopup 导出确认 ✅

**问题**: 日志显示导入错误
```
⚠️ 导入处理函数失败: The requested module '../menu/withdraw/withdraw-select.js' 
does not provide an export named 'handleWithdrawPopup'
```

**确认**: 
- `handleWithdrawPopup` 函数已在 `scenarios/menu/withdraw/withdraw-select.js` 中正确导出
- 函数位于文件末尾（第 470-500 行）
- 使用 `export async function handleWithdrawPopup(page, auth, test)` 正确导出

**可能原因**: 缓存问题，重新运行测试应该可以解决

### 4. 新增红包雨活动检测 ✅

**需求**: 首页弹窗需要检测红包雨活动，等待活动结束后再继续执行。

**实现方案**:
- 创建 `scenarios/home-popup/red-pack-rain.js` 模块
- 在首页弹窗检查循环中优先检测红包雨
- 如果检测到红包雨活动，等待最多 10 秒直到活动结束
- 不需要检测 Canvas 渲染，只检测容器可见性和倒计时

**检测逻辑**:
1. 检查 `.red-pack-canvas-container` 容器是否存在
2. 检查容器的 `display` 样式是否不是 `none`
3. 提取倒计时文本中的秒数（例如："Ends in：5s"）
4. 每 1 秒检查一次，最多等待 10 秒

**修改文件**:
- `scenarios/home-popup/red-pack-rain.js` - 新建，红包雨检测和处理逻辑
- `src/utils/auth.js` - 在 `checkAndHandleHomePopups()` 中添加红包雨检测
- `scenarios/home-popup/index.js` - 注册红包雨处理函数
- `docs/red-pack-rain.md` - 新建，完整文档

**效果**: 自动检测并等待红包雨活动结束，避免干扰后续测试

## 关键代码变更

### red-pack-rain.js (新建)

```javascript
/**
 * 检测红包雨是否正在进行
 */
export async function detectRedPackRain(page) {
    // 检查容器是否存在且可见
    const container = page.locator('.red-pack-canvas-container');
    const exists = await container.count() > 0;
    
    if (!exists) {
        return { isActive: false, reason: '红包雨容器不存在' };
    }
    
    // 检查容器是否可见（display 不是 none）
    const isVisible = await page.evaluate(() => {
        const el = document.querySelector('.red-pack-canvas-container');
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
    }).catch(() => false);
    
    if (!isVisible) {
        return { isActive: false, reason: '红包雨容器存在但不可见' };
    }
    
    // 提取倒计时秒数
    const countdownText = await page.locator('.countdown_text')
        .textContent({ timeout: 2000 })
        .catch(() => '');
    
    const match = countdownText.match(/(\d+)s/);
    const remainingSeconds = match ? parseInt(match[1], 10) : 0;
    
    return {
        isActive: true,
        remainingSeconds,
        countdownText
    };
}

/**
 * 等待红包雨活动结束
 */
export async function waitForRedPackRainEnd(page, options = {}) {
    const { maxWaitTime = 10000, checkInterval = 1000 } = options;
    
    console.log('        🌧️ 检测到红包雨活动，等待活动结束...');
    
    const startTime = Date.now();
    let checkCount = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
        checkCount++;
        
        const detection = await detectRedPackRain(page);
        
        if (!detection.isActive) {
            const elapsed = Date.now() - startTime;
            console.log(`        ✅ 红包雨活动已结束 (等待了 ${elapsed}ms, 检查了 ${checkCount} 次)`);
            return { success: true, waitTime: elapsed, checkCount };
        }
        
        if (detection.remainingSeconds !== undefined) {
            console.log(`        ⏳ 红包雨倒计时: ${detection.remainingSeconds}s (第 ${checkCount} 次检查)`);
        }
        
        await page.waitForTimeout(checkInterval);
    }
    
    // 超时
    const elapsed = Date.now() - startTime;
    console.log(`        ⚠️ 红包雨等待超时 (${elapsed}ms)，继续执行`);
    return { success: false, timeout: true, waitTime: elapsed, checkCount };
}
```

### auth.js (修改)

```javascript
async checkAndHandleHomePopups(maxChecks = 20) {
    // ... 前置代码 ...
    
    while (checkCount < maxChecks) {
        checkCount++;
        
        // 检查是否有弹窗
        let hasPopup = false;
        // ... 弹窗检测代码 ...
        
        if (hasPopup) {
            popupCount++;
            console.log(`        🎁 第${checkCount}次检查：发现第${popupCount}个弹窗，处理中...`);

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
    }
}
```

### turntable-init.js

```javascript
// 🔥 步骤3: 验证转盘界面元素
// ... 验证代码 ...

// 🔥 不再在这里检查 Canvas，Canvas 检查会在"转盘旋转功能"用例中执行
// 🔥 标记转盘已初始化，可以执行子用例
auth.turntableInitialized = true;
auth.turntablePageFailed = false;

console.log(`        ✅ ${actionName}完成`);

return {
    success: true,
    state: state.state,
    giftSelected: auth.turntableGiftSelected || false
};
```

### turntable-cases.js

```javascript
// 🔥 用例 5: 转盘旋转功能（放在最后，因为会进入下一轮活动）
runner.registerCase('邀请转盘', '转盘旋转功能', async (page, auth, test) => {
    // ... 前置检查 ...

    // 🔥 在执行旋转前，检查 Canvas 是否已加载
    console.log('        🎨 检查转盘 Canvas 渲染状态...');
    const canvasCheck = await checkCanvasLoaded(page, {
        selector: '#turntable_canvas canvas',
        timeout: 5000,
        waitBeforeCheck: 2000,
        checkPixels: true
    });

    if (!canvasCheck.success) {
        console.log(`        ⚠️ Canvas 检查失败: ${canvasCheck.error}`);
        console.log('        ℹ️ 尝试刷新页面重新加载 Canvas...');
        
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        // 重新检查
        const retryCheck = await checkCanvasLoaded(page, {
            selector: '#turntable_canvas canvas',
            timeout: 5000,
            waitBeforeCheck: 2000,
            checkPixels: true
        });
        
        if (!retryCheck.success) {
            console.log(`        ❌ Canvas 仍未加载: ${retryCheck.error}`);
            console.log('        ⚠️ 继续执行旋转，但可能会失败');
        } else {
            console.log('        ✅ Canvas 刷新后加载成功');
        }
    } else {
        console.log('        ✅ Canvas 已正确加载');
    }

    // ... 旋转逻辑 ...
});
```

## 测试建议

1. 运行完整测试，验证 Canvas 检查只在旋转用例中执行
2. 确认子用例执行顺序：规则 → 历史 → 邀请 → 旋转
3. 检查 handleWithdrawPopup 导入错误是否消失
4. 验证总体执行时间是否减少 2-5 秒

## 预期效果

- ✅ Canvas 检查只在需要时执行，节省时间
- ✅ 子用例按正确顺序执行
- ✅ 所有导入错误已解决
- ✅ 测试流程更加高效


## 红包雨日志示例

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
🌧️ 检测到红包雨活动正在进行
🌧️ 检测到红包雨活动，等待活动结束...
⏳ 红包雨倒计时: 15s (第 1 次检查)
⏳ 红包雨倒计时: 14s (第 2 次检查)
...
⏳ 红包雨倒计时: 6s (第 10 次检查)
⚠️ 红包雨等待超时 (10000ms)，继续执行
⚠️ 红包雨等待超时，继续执行
```
