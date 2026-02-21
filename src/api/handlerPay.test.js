import { adminLogin } from './adminlogin.test.js';
import { postRequestConfig } from '../http/request.js';
import { getTodayTimeRange } from '../utils/timeUtils.js';

/**
 * 通用查询订单列表函数
 * @param {string} token - 后台登录 token
 * @param {number} userId - 用户 ID
 * @param {string} apiPath - API 路径
 * @param {string} orderType - 订单类型（用于日志）
 * @returns {Promise<Array>} 返回订单列表
 */
async function queryOrderList(token, userId, apiPath, orderType = '订单') {
    if (!token) {
        console.log(`❌ 后台登录失败，token 为空`);
        throw new Error("后台登录失败");
    }

    if (!userId) {
        console.log(`❌ userId 为空，无法查询${orderType}`);
        throw new Error("userId 为空");
    }

    try {
        const { startTime, endTime } = getTodayTimeRange();

        console.log(`📊 查询${orderType}参数:`);
        console.log(`   userId: ${userId}`);
        console.log(`   startTime: ${startTime} (${new Date(startTime).toLocaleString('zh-CN')})`);
        console.log(`   endTime: ${endTime} (${new Date(endTime).toLocaleString('zh-CN')})`);

        const payload = {
            "userId": userId,
            "dateType": 0,
            "endTime": endTime,
            "startTime": startTime,
            "orderBy": "Desc",
            "pageNo": 1,
            "pageSize": 20,
            "language": "zh",
            "signature": "",
            "random": Math.floor(Math.random() * 900000000000) + 100000000000,
            "timestamp": Math.floor(Date.now() / 1000)
        };

        const result = await postRequestConfig(
            payload,
            'https://arsitasdfghjklusa.com',
            apiPath,
            {
                Domainurl: 'https://arsitasdfghjklusa.com',
                Origin: 'https://arsitasdfghjklusa.com',
                Referer: 'https://arsitasdfghjklusa.com',
                Authorization: 'Bearer ' + token
            }
        );

        if (!result.data || !result.data.data || !result.data.data.list) {
            console.log(`⚠️ ${orderType}响应数据格式异常`);
            return [];
        }

        const orderList = result.data.data.list;
        console.log(`📋 查询到 ${orderList.length} 条${orderType}`);

        if (orderList.length === 0) {
            return [];
        }

        return orderList.map(order => ({
            orderNo: order.orderNo,
            amount: order.amount,
            createTime: order.createTime,
            status: order.status,
            channel: order.channel
        }));

    } catch (error) {
        console.log(`❌ 查询${orderType}失败: ${error.message}`);
        throw error;
    }
}

/**
 * 通用订单处理函数
 * @param {string} token - 后台登录 token
 * @param {number} userId - 用户 ID
 * @param {Array} orderList - 订单列表
 * @param {string} apiPath - 处理订单的 API 路径
 * @param {string} orderType - 订单类型（用于日志）
 * @returns {Promise<Array>} 返回处理结果
 */
async function processOrders(token, userId, orderList, apiPath, orderType) {
    const processedOrders = [];

    for (const ele of orderList) {
        const payload = {
            "actualAmount": ele.amount,
            "orderNo": ele.orderNo,
            "userId": userId,
            "createTime": ele.createTime,
            "remark": "carey3004",
            "language": "zh",
            "signature": "",
            "random": Math.floor(Math.random() * 900000000000) + 100000000000,
            "timestamp": Math.floor(Date.now() / 1000)
        };

        try {
            const result = await postRequestConfig(
                payload,
                'https://arsitasdfghjklusa.com',
                apiPath,
                {
                    Domainurl: 'https://arsitasdfghjklusa.com',
                    Origin: 'https://arsitasdfghjklusa.com',
                    Referer: 'https://arsitasdfghjklusa.com',
                    Authorization: 'Bearer ' + token
                }
            );

            processedOrders.push({
                orderNo: ele.orderNo,
                success: true,
                result: result.data
            });
            console.log(`✅ ${orderType} ${ele.orderNo} 处理成功`);
        } catch (error) {
            processedOrders.push({
                orderNo: ele.orderNo,
                success: false,
                error: error.message
            });
            console.log(`❌ ${orderType} ${ele.orderNo} 处理失败: ${error.message}`);
        }
    }

    return processedOrders;
}

/**
 * 获取本地支付订单
 * @param {string} token - 后台登录 token
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array|null>} 返回订单列表
 */
export async function getLocalorderNumber(token, userId) {
    try {
        const orderinfo = await queryOrderList(
            token,
            userId,
            '/api/RechargeOrder/GetLocalRechargeOrderPageList',
            '本地订单'
        );

        if (!orderinfo || (Array.isArray(orderinfo) && orderinfo.length === 0)) {
            console.log("⚠️ 未找到本地订单");
            return null;
        }
        return orderinfo;

    } catch (error) {
        console.log(`❌ 获取本地订单失败: ${error.message}`);
        return null;
    }
}

/**
 * 获取三方支付订单
 * @param {string} token - 后台登录 token
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array|null>} 返回订单列表
 */
export async function getThreeNumber(token, userId) {
    try {
        const orderinfo = await queryOrderList(
            token,
            userId,
            '/api/RechargeOrder/GetThirdRechargeOrderPageList',
            '三方订单'
        );

        if (!orderinfo || (Array.isArray(orderinfo) && orderinfo.length === 0)) {
            console.log("⚠️ 未找到三方订单");
            return null;
        }
        return orderinfo;

    } catch (error) {
        console.log(`❌ 获取三方订单失败: ${error.message}`);
        return null;
    }
}

/**
 * 处理本地订单
 * @param {string} token - 后台登录 token
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>} 返回处理结果
 */
export async function handleLocalOrders(token, userId) {
    try {
        const orderList = await queryOrderList(
            token,
            userId,
            '/api/RechargeOrder/GetLocalRechargeOrderPageList',
            '本地订单'
        );

        if (orderList.length === 0) {
            return { success: true, processed: false, count: 0 };
        }

        console.log(`🔄 处理 ${orderList.length} 条本地订单...`);
        const processedOrders = await processOrders(
            token,
            userId,
            orderList,
            '/api/RechargeOrder/ManualAuditLocalRechargeOrder',
            '本地订单'
        );

        const successCount = processedOrders.filter(o => o.success).length;
        console.log(`✅ 本地订单处理完成: ${successCount}/${orderList.length}`);

        return {
            success: true,
            processed: true,
            count: successCount,
            orders: processedOrders
        };
    } catch (error) {
        console.log(`❌ 本地订单处理失败: ${error.message}`);
        return { success: false, processed: false, count: 0, error: error.message };
    }
}

/**
 * 处理三方订单
 * @param {string} token - 后台登录 token
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>} 返回处理结果
 */
export async function handleThirdPartyOrders(token, userId) {
    try {
        const orderList = await queryOrderList(
            token,
            userId,
            '/api/RechargeOrder/GetThirdRechargeOrderPageList',
            '三方订单'
        );

        if (orderList.length === 0) {
            return { success: true, processed: false, count: 0 };
        }

        console.log(`🔄 处理 ${orderList.length} 条三方订单...`);
        const processedOrders = await processOrders(
            token,
            userId,
            orderList,
            '/api/RechargeOrder/ManualAuditThirdRechargeOrder',
            '三方订单'
        );

        const successCount = processedOrders.filter(o => o.success).length;
        console.log(`✅ 三方订单处理完成: ${successCount}/${orderList.length}`);

        return {
            success: true,
            processed: true,
            count: successCount,
            orders: processedOrders
        };
    } catch (error) {
        console.log(`❌ 三方订单处理失败: ${error.message}`);
        return { success: false, processed: false, count: 0, error: error.message };
    }
}

/**
 * 处理所有订单（本地 + 三方）
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>} 返回处理结果
 */
export async function handlePay(userId) {
    console.log('🎯 开始处理订单...');

    try {
        const token = await adminLogin();
        if (!token) throw new Error('后台登录失败');

        // 查询本地订单
        const localOrderNo = await getLocalorderNumber(token, userId);
        let localResult = { success: true, processed: false, count: 0 };

        if (localOrderNo && localOrderNo.length > 0) {
            console.log(`\n📦 本地订单: ${localOrderNo.length} 条`);
            localResult = await handleLocalOrders(token, userId);
        }

        // 查询三方订单
        const thirdOrderNo = await getThreeNumber(token, userId);
        let thirdResult = { success: true, processed: false, count: 0 };

        if (thirdOrderNo && thirdOrderNo.length > 0) {
            console.log(`\n📦 三方订单: ${thirdOrderNo.length} 条`);
            thirdResult = await handleThirdPartyOrders(token, userId);
        }

        // 汇总
        const total = localResult.count + thirdResult.count;
        console.log(`\n📊 后台处理完成: 本地 ${localResult.count} 条, 三方 ${thirdResult.count} 条, 总计 ${total} 条`);

        return {
            local: localResult,
            thirdParty: thirdResult,
            summary: {
                totalProcessed: total,
                localCount: localResult.count,
                thirdPartyCount: thirdResult.count,
                success: localResult.success && thirdResult.success
            }
        };
    } catch (error) {
        console.log(`❌ 订单处理失败: ${error.message}`);
        return {
            local: null,
            thirdParty: null,
            summary: { totalProcessed: 0, localCount: 0, thirdPartyCount: 0, success: false }
        };
    }
}

