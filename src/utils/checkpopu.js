
export async function checkpopu(test) {
    try {
        // 设置最大尝试次数，防止无限循环
        const maxAttempts = 5;
        let attempts = 0;
        let popupExists = true;

        // 循环检查并处理弹窗，直到弹窗不存在或达到最大尝试次数
        while (popupExists && attempts < maxAttempts) {
            attempts++;
            console.log(`第${attempts}次检查弹窗...`);

            // 检查弹窗是否存在
            popupExists = await test.page.locator('#popup-mask').isVisible().catch(() => false);

            if (popupExists) {
                console.log('发现弹窗，正在关闭...');
                // 点击弹窗关闭按钮
                await test.page.click('#popup-mask');

                // 等待一小段时间，让弹窗关闭动画完成
                await test.waitForTimeout(500);

                // 点击页面左上角，确保焦点返回到页面
                await test.page.mouse.click(30, 30);

                // 再次等待，确保弹窗已完全关闭
                await test.waitForTimeout(1000);
            } else {
                console.log('未发现弹窗，继续执行测试');
            }
        }

        if (attempts >= maxAttempts) {
            console.warn(`已达到最大尝试次数(${maxAttempts})，停止检查弹窗`);
        }
    } catch (e) {
        console.log('处理首页弹窗时出错:', e);
    }
}