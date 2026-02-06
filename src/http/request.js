import axios from 'axios';
import { Utils } from '../http/utils.js';



/**
 * 封装 PostRequestCofig
 * @param {Object} payload - 请求参数
 * @param {String} baseUrl - 基础地址
 * @param {String} api - 接口地址
 * @param {Object} customHeaders - 自定义请求头
 */
export async function postRequestConfig(payload, baseUrl, api, customHeaders = {}) {
    const url = baseUrl + api;
    const verifyPwd = ""; // 对应 Golang 的 verfiyp
    // 1. 处理签名逻辑
    if (payload["signature"] === undefined) {
        payload["signature"] = "";
    }

    const signature = Utils.getSignature(payload, verifyPwd);
    if (!signature) {
        throw new Error("生成签名失败");
    }
    payload["signature"] = signature;

    // 2. 配置请求头 (模拟 Golang 中的 setHeaders)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'keep-alive',
        ...customHeaders
    };

    // 3. 发送请求
    try {
        const response = await axios.post(url, payload, {
            headers: headers,
            timeout: 30000,
        });


        // 返回 body 和原始 response，保持与 Golang 返回结构一致
        return {
            data: response.data,
            response: response
        };
    } catch (error) {
        console.error('❌ 请求发送失败:', error.message);
        throw error;
    }
}
