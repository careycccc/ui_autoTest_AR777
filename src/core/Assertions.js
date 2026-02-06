import { expect } from '@playwright/test';

export class Assertions {

  constructor(page) {
    this.page = page;
    // 设置默认超时时间，例如 5 秒
    this.defaultTimeout = 5000;
  }

  // --- 基础逻辑断言 (保持同步，用于处理普通变量) ---
  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(message || `断言失败: ${actual} !== ${expected}`);
    }
  }

  // --- 页面断言 (引入自动重试) ---
  async urlContains(text, message = '') {
    // expect 会自动轮询直到 URL 包含该文字
    await expect(this.page, message).toHaveURL(new RegExp(text), { timeout: this.defaultTimeout });
  }

  async titleEquals(expected, message = '') {
    await expect(this.page, message).toHaveTitle(expected, { timeout: this.defaultTimeout });
  }

  // --- 元素状态断言 (核心改造) ---
  async visible(selector, message = '') {
    // 自动等待元素从 hidden 变为 visible
    await expect(this.page.locator(selector), message).toBeVisible({ timeout: this.defaultTimeout });
  }

  async hidden(selector, message = '') {
    await expect(this.page.locator(selector), message).toBeHidden({ timeout: this.defaultTimeout });
  }

  async exists(selector, message = '') {
    // 只要 DOM 中存在即可
    await expect(this.page.locator(selector), message).toBeAttached({ timeout: this.defaultTimeout });
  }

  async enabled(selector, message = '') {
    await expect(this.page.locator(selector), message).toBeEnabled({ timeout: this.defaultTimeout });
  }

  async disabled(selector, message = '') {
    await expect(this.page.locator(selector), message).toBeDisabled({ timeout: this.defaultTimeout });
  }

  // --- 文本与内容断言 ---
  async textContains(selector, text, message = '') {
    // 改造：自动等待文本内容出现
    await expect(this.page.locator(selector), message).toContainText(text, { timeout: this.defaultTimeout });
  }

  async textEquals(selector, expected, message = '') {
    await expect(this.page.locator(selector), message).toHaveText(expected, { timeout: this.defaultTimeout });
  }

  async valueEquals(selector, expected, message = '') {
    await expect(this.page.locator(selector), message).toHaveValue(expected, { timeout: this.defaultTimeout });
  }

  // --- 数量断言 ---
  async count(selector, expected, message = '') {
    await expect(this.page.locator(selector), message).toHaveCount(expected, { timeout: this.defaultTimeout });
  }

  // 特殊：大于某个数量 (Playwright 没有直接的 toHaveCountGreaterThan，需组合使用)
  async countGreaterThan(selector, min, message = '') {
    const locator = this.page.locator(selector);
    // 先等待至少一个元素出现
    await locator.first().waitFor({ state: 'attached', timeout: this.defaultTimeout });
    const actualCount = await locator.count();
    if (actualCount <= min) {
      throw new Error(message || `断言失败: 元素数量 ${actualCount} 不大于 ${min}`);
    }
  }
}