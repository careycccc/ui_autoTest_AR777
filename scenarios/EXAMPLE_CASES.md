# 如何添加新的子用例

## 文件结构

```
scenarios/
├── index.js                    # 统一注册入口
├── promo/
│   ├── promo.js               # 活动资讯业务逻辑
│   └── promo-cases.js         # 活动资讯子用例注册
├── earn/
│   ├── earn.js                # 新版返佣业务逻辑
│   └── earn-cases.js          # 新版返佣子用例注册
├── menu/
│   └── menu-cases.js          # 菜单子用例注册
├── turntable/
│   └── turntable-cases.js     # 邀请转盘子用例注册
└── home/
    └── home-cases.js          # 首页子用例注册
```

## 添加新子用例的步骤

### 1. 在对应大类的 `*-cases.js` 文件中添加

例如，在 `scenarios/earn/earn-cases.js` 中添加新的子用例：

```javascript
export function registerEarnCases(runner) {
    // 现有的子用例...

    // 新增子用例
    runner.registerCase('新版返佣', '检查新功能', async (page, auth, test) => {
        // 1. 执行操作
        await page.click('.new-feature-btn');
        
        // 2. 切换页面（如果需要）
        await test.switchToPage('新功能页面', {
            waitForSelector: '.feature-content',
            waitTime: 1000
        });
        
        // 3. 验证结果
        const isVisible = await page.isVisible('.success-message');
        if (!isVisible) {
            throw new Error('新功能验证失败');
        }
        
        console.log('        ✅ 新功能验证成功');
    });
}
```

### 2. 如果需要复杂的业务逻辑，创建独立函数

在 `scenarios/earn/earn.js` 中添加业务逻辑：

```javascript
/**
 * 检查新功能
 */
export async function checkNewFeature(page, test) {
    console.log('        检查新功能...');
    
    // 业务逻辑
    await page.click('.new-feature-btn');
    await test.switchToPage('新功能页面', {
        waitForSelector: '.feature-content'
    });
    
    // 验证
    const isVisible = await page.isVisible('.success-message');
    if (!isVisible) {
        throw new Error('新功能验证失败');
    }
    
    console.log('        ✅ 新功能验证成功');
    return true;
}
```

然后在 `earn-cases.js` 中使用：

```javascript
import { checkNewFeature } from './earn.js';

export function registerEarnCases(runner) {
    runner.registerCase('新版返佣', '检查新功能', async (page, auth, test) => {
        await checkNewFeature(page, test);
    });
}
```

### 3. 添加新的大类

如果要添加全新的大类（例如"个人中心"）：

#### 3.1 创建目录和文件

```bash
mkdir scenarios/profile
touch scenarios/profile/profile-cases.js
```

#### 3.2 编写子用例注册函数

`scenarios/profile/profile-cases.js`:

```javascript
/**
 * 个人中心 - 子用例模块
 */

export function registerProfileCases(runner) {
    runner.registerCase('个人中心', '检查个人信息', async (page, auth, test) => {
        // 测试逻辑
    });
    
    runner.registerCase('个人中心', '检查设置功能', async (page, auth, test) => {
        // 测试逻辑
    });
}
```

#### 3.3 在 `scenarios/index.js` 中注册

```javascript
import { registerProfileCases } from './profile/profile-cases.js';

export function registerAllCases(runner, options = {}) {
    const categories = {
        '活动资讯': registerPromoCases,
        '新版返佣': registerEarnCases,
        '菜单': registerMenuCases,
        '邀请转盘': registerTurntableCases,
        '家': registerHomeCases,
        '个人中心': registerProfileCases  // 新增
    };
    
    // ... 其他代码
}

export {
    registerPromoCases,
    registerEarnCases,
    registerMenuCases,
    registerTurntableCases,
    registerHomeCases,
    registerProfileCases  // 导出
};
```

#### 3.4 在 `tests/runAll.test.js` 中添加到执行顺序

```javascript
const results = await runner.runSequential({
    tabOrder: ['活动资讯', '新版返佣', '菜单', '邀请转盘', '家', '个人中心'],
    // ...
});
```

## 最佳实践

### 1. 保持子用例简洁

```javascript
// ✅ 推荐：简洁明了
runner.registerCase('新版返佣', '检查团队详情', async (page, auth, test) => {
    await clickDetailInCarousel(page);
    await test.switchToPage('团队详情', { waitForSelector: '.detail' });
});

// ❌ 不推荐：逻辑过于复杂
runner.registerCase('新版返佣', '复杂测试', async (page, auth, test) => {
    // 100 行代码...
});
```

### 2. 复杂逻辑抽取到独立函数

```javascript
// ✅ 推荐：复杂逻辑抽取到 earn.js
export async function complexBusinessLogic(page, test) {
    // 复杂的业务逻辑
}

// 在 earn-cases.js 中使用
runner.registerCase('新版返佣', '复杂测试', async (page, auth, test) => {
    await complexBusinessLogic(page, test);
});
```

### 3. 使用有意义的名称

```javascript
// ✅ 推荐：清晰的名称
runner.registerCase('新版返佣', '检查团队详情页面加载', async (page, auth, test) => {
    // ...
});

// ❌ 不推荐：模糊的名称
runner.registerCase('新版返佣', '测试1', async (page, auth, test) => {
    // ...
});
```

### 4. 添加适当的日志

```javascript
runner.registerCase('新版返佣', '检查邀请功能', async (page, auth, test) => {
    console.log('        开始检查邀请功能...');
    
    await earnInviteLink(page, test);
    
    console.log('        ✅ 邀请功能检查完成');
});
```

## 选择性执行

### 只执行特定大类

```javascript
// 只执行活动资讯和新版返佣
registerAllCases(runner, { 
    only: ['活动资讯', '新版返佣'] 
});
```

### 排除特定大类

```javascript
// 排除菜单
registerAllCases(runner, { 
    exclude: ['菜单'] 
});
```

### 单独注册某个大类

```javascript
import { registerEarnCases } from '../scenarios/index.js';

// 只注册新版返佣
registerEarnCases(runner);
```

## 调试技巧

### 1. 临时禁用某个子用例

在 `*-cases.js` 中注释掉：

```javascript
export function registerEarnCases(runner) {
    runner.registerCase('新版返佣', '子用例1', async (page, auth, test) => {
        // ...
    });
    
    // 临时禁用
    // runner.registerCase('新版返佣', '子用例2', async (page, auth, test) => {
    //     // ...
    // });
}
```

### 2. 只运行某个大类

```javascript
registerAllCases(runner, { only: ['新版返佣'] });
```

### 3. 调整执行顺序

```javascript
const results = await runner.runSequential({
    tabOrder: ['新版返佣', '活动资讯'],  // 只执行这两个
    // ...
});
```

## 常见问题

### Q: 如何在子用例之间共享数据？

A: 使用 `auth` 对象或页面状态：

```javascript
runner.registerCase('新版返佣', '获取数据', async (page, auth, test) => {
    const data = await page.textContent('.data');
    auth.sharedData = data;  // 存储到 auth 对象
});

runner.registerCase('新版返佣', '使用数据', async (page, auth, test) => {
    console.log('共享数据:', auth.sharedData);
});
```

### Q: 如何处理子用例失败？

A: 配置重试次数：

```javascript
const results = await runner.runSequential({
    defaultRetries: 3,  // 失败后重试 3 次
    retryDelay: 2000,   // 重试间隔 2 秒
    // ...
});
```

### Q: 如何跳过某个子用例？

A: 在子用例中返回特定值或抛出特定错误（根据 TestModle 的实现）。
