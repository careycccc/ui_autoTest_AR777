# 活动处理器实现指南

## 当前状态

### 已实现完整处理器的活动（3个）
1. **通知权限开启** - [`notification-permission.js`](../scenarios/activities/handlers/notification-permission.js)
2. **站内信** - [`notification.js`](../scenarios/activities/handlers/notification.js)
3. **超级大奖** - [`jackpot.js`](../scenarios/activities/handlers/jackpot.js)

### 只有框架代码的活动（13个）
以下活动的处理器只有框架代码，需要实现具体逻辑：

1. **每日签到** - [`daily-signin.js`](../scenarios/activities/handlers/daily-signin.js)
2. **充值活动** - [`recharge.js`](../scenarios/activities/handlers/recharge.js)
3. **VIP特权** - [`vip.js`](../scenarios/activities/handlers/vip.js)
4. **邀请好友** - [`invite.js`](../scenarios/activities/handlers/invite.js)
5. **转盘抽奖** - [`turntable.js`](../scenarios/activities/handlers/turntable.js)
6. **救援金** - [`rescue.js`](../scenarios/activities/handlers/rescue.js)
7. **优惠券** - [`coupon.js`](../scenarios/activities/handlers/coupon.js)
8. **返水活动** - [`rebate.js`](../scenarios/activities/handlers/rebate.js)
9. **任务中心** - [`task.js`](../scenarios/activities/handlers/task.js)
10. **锦标赛** - [`championship.js`](../scenarios/activities/handlers/championship.js)
11. **周卡月卡** - [`membership-card.js`](../scenarios/activities/handlers/membership-card.js)
12. **充值转盘** - [`deposit-wheel.js`](../scenarios/activities/handlers/deposit-wheel.js)
13. **新版返佣** - [`commission.js`](../scenarios/activities/handlers/commission.js)
14. **提现活动** - [`withdraw.js`](../scenarios/activities/handlers/withdraw.js)

## 处理器实现模板

### 基础模板（仅验证页面）

```javascript
/**
 * [活动名称]活动处理器
 * 包含[活动名称]的所有处理逻辑
 */

/**
 * [活动名称]活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handle[ActivityName](page, test) {
    console.log('      🎯 处理[活动名称]活动...');

    try {
        // 1. 检查是否在[活动名称]页面
        const isOnPage = await page.locator('[页面选择器]').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在[活动名称]页面' };
        }

        // 2. TODO: 添加[活动名称]的具体处理逻辑
        // 例如：检查状态、点击按钮、填写表单等
        console.log('      ✅ [活动名称]页面验证完成');

        await page.waitForTimeout(1000);

        return { success: true, activityName: '[活动名称]' };

    } catch (error) {
        console.log(`      ❌ [活动名称]处理失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}
```

### 完整模板（包含交互逻辑）

```javascript
/**
 * [活动名称]活动处理器
 * 包含[活动名称]的所有处理逻辑
 */

/**
 * [活动名称]活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handle[ActivityName](page, test) {
    console.log('      🎯 处理[活动名称]活动...');

    try {
        // 1. 检查是否在[活动名称]页面
        const isOnPage = await page.locator('[页面选择器]').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在[活动名称]页面' };
        }

        // 2. 检查活动状态
        const statusElement = await page.locator('[状态选择器]').first();
        const statusText = await statusElement.textContent().catch(() => '');
        
        console.log(`      📊 当前状态: ${statusText}`);

        // 3. 根据状态执行不同操作
        if (statusText.includes('可领取') || statusText.includes('Claim')) {
            // 点击领取按钮
            const claimButton = page.locator('[领取按钮选择器]').first();
            const isClickable = await claimButton.isEnabled().catch(() => false);
            
            if (isClickable) {
                console.log('      👆 点击领取按钮...');
                await claimButton.click();
                await page.waitForTimeout(2000);
                
                // 检查是否出现成功提示
                const successMessage = await page.locator('[成功提示选择器]').first()
                    .isVisible({ timeout: 3000 })
                    .catch(() => false);
                
                if (successMessage) {
                    console.log('      ✅ 领取成功');
                    return { success: true, activityName: '[活动名称]', action: '领取' };
                }
            }
        } else if (statusText.includes('已领取') || statusText.includes('Claimed')) {
            console.log('      ℹ️ 已经领取过');
            return { success: true, activityName: '[活动名称]', action: '已领取' };
        } else if (statusText.includes('未满足') || statusText.includes('Not eligible')) {
            console.log('      ℹ️ 未满足领取条件');
            return { success: true, activityName: '[活动名称]', action: '未满足条件' };
        }

        // 4. 默认返回成功（页面验证通过）
        console.log('      ✅ [活动名称]页面验证完成');
        await page.waitForTimeout(1000);

        return { success: true, activityName: '[活动名称]' };

    } catch (error) {
        console.log(`      ❌ [活动名称]处理失败: ${error.message}`);
        await test.captureScreenshot('[activity-name]-error');
        return { success: false, error: error.message };
    }
}
```

## 实现步骤

### 步骤1：分析活动页面
1. 手动访问活动页面
2. 使用浏览器开发者工具查看页面结构
3. 确定关键元素的选择器：
   - 页面容器选择器
   - 状态显示选择器
   - 操作按钮选择器
   - 成功/失败提示选择器

### 步骤2：实现基础验证
1. 检查是否在正确的页面
2. 验证页面元素是否存在
3. 返回成功结果

### 步骤3：添加交互逻辑（可选）
1. 检查活动状态
2. 根据状态执行相应操作
3. 验证操作结果
4. 处理异常情况

### 步骤4：测试验证
1. 运行测试用例
2. 检查日志输出
3. 查看截图（如果有错误）
4. 调整选择器和逻辑

## 示例：每日签到处理器实现

```javascript
/**
 * 每日签到活动处理器
 * 包含每日签到的所有处理逻辑
 */

/**
 * 每日签到活动主处理函数
 * @param {Object} page - Playwright page 对象
 * @param {Object} test - TestCase 实例
 * @returns {Promise<Object>} 处理结果
 */
export async function handleDailySignIn(page, test) {
    console.log('      🎯 处理每日签到活动...');

    try {
        // 1. 检查是否在每日签到页面
        const isOnPage = await page.locator('.daily-signin, .daily-deposit').first()
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (!isOnPage) {
            return { success: false, reason: '不在每日签到页面' };
        }

        // 2. 查找签到按钮
        const signInButton = page.locator('.signin-btn, .claim-btn, button:has-text("签到"), button:has-text("Sign In")').first();
        const isButtonVisible = await signInButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (isButtonVisible) {
            // 3. 检查按钮状态
            const isClickable = await signInButton.isEnabled().catch(() => false);
            const buttonText = await signInButton.textContent().catch(() => '');

            console.log(`      📊 按钮状态: ${buttonText}`);

            if (isClickable && !buttonText.includes('已签到') && !buttonText.includes('Signed')) {
                // 4. 点击签到按钮
                console.log('      👆 点击签到按钮...');
                await signInButton.click();
                await page.waitForTimeout(2000);

                // 5. 检查是否出现成功提示
                const successMessage = await page.locator('.success-message, .toast, [class*="success"]').first()
                    .isVisible({ timeout: 3000 })
                    .catch(() => false);

                if (successMessage) {
                    console.log('      ✅ 签到成功');
                    return { success: true, activityName: '每日签到', action: '签到' };
                }
            } else {
                console.log('      ℹ️ 已经签到过或按钮不可点击');
                return { success: true, activityName: '每日签到', action: '已签到' };
            }
        }

        // 6. 默认返回成功（页面验证通过）
        console.log('      ✅ 每日签到页面验证完成');
        await page.waitForTimeout(1000);

        return { success: true, activityName: '每日签到' };

    } catch (error) {
        console.log(`      ❌ 每日签到处理失败: ${error.message}`);
        await test.captureScreenshot('daily-signin-error');
        return { success: false, error: error.message };
    }
}
```

## 注意事项

1. **选择器稳定性**：使用稳定的选择器，避免使用动态生成的类名
2. **等待时间**：合理设置等待时间，确保页面加载完成
3. **错误处理**：捕获所有可能的异常，避免测试中断
4. **日志输出**：输出详细的日志，便于调试
5. **截图保存**：在错误时保存截图，便于分析问题
6. **返回值**：统一返回格式，包含 success、activityName、action 等字段

## 测试建议

1. **分步测试**：先实现基础验证，测试通过后再添加交互逻辑
2. **多场景测试**：测试不同状态下的行为（可领取、已领取、未满足条件等）
3. **异常测试**：测试网络异常、元素不存在等异常情况
4. **回归测试**：修改代码后重新测试所有活动

## 相关文档

- [活动系统总结](./ACTIVITY_SYSTEM_SUMMARY.md)
- [活动配置池指南](./activity-pool-guide.md)
- [活动点击处理示例](./handleActivityClick-examples.md)
