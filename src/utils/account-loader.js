// ============================================================
// 账号池加载器
// 从 txt 文件读取测试账号，一行一个，忽略空行与 # 注释行
// 密码统一使用默认值（所有测试账号共用同一密码）
// ============================================================

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

/** 所有测试账号共用的默认密码 */
export const DEFAULT_PASSWORD = 'qwer1234';

/** 默认账号文件路径 */
export const DEFAULT_ACCOUNT_FILE = path.join(rootDir, 'data', '1.txt');

/** 并发测试可随机选取的移动设备 */
export const RANDOM_DEVICES = ['iphone14', 'iphone14pro', 'pixel7', 'samsungS23'];

/**
 * 规范化账号：拆出内含的区号
 *
 * 账号文件里可能直接写「区号 + 手机号」的完整串，例如 918005199727，
 * 而登录表单的手机号输入框 maxlength="10"、区号是单独的下拉框，
 * 直接填 12 位会被截断成错误号码。
 *
 * 规则：长度 12 时，前 2 位视为区号，后 10 位为手机号；其余原样返回。
 *
 * @param {string} raw        原始账号串
 * @param {string} fallback   拆不出区号时使用的默认区号
 * @returns {{phone:string, areaCode:string}}
 */
export function normalizePhone(raw, fallback = '91') {
    const digits = String(raw).trim();

    if (/^\d{12}$/.test(digits)) {
        return { phone: digits.slice(2), areaCode: digits.slice(0, 2) };
    }

    return { phone: digits, areaCode: fallback };
}

/**
 * 从 txt 文件读取账号列表
 *
 * 文件格式：一行一个账号，空行与 # 开头的注释行会被忽略
 *
 * @param {string} filePath  账号文件路径，默认 data/1.txt
 * @param {object} options
 * @param {string} options.password  账号密码，默认 qwer1234
 * @param {string} options.areaCode  区号，默认 91
 * @returns {Array<{phone:string, password:string, areaCode:string}>}
 */
export function loadAccounts(filePath = DEFAULT_ACCOUNT_FILE, options = {}) {
    const { password = DEFAULT_PASSWORD, areaCode = '91' } = options;

    if (!existsSync(filePath)) {
        throw new Error(`账号文件不存在: ${filePath}\n请创建该文件并写入账号，一行一个`);
    }

    const raw = readFileSync(filePath, 'utf8');
    const accounts = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const { phone, areaCode: parsedAreaCode } = normalizePhone(line, areaCode);
            return { phone, password, areaCode: parsedAreaCode };
        });

    if (accounts.length === 0) {
        throw new Error(`账号文件为空: ${filePath}\n请写入至少一个账号，一行一个`);
    }

    return accounts;
}

/**
 * 读取账号列表，失败时不抛异常而是返回空数组
 * 用于「读不到就回退 config.js 写死账号」的场景
 */
export function tryLoadAccounts(filePath = DEFAULT_ACCOUNT_FILE, options = {}) {
    try {
        return loadAccounts(filePath, options);
    } catch (e) {
        console.warn(`⚠️  账号文件读取失败: ${e.message.split('\n')[0]}`);
        return [];
    }
}

/**
 * 读取单个账号（调试阶段用，默认取第一个）
 * @returns {{phone:string, password:string, areaCode:string}|null}
 */
export function loadSingleAccount(filePath = DEFAULT_ACCOUNT_FILE, options = {}) {
    const { index = 0 } = options;
    const accounts = tryLoadAccounts(filePath, options);
    return accounts[index] || null;
}

/**
 * 随机取一个设备名
 * @param {string[]} devices 候选设备，默认 RANDOM_DEVICES
 */
export function pickRandomDevice(devices = RANDOM_DEVICES) {
    return devices[Math.floor(Math.random() * devices.length)];
}

/**
 * 给每个账号分配一个随机设备
 * @param {Array} accounts 账号列表
 * @param {string[]} devices 候选设备
 * @returns {Array<{phone, password, areaCode, device}>}
 */
export function assignRandomDevices(accounts, devices = RANDOM_DEVICES) {
    return accounts.map(acc => ({ ...acc, device: pickRandomDevice(devices) }));
}
