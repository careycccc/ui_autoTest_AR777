# 失败处理机制

## 概述

项目中所有返回 `false` 的失败场景现在都会自动截图，方便调试和问题追踪。

## 核心函数

### `handleFailure(test, errorMessage, options)`

位置：`scenarios/utils.js`

自动处理失败场景：
- 打印错误信息
- 自动截图（如果页面未关闭）
- 将截图添加到测试报告
- 可选择抛出异常或返回 false

**参数：**
- `test` - TestCase 实例
- `errorMessage` - 错误描述
- `options.screenshot` - 是否截图（默认 true）
- `options.throwError` - 是否抛出异常（默认 false）

**返回值：** `false`

## 使用示例

### 基本用法

```javascript
import { handleFailure } from '../utils.js';

export async function myFunction(page, test) {
    try {
        // 检查页面是否关闭
        if (!page || page.isClosed()) {
            return await handleFailure(test, '页面已关闭');
        }

        // 检查元素是否可见
        const element = page.locator('.my-element');
        const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (!isVisible) {
            return await handleFailure(test, '元素不可见');
        }

        // 正常逻辑
        await element.click();
        return true;

    } catch (error) {
        // 捕获异常并截图
        return await handleFailure(test, `操作失败: ${error.message}`, { throwError: true });
    }
}
```

### 不截图的场景

```javascript
// 页面已关闭时不需要截图
if (!page || page.isClosed()) {
    return await handleFailure(test, '页面已关闭', { screenshot: false });
}
```

### 抛出异常

```javascript
// 严重错误需要抛出异常
if (criticalError) {
    return await handleFailure(test, '严重错误', { throwError: true });
}
```

## 改进前后对比

### 改进前
```javascript
if (!isVisible) {
    console.log('        ❌ 元素不可见');
    return false;  // ❌ 没有截图
}
```

### 改进后
```javascript
if (!isVisible) {
    return await handleFailure(test, '元素不可见');  // ✅ 自动截图
}
```

## 测试报告

所有通过 `handleFailure` 截取的错误截图会：
1. 自动添加到当前页面记录
2. 在 HTML 报告中显示
3. 标记为错误截图（`isError: true`）
4. 包含错误信息作为截图名称

## 注意事项

1. **必须传入 test 实例** - `handleFailure` 需要 test 对象来截图
2. **页面关闭时不截图** - 自动检测页面状态，避免截图失败
3. **使用 await** - `handleFailure` 是异步函数，必须使用 await
4. **错误信息要清晰** - 错误信息会显示在报告中，要描述清楚

## 相关文件

- `scenarios/utils.js` - handleFailure 函数定义
- `scenarios/earn/earn.js` - 使用示例
- `src/utils/errorHandler.js` - 备用的错误处理工具（更完整的功能）
