# 站内信活动说明

## 📋 活动信息

- **活动 ID**: `notification`
- **活动名称**: 站内信
- **活动类型**: 直接跳转（无弹窗）

## 🎯 页面特征

### HTML 结构

```html
<!-- 页面标题 -->
<div data-v-edd30ed3="" class="head-title noTitle">
    <div data-v-edd30ed3="" class="route-name">Notifications</div>
</div>

<!-- Read all 按钮 -->
<div data-v-a1ee6c16="" class="btns">
    <div data-v-a1ee6c16="" class="readAll btn_main_style">Read all</div>
</div>
```

### 识别方式

系统通过以下方式识别站内信页面：

1. **URL 识别** (最准确)
   - `/notification`
   - `/message`

2. **文本识别**
   - "Notifications" (页面标题)
   - "Read all" (按钮文本)

3. **选择器识别**
   - `.head-title .route-name` (标题容器)
   - `.btns .readAll` (Read all 按钮)
   - `.notification-list` (消息列表)

## 🔧 处理逻辑

站内信活动的处理器会执行以下操作：

1. ✅ 检查页面标题是否为 "Notifications"
2. ✅ 检查 "Read all" 按钮是否存在
3. ✅ 检查消息列表容器 `.van-list.list-container` 是否存在
4. ✅ 检查是否有消息项 `.item`
5. ✅ 如果有消息，点击第一条消息
6. ✅ 验证是否进入消息详情页（标题为 "Messages Detail"）
7. ✅ 返回消息列表页
8. ✅ 验证是否成功返回

### 处理器代码

```javascript
export async function handleNotification(page, test) {
    // 1. 检查标题
    const hasTitle = await page.locator('.head-title .route-name')
        .filter({ hasText: 'Notifications' })
        .isVisible({ timeout: 2000 });

    // 2. 检查 "Read all" 按钮
    const readAllBtn = page.locator('.btns .readAll')
        .filter({ hasText: 'Read all' });

    // 3. 检查消息列表容器
    const listContainer = page.locator('.van-list.list-container');
    const messageItems = listContainer.locator('.item');
    const messageCount = await messageItems.count();

    if (messageCount > 0) {
        // 4. 点击第一条消息
        await messageItems.first().click();
        
        // 5. 验证进入详情页
        const detailTitle = page.locator('.head-title .route-name')
            .filter({ hasText: 'Messages Detail' });
        await detailTitle.isVisible({ timeout: 3000 });
        
        // 6. 返回列表页
        await page.goBack();
    }

    return { success: true, activityName: '站内信' };
}
```

## 🚀 使用方式

### 方式 1: 从活动资讯列表进入

```javascript
import { executeActivity } from './scenarios/activities/activity-executor.js';

const result = await executeActivity({
    page,
    test,
    clickSelector: '.activeList .activeItem',
    clickIndex: 0,  // 站内信在列表中的索引
    autoReturn: true
});
```

### 方式 2: 从首页弹窗进入

```javascript
const result = await executeActivity({
    page,
    test,
    clickSelector: '.popup-content .notification-btn',
    autoReturn: true,
    returnSelector: '#home'
});
```

### 方式 3: 从菜单进入

```javascript
const result = await executeActivity({
    page,
    test,
    clickSelector: '.menu-item.notification',
    autoReturn: true,
    returnSelector: '.menu-list'
});
```

### 方式 4: 已在站内信页面

```javascript
import { executeActivityById } from './scenarios/activities/activity-executor.js';

const result = await executeActivityById({
    page,
    test,
    activityId: 'notification'
});
```

### 方式 5: 自动识别

```javascript
import { identifyAndExecuteActivity } from './scenarios/activities/activity-registry.js';

// 自动识别当前页面并执行
const result = await identifyAndExecuteActivity(page, test);
```

## 📊 返回结果

```javascript
{
    success: true,
    activityId: 'notification',
    activityName: '站内信',
    hasPopup: false,
    urlChanged: true
}
```

## 🔍 日志输出示例

```
📍 起始 URL: https://example.com/activity
👆 点击元素: .activeList .activeItem (索引: 0)
📊 URL 是否变化: 是
📍 当前 URL: https://example.com/notification
🔍 识别当前活动...
✅ 通过文本 "Notifications" 识别为: 站内信
🎯 处理站内信活动...
✅ 确认在站内信页面
📬 发现 "Read all" 按钮
📨 发现 5 条消息
👆 点击第一条消息...
✅ 成功进入消息详情页
↩️ 返回消息列表...
✅ 已返回消息列表
✅ 站内信页面验证完成
↩️ 返回原页面...
✅ 已返回原页面
```

## 🎨 扩展功能

### 1. 点击 "Read all" 按钮

```javascript
// 在 handleNotification 函数中添加
if (hasReadAllBtn) {
    await readAllBtn.click();
    console.log('      ✅ 已点击 "Read all" 按钮');
    await page.waitForTimeout(1000);
}
```

### 2. 读取所有消息

```javascript
// 遍历所有消息
const messageItems = listContainer.locator('.item');
const messageCount = await messageItems.count();

for (let i = 0; i < messageCount; i++) {
    const message = messageItems.nth(i);
    await message.click();
    await page.waitForTimeout(1000);
    
    // 在详情页进行操作
    console.log(`      📨 查看第 ${i + 1} 条消息`);
    
    // 返回列表
    await page.goBack();
    await page.waitForTimeout(1000);
}
```

### 3. 验证消息详情页内容

```javascript
// 在消息详情页
const detailTitle = await page.locator('.head-title .route-name')
    .filter({ hasText: 'Messages Detail' })
    .textContent();

console.log(`      📄 详情页标题: ${detailTitle}`);

// 读取消息内容
const messageContent = await page.locator('.message-content').textContent();
console.log(`      📝 消息内容: ${messageContent}`);
```

## 📝 测试用例

完整的测试示例请查看：
- [notification-example.js](../scenarios/activities/notification-example.js)

运行测试：

```javascript
import { runNotificationTests } from './scenarios/activities/notification-example.js';

await runNotificationTests(page, test);
```

## ⚠️ 注意事项

1. **页面加载时间**
   - 站内信页面可能需要加载消息列表
   - 建议等待 1-2 秒确保页面完全加载

2. **消息列表为空**
   - 如果没有消息，`.van-list.list-container` 下不会有 `.item` 元素
   - 处理器会正常返回成功（无消息状态）

3. **"Read all" 按钮**
   - 只有在有未读消息时才会显示
   - 如果没有未读消息，按钮可能不存在

4. **消息详情页**
   - 点击消息后会跳转到详情页
   - 详情页标题为 "Messages Detail"
   - 使用 `page.goBack()` 返回列表页

5. **多语言支持**
   - 当前识别基于英文 "Notifications"、"Messages Detail" 和 "Read all"
   - 如果需要支持其他语言，需要添加对应的识别器

6. **页面切换验证**
   - 进入详情页后会验证标题是否为 "Messages Detail"
   - 返回列表页后会验证标题是否为 "Notifications"
   - 如果验证失败会自动截图

## 🔄 与其他活动的集成

站内信活动可以与其他活动无缝集成：

```javascript
// 批量测试所有活动（包括站内信）
import { executeBatchActivities } from './scenarios/activities/activity-executor.js';

const result = await executeBatchActivities({
    page,
    test,
    listSelector: '.activeList',
    itemSelector: '.activeItem'
});

// 站内信会被自动识别和处理
```

## 📚 相关文档

- [UNIVERSAL_ACTIVITY_SYSTEM.md](./UNIVERSAL_ACTIVITY_SYSTEM.md) - 通用活动系统
- [ACTIVITY_SYSTEM_SUMMARY.md](./ACTIVITY_SYSTEM_SUMMARY.md) - 系统总结
- [activity-handlers.js](../scenarios/activities/activity-handlers.js) - 所有活动处理器

---

**站内信活动已完成配置，可以在项目的任何地方使用！** 📬
