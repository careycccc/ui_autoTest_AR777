import { adminLogin } from './adminlogin.test.js';
import { postRequestConfig } from '../http/request.js';

/**
 * 传入一个带有区号的电话号码
 * @param {*} userName 带有区号的电话号码
 * @returns 验证码
 */
export async function getSmss(userName) {
    const token = await adminLogin();
    if (token) {
        const payload = {
            "mobileOrEmail": userName,
            "orderBy": "Desc",
            "language": "zh",
            "pageNo": 1,
            "pageSize": 20,
            "signature": "",
            "random": Math.floor(Math.random() * 900000000000) + 100000000000,
            "timestamp": Math.floor(Date.now() / 1000) // 签名会自动过滤它
        };
        const result = await postRequestConfig(
            payload,
            'https://arsitasdfghjklusa.com',
            '/api/Users/GetVerifyCodePageList',
            {
                Domainurl: 'https://arsitasdfghjklusa.com',
                Origin: 'https://arsitasdfghjklusa.com',
                Referer: 'https://arsitasdfghjklusa.com',
                Authorization: 'Bearer ' + token
            }
        );
        // console.log('响应内容:', result.data.data.list[0].number);
        return result.data.data.list[0].number;
    } else {
        console.log("后台登录失败Error", token);
    }
}
getSmss();