/**
 * 时间工具函数
 */

/**
 * 获取指定日期的开始时间戳（00:00:00）
 * @param {Date} date - 日期对象，默认为当天
 * @returns {number} 毫秒级时间戳
 */
export function getDayStartTimestamp(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.getTime();
}

/**
 * 获取指定日期的结束时间戳（23:59:59.999）
 * @param {Date} date - 日期对象，默认为当天
 * @returns {number} 毫秒级时间戳
 */
export function getDayEndTimestamp(date = new Date()) {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime();
}

/**
 * 获取当天的时间范围（开始和结束时间戳）
 * @returns {Object} { startTime: number, endTime: number }
 */
export function getTodayTimeRange() {
    return {
        startTime: getDayStartTimestamp(),
        endTime: getDayEndTimestamp()
    };
}

/**
 * 格式化时间戳为可读字符串
 * @param {number} timestamp - 毫秒级时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

/**
 * 获取指定天数前的日期时间范围
 * @param {number} daysAgo - 几天前，0 表示今天，1 表示昨天
 * @returns {Object} { startTime: number, endTime: number }
 */
export function getDateRangeByDaysAgo(daysAgo = 0) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
        startTime: getDayStartTimestamp(date),
        endTime: getDayEndTimestamp(date)
    };
}
