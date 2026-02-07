import { postRequestConfig } from '../http/request.js';
import { dataConfig } from '../../config.js';
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
adminLogin().catch(error => {
    console.error('执行出错:', error);
});
