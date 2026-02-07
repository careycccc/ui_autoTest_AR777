
import crypto from 'crypto';


export class Utils {
    /**
     * 实现 Golang 的 Md5Info
     */
    static md5Info(data, uppercase = true) {
        const hash = crypto.createHash('md5').update(data).digest('hex');
        return uppercase ? hash.toUpperCase() : hash.toLowerCase();
    }

    /**
     * 实现 Golang 的 GetSignature
     * 关键点：Key 排序、过滤特定字段、不转义 HTML
     */
    static getSignature(body, verifyPwd = "") {
        // 1. 过滤与排序
        const filteredObj = {};
        const keys = Object.keys(body)
            .filter(key => {
                const val = body[key];
                return val !== null && val !== "" &&
                    !['signature', 'timestamp', 'track'].includes(key) &&
                    !Array.isArray(val); // 过滤切片/数组
            })
            .sort(); // 按键排序

        keys.forEach(key => {
            filteredObj[key] = body[key];
        });

        // 2. 模拟 Golang json.Marshal (不转义 HTML)
        // JS 默认 JSON.stringify 也不转义 HTML，但要注意属性顺序
        let encoder = JSON.stringify(filteredObj);

        // 3. 拼接验证密钥
        if (verifyPwd) {
            encoder += verifyPwd;
        }

        // 4. 计算 MD5
        return this.md5Info(encoder, true);
    }
}
