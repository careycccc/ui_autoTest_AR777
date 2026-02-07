export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms) {
  if (ms < 1000) return ms.toFixed(0) + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(2) + 's';
  return (ms / 60000).toFixed(2) + 'm';
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



/**
 * 检查URL是否匹配指定的域名列表
 * @param {string} url - 要检查的URL
 * @param {Array<string>} domains - 允许的域名列表
 * @returns {boolean} - 是否匹配
 */
export function isUrlMatchDomain(url, domains) {
  if (!url || !domains || !Array.isArray(domains) || domains.length === 0) {
    return false;
  }

  // 创建正则表达式，匹配任意一个域名
  const domainPattern = domains.map(domain =>
    domain.replace(/\./g, '\\.') // 转义域名中的点号
  ).join('|');

  const regex = new RegExp(`^https?:\\/\\/(?:${domainPattern})\\/`, 'i');

  return regex.test(url);
}