/**
 * 格式化工具函数
 */

/**
 * 格式化字节数为可读格式
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * 格式化时间戳为可读格式
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
export const formatTime = (timestamp: number | null | undefined): string => {
  if (!timestamp) return '从未';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    // 小于1分钟
    return '刚刚';
  } else if (diff < 3600000) {
    // 小于1小时
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  } else if (diff < 86400000) {
    // 小于1天
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * 格式化时间间隔为可读格式
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0秒';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
};

/**
 * 格式化文件大小
 * @param size 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (size: number): string => {
  return formatBytes(size);
};

/**
 * 格式化网络速度
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化后的网络速度字符串
 */
export const formatNetworkSpeed = (bytesPerSecond: number): string => {
  return `${formatBytes(bytesPerSecond)}/s`;
};

/**
 * 格式化百分比
 * @param value 数值 (0-1)
 * @param decimals 小数位数，默认为0
 * @returns 格式化后的百分比字符串
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};
