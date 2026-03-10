# handleActivityClick 函数使用示例

## 函数说明

`handleActivityClick` 是一个通用的活动点击处理函数，用于自动化处理活动列表中的点击、弹窗、页面跳转和返回操作。

## 基本参数

```javascript
await handleActivityClick({
    page,           // Playwright page 对象（必需）
    test,           // TestCase 实例（必需）
    index,          // 活动索引，从 0 开始（必需）
    activitySelector,  // 活动元素选择器（可选，默认 '.activeList .activeItem'）
    popup,          // 弹窗配置（可选）
    targetPage,     // 目标页面配置（必需）
    returnPageName, // 返回的父页面名称（可选，默认 '活动资讯页'）
    returnWaitForSelector  // 返回页面等待的选择器（可选，默认 '.activeList'）
});
```

---

## 示例 1: 最简单的使用（无弹窗，直接跳转）

```javascript
// 点击第一个活动，直接跳转到活动详情页
await handleActivityClick({
    page,
    test,
    index: 0,  // 第一个活动
    targetPage: {
        name: '每日签到页',
        waitForSelector: '.daily-signin',  // 等待这个元素出现
        waitTime: 1000
    }
});
```

---

## 示例 2: 有弹窗的情况

```javascript
// 点击活动后会弹出确认弹窗，需要点击弹窗中的按钮才能跳转
await handleActivityClick({
    page,
    test,
    index: 1,  // 第二个活动
    popup: {
        containerSelector: '.popup-container',  // 弹窗容器选择器
        clickSelector: '.confirm-btn',          // 弹窗中需要点击的按钮
        timeout: 3000                           // 等待弹窗出现的超时时间
    },
    targetPage: {
        name: '充值页',
        waitForSelector: '.recharge-page',
        waitForUrl: '/recharge',  // 也可以通过 URL 判断
        waitTime: 1000
    }
});
```

---

## 示例 3: 自定义活动选择器

```javascript
// 如果活动元素不是默认的 '.activeList .activeItem'
await handleActivityClick({
    page,
    test,
    index: 0,
    activitySelector: '.promo-list .promo-item',  // 自定义选择器
    targetPage: {
        name: '活动详情页',
        waitForSelector: '.activity-detail',
        waitTime: 1000
    }
});
```

---

## 示例 4: 自定义返回页面

```javascript
// 从子活动返回到特定的父页面
await handleActivityClick({
    page,
    test,
    index: 2,
    targetPage: {
        name: '优惠券页',
        waitForSelector: '.coupon-list',
        waitTime: 1000
    },
    returnPageName: '我的优惠券页',           // 自定义返回页面名称
    returnWaitForSelector: '.my-coupons'     // 自定义返回页面等待选择器
});
```

---

## 示例 5: 批量处理多个活动

```javascript
export async function verifyAllActivities(page, auth, test) {
    // 获取活动总数
    const activityCount = await page.locator('.activeList .activeItem').count();
    console.log(`总共有 ${activityCount} 个活动`);

    // 定义每个活动的配置
    const activityConfigs = [
        // 活动 0: 每日签到
        {
            targetPage: {
                name: '每日签到页',
                waitForSelector: '.daily-signin',
                waitTime: 1000
            },
            popup: null  // 无弹窗
        },
        
        // 活动 1: 充值活动（有弹窗）
        {
            targetPage: {
                name: '充值页',
                waitForSelector: '.recharge-page',
                waitForUrl: '/recharge',
                waitTime: 1000
            },
            popup: {
                containerSelector: '.popup-container',
                clickSelector: '.confirm-btn',
                timeout: 3000
            }
        },
        
        // 活动 2: VIP 特权
        {
            targetPage: {
                name: 'VIP页',
                waitForSelector: '.vip-level',
                waitTime: 1000
            },
            popup: null
        },
        
        // 活动 3: 邀请好友（有弹窗）
        {
            targetPage: {
                name: '邀请页',
                waitForSelector: '.invite-code',
                waitTime: 1000
            },
            popup: {
                containerSelector: '.modal',
                clickSelector: '.modal-confirm',
                timeout: 2000
            }
        }
    ];

    // 遍历所有活动
    for (let i = 0; i < activityCount; i++) {
        try {
            console.log(`\n处理活动 ${i + 1}/${activityCount}`);

            // 获取配置（如果没有配置则使用默认）
            const config = activityConfigs[i] || {
                targetPage: {
                    name: `活动详情页-${i}`,
                    waitForSelector: '.activity-detail',
                    waitTime: 1000
                },
                popup: {
                    containerSelector: '.popup-container',
                    clickSelector: 'button',
                    timeout: 2000
                }
            };

            // 调用 handleActivityClick
            await handleActivityClick({
                page,
                test,
                index: i,
                ...config  // 展开配置
            });

            console.log(`✅ 活动 ${i + 1} 处理成功`);

        } catch (error) {
            console.error(`❌ 活动 ${i + 1} 处理失败: ${error.message}`);
            // 继续处理下一个活动
        }
    }
}
```

---

## 示例 6: 处理特殊情况（URL 跳转判断）

```javascript
// 有些活动可能通过 URL 变化来判断是否跳转成功
await handleActivityClick({
    page,
    test,
    index: 5,
    targetPage: {
        name: '活动详情页',
        waitForUrl: '/activity/detail',  // 通过 URL 包含的字符串判断
        waitTime: 1500
    }
});
```

---

## 示例 7: 同时使用选择器和 URL 判断

```javascript
// 更严格的判断：既要等待元素出现，又要验证 URL
await handleActivityClick({
    page,
    test,
    index: 3,
    targetPage: {
        name: '转盘活动页',
        waitForSelector: '.turntable-container',  // 等待转盘容器
        waitForUrl: '/turntable',                 // 同时验证 URL
        waitTime: 1000
    }
});
```

---

## 示例 8: 处理复杂弹窗（多步骤）

```javascript
// 如果弹窗中有多个按钮，需要点击特定的按钮
await handleActivityClick({
    page,
    test,
    index: 4,
    popup: {
        containerSelector: '.activity-popup',
        clickSelector: '.popup-content .confirm-button',  // 精确定位按钮
        timeout: 3000
    },
    targetPage: {
        name: '活动规则页',
        waitForSelector: '.rules-content',
        waitTime: 1000
    }
});
```

---

## 完整的实际使用案例

```javascript
// scenarios/promo/promo.js

export async function verifyPromotionActivities(page, auth, test) {
    console.log('开始验证促销活动...');

    // 获取活动数量
    const count = await page.locator('.activeList .activeItem').count();
    console.log(`发现 ${count} 个活动`);

    // 活动 1: 每日签到（无弹窗）
    await handleActivityClick({
        page,
        test,
        index: 0,
        targetPage: {
            name: '每日签到页',
            waitForSelector: '.daily-signin-title',
            waitTime: 1000
        }
    });

    // 活动 2: 首充优惠（有弹窗）
    await handleActivityClick({
        page,
        test,
        index: 1,
        popup: {
            containerSelector: '.first-deposit-popup',
            clickSelector: '.go-deposit-btn',
            timeout: 3000
        },
        targetPage: {
            name: '充值页',
            waitForSelector: '.deposit-amount-input',
            waitForUrl: '/deposit',
            waitTime: 1500
        }
    });

    // 活动 3: VIP 升级（无弹窗）
    await handleActivityClick({
        page,
        test,
        index: 2,
        targetPage: {
            name: 'VIP页',
            waitForSelector: '.vip-benefits',
            waitTime: 1000
        }
    });

    console.log('所有活动验证完成！');
}
```

---

## 错误处理

函数内部已经包含了错误处理，会自动：
1. 截图保存错误现场
2. 抛出详细的错误信息
3. 记录错误日志

```javascript
try {
    await handleActivityClick({
        page,
        test,
        index: 0,
        targetPage: {
            name: '活动页',
            waitForSelector: '.activity',
            waitTime: 1000
        }
    });
} catch (error) {
    console.error(`处理失败: ${error.message}`);
    // 错误截图会自动保存为 activity-0-error.png
}
```

---

## 注意事项

1. **index 从 0 开始**：第一个活动是 index: 0，第二个是 index: 1
2. **popup 可以为 null**：如果活动没有弹窗，设置 `popup: null` 或不传
3. **targetPage 必须提供**：至少要有 name 和 waitForSelector 或 waitForUrl
4. **自动返回**：函数会自动返回到活动列表页，无需手动处理
5. **错误截图**：失败时会自动截图，文件名格式为 `activity-{index}-error.png`

---

## 调试技巧

如果活动点击失败，检查日志输出：
- `👆 点击活动 #X` - 确认点击了正确的活动
- `✅ 检测到弹窗` 或 `ℹ️ 未检测到弹窗` - 确认弹窗检测是否正确
- `🔄 从弹窗切换到目标页面` 或 `🔄 直接切换到目标页面` - 确认跳转路径
- `❌ 活动 #X 未匹配到对应的页面` - 说明 targetPage 配置不正确

根据日志调整配置即可。
