import { postRequestConfig } from '../http/request.js';
import { dataConfig } from '../../config.js';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
/**
 * 后台登录返回响应吗
 * @returns 
 */
export async function adminLogin() {
    const payload = {
        "userName": dataConfig.adminUser,
        "pwd": dataConfig.adminPwd,
        "language": "zh",
        "signature": "",
        "random": Math.floor(Math.random() * 900000000000) + 100000000000,
        "timestamp": Math.floor(Date.now() / 1000) // 签名会自动过滤它
    };
    const adminUlr = dataConfig.adminUrl;
    const result = await postRequestConfig(
        payload,
        adminUlr,
        '/api/Login/Login',
        {
            Domainurl: adminUlr,
            Origin: adminUlr,
            Referer: adminUlr,
        }
    );
    // console.log('响应内容:', result.data.data.token);
    return result.data.data.token;
}

export default async function () {
    const result = await adminLogin();
    console.log('响应内容:', result.data);
    // 添加一些断言来验证响应
    if (result.data && result.data.code === 200) {
        console.log('登录成功');
    } else {
        console.log('登录失败');
    }
};

// 添加直接调用代码，以便可以使用 node 命令执行
//
// 必须限定为「直接执行本文件」才触发：此前是模块顶层裸调用，
// 任何 import（如 smss.test.js → getSmss）都会额外打一次后台登录请求，
// 并发时每个账号都会重复触发，网络异常还会产生未捕获的 Promise 拒绝。
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    adminLogin().catch(error => {
        console.error('执行出错:', error);
    });
}
