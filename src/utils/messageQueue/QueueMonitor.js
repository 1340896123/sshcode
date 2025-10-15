/**
 * 消息队列监控系统
 * 提供队列性能监控、统计分析和健康检查
 */

export class QueueMonitor {
  constructor(messageQueue) {
    this.messageQueue = messageQueue
    this.monitoringInterval = null
    this.metricsHistory = []
    this.maxHistorySize = 1000
    this.alertThresholds = {
      queueSize: 1000,        // 队列大小警告阈值
      processingTime: 5000,   // 处理时间警告阈值（毫秒）
      errorRate: 0.1,         // 错误率警告阈值（10%）
      memoryUsage: 0.8        // 内存使用率警告阈值（80%）
    }
    this.alerts = []
    this.isMonitoring = false
  }

  /**
   * 开始监控
   * @param {number} interval - 监控间隔（毫秒）
   */
  startMonitoring(interval = 5000) {
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    console.log(`📊 [MONITOR] 开始监控队列，间隔: ${interval}ms`)

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.checkAlerts()
    }, interval)

    // 立即收集一次指标
    this.collectMetrics()
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    console.log(`📊 [MONITOR] 停止监控队列`)
  }

  /**
   * 收集指标
   */
  collectMetrics() {
    const status = this.messageQueue.getQueueStatus()
    const snapshot = this.messageQueue.getSnapshot()
    
    // 计算内存使用情况
    const memoryUsage = this.calculateMemoryUsage()
    
    // 计算处理速率
    const processingRate = this.calculateProcessingRate()
    
    // 计算错误率
    const errorRate = this.calculateErrorRate(status.stats)
    
    const metrics = {
      timestamp: Date.now(),
      queueSize: status.queueSize,
      processedMessages: status.stats.processedMessages,
      failedMessages: status.stats.failedMessages,
      averageProcessingTime: status.stats.averageProcessingTime,
      processingRate,
      errorRate,
      memoryUsage,
      uptime: Date.now() - status.stats.startTime,
      routerStats: status.routerStats,
      subscriberStats: status.subscriberStats,
      queueStats: status.queueStats
    }

    // 添加到历史记录
    this.metricsHistory.push(metrics)
    
    // 限制历史记录大小
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift()
    }

    console.log(`📊 [MONITOR] 收集指标:`, {
      queueSize: metrics.queueSize,
      processingRate: `${metrics.processingRate.toFixed(2)}/s`,
      errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
      memoryUsage: `${(metrics.memoryUsage * 100).toFixed(2)}%`
    })

    return metrics
  }

  /**
   * 计算内存使用情况
   */
  calculateMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    
    // 估算内存使用
    const queueSize = this.messageQueue.priorityQueue.size()
    const estimatedMemory = queueSize * 1024 // 假设每个消息1KB
    return Math.min(estimatedMemory / (100 * 1024 * 1024), 1) // 假设总内存100MB
  }

  /**
   * 计算处理速率
   */
  calculateProcessingRate() {
    if (this.metricsHistory.length < 2) {
      return 0
    }

    const current = this.metricsHistory[this.metricsHistory.length - 1]
    const previous = this.metricsHistory[this.metricsHistory.length - 2]
    
    const timeDiff = (current.timestamp - previous.timestamp) / 1000 // 秒
    const messageDiff = current.processedMessages - previous.processedMessages
    
    return timeDiff > 0 ? messageDiff / timeDiff : 0
  }

  /**
   * 计算错误率
   */
  calculateErrorRate(stats) {
    const total = stats.processedMessages + stats.failedMessages
    return total > 0 ? stats.failedMessages / total : 0
  }

  /**
   * 检查警报
   */
  checkAlerts() {
    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1]
    if (!currentMetrics) {
      return
    }

    const newAlerts = []

    // 检查队列大小
    if (currentMetrics.queueSize > this.alertThresholds.queueSize) {
      newAlerts.push({
        type: 'queue_size',
        level: 'warning',
        message: `队列大小过大: ${currentMetrics.queueSize}`,
        value: currentMetrics.queueSize,
        threshold: this.alertThresholds.queueSize,
        timestamp: Date.now()
      })
    }

    // 检查处理时间
    if (currentMetrics.averageProcessingTime > this.alertThresholds.processingTime) {
      newAlerts.push({
        type: 'processing_time',
        level: 'warning',
        message: `平均处理时间过长: ${currentMetrics.averageProcessingTime.toFixed(2)}ms`,
        value: currentMetrics.averageProcessingTime,
        threshold: this.alertThresholds.processingTime,
        timestamp: Date.now()
      })
    }

    // 检查错误率
    if (currentMetrics.errorRate > this.alertThresholds.errorRate) {
      newAlerts.push({
        type: 'error_rate',
        level: 'error',
        message: `错误率过高: ${(currentMetrics.errorRate * 100).toFixed(2)}%`,
        value: currentMetrics.errorRate,
        threshold: this.alertThresholds.errorRate,
        timestamp: Date.now()
      })
    }

    // 检查内存使用
    if (currentMetrics.memoryUsage > this.alertThresholds.memoryUsage) {
      newAlerts.push({
        type: 'memory_usage',
        level: 'critical',
        message: `内存使用率过高: ${(currentMetrics.memoryUsage * 100).toFixed(2)}%`,
        value: currentMetrics.memoryUsage,
        threshold: this.alertThresholds.memoryUsage,
        timestamp: Date.now()
      })
    }

    // 添加新警报
    if (newAlerts.length > 0) {
      this.alerts.push(...newAlerts)
      
      // 限制警报数量
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100)
      }

      // 发送警报事件
      newAlerts.forEach(alert => {
        console.warn(`🚨 [MONITOR] ${alert.level.toUpperCase()}: ${alert.message}`)
        this.messageQueue.sendCriticalMessage(MessageTypes.SYSTEM_ERROR, {
          type: 'monitoring_alert',
          alert
        })
      })
    }
  }

  /**
   * 获取性能报告
   * @param {number} timeRange - 时间范围（毫秒）
   */
  getPerformanceReport(timeRange = 5 * 60 * 1000) { // 默认5分钟
    const now = Date.now()
    const relevantMetrics = this.metricsHistory.filter(
      m => now - m.timestamp <= timeRange
    )

    if (relevantMetrics.length === 0) {
      return {
        timeRange,
        message: '没有可用的指标数据'
      }
    }

    const latest = relevantMetrics[relevantMetrics.length - 1]
    const oldest = relevantMetrics[0]

    // 计算统计信息
    const queueSizes = relevantMetrics.map(m => m.queueSize)
    const processingTimes = relevantMetrics.map(m => m.averageProcessingTime)
    const errorRates = relevantMetrics.map(m => m.errorRate)
    const memoryUsages = relevantMetrics.map(m => m.memoryUsage)

    return {
      timeRange,
      period: {
        start: oldest.timestamp,
        end: latest.timestamp,
        duration: latest.timestamp - oldest.timestamp
      },
      summary: {
        totalMessages: latest.processedMessages,
        averageQueueSize: this.average(queueSizes),
        maxQueueSize: Math.max(...queueSizes),
        averageProcessingTime: this.average(processingTimes),
        maxProcessingTime: Math.max(...processingTimes),
        averageErrorRate: this.average(errorRates),
        maxErrorRate: Math.max(...errorRates),
        averageMemoryUsage: this.average(memoryUsages),
        maxMemoryUsage: Math.max(...memoryUsages)
      },
      current: latest,
      alerts: this.getRecentAlerts(timeRange),
      recommendations: this.generateRecommendations(latest)
    }
  }

  /**
   * 获取最近的警报
   * @param {number} timeRange - 时间范围（毫秒）
   */
  getRecentAlerts(timeRange = 5 * 60 * 1000) {
    const now = Date.now()
    return this.alerts.filter(alert => now - alert.timestamp <= timeRange)
  }

  /**
   * 生成优化建议
   * @param {Object} metrics - 当前指标
   */
  generateRecommendations(metrics) {
    const recommendations = []

    if (metrics.queueSize > this.alertThresholds.queueSize * 0.8) {
      recommendations.push({
        type: 'queue_size',
        priority: 'high',
        message: '队列大小接近阈值，建议增加处理能力或减少消息产生速率'
      })
    }

    if (metrics.averageProcessingTime > this.alertThresholds.processingTime * 0.8) {
      recommendations.push({
        type: 'processing_time',
        priority: 'medium',
        message: '处理时间较长，建议优化消息处理逻辑或增加超时设置'
      })
    }

    if (metrics.errorRate > this.alertThresholds.errorRate * 0.5) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: '错误率较高，建议检查消息处理器和重试机制'
      })
    }

    if (metrics.memoryUsage > this.alertThresholds.memoryUsage * 0.7) {
      recommendations.push({
        type: 'memory_usage',
        priority: 'critical',
        message: '内存使用率较高，建议清理历史数据或优化内存使用'
      })
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        priority: 'info',
        message: '系统运行正常，无需特别优化'
      })
    }

    return recommendations
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1]
    if (!currentMetrics) {
      return {
        status: 'unknown',
        message: '没有可用的监控数据'
      }
    }

    const recentAlerts = this.getRecentAlerts(60 * 1000) // 最近1分钟
    const criticalAlerts = recentAlerts.filter(a => a.level === 'critical')
    const errorAlerts = recentAlerts.filter(a => a.level === 'error')
    const warningAlerts = recentAlerts.filter(a => a.level === 'warning')

    let status = 'healthy'
    let message = '系统运行正常'

    if (criticalAlerts.length > 0) {
      status = 'critical'
      message = `系统存在 ${criticalAlerts.length} 个严重问题`
    } else if (errorAlerts.length > 0) {
      status = 'error'
      message = `系统存在 ${errorAlerts.length} 个错误`
    } else if (warningAlerts.length > 0) {
      status = 'warning'
      message = `系统存在 ${warningAlerts.length} 个警告`
    }

    return {
      status,
      message,
      metrics: currentMetrics,
      recentAlerts: recentAlerts.length,
      uptime: currentMetrics.uptime
    }
  }

  /**
   * 设置警报阈值
   * @param {Object} thresholds - 新的阈值
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds }
    console.log(`📊 [MONITOR] 更新警报阈值:`, this.alertThresholds)
  }

  /**
   * 清除警报
   * @param {string} type - 警报类型（可选）
   */
  clearAlerts(type = null) {
    if (type) {
      this.alerts = this.alerts.filter(alert => alert.type !== type)
      console.log(`📊 [MONITOR] 清除 ${type} 类型警报`)
    } else {
      this.alerts = []
      console.log(`📊 [MONITOR] 清除所有警报`)
    }
  }

  /**
   * 导出监控数据
   * @param {string} format - 导出格式（json, csv）
   */
  exportMetrics(format = 'json') {
    const data = {
      metrics: this.metricsHistory,
      alerts: this.alerts,
      thresholds: this.alertThresholds,
      exportTime: Date.now()
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2)
    } else if (format === 'csv') {
      return this.convertToCSV(data.metrics)
    } else {
      throw new Error(`不支持的导出格式: ${format}`)
    }
  }

  /**
   * 转换为CSV格式
   * @param {Array} metrics - 指标数据
   */
  convertToCSV(metrics) {
    if (metrics.length === 0) {
      return ''
    }

    const headers = Object.keys(metrics[0])
    const csvRows = [headers.join(',')]

    for (const metric of metrics) {
      const values = headers.map(header => {
        const value = metric[header]
        return typeof value === 'string' ? `"${value}"` : value
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  }

  /**
   * 计算平均值
   * @param {Array} values - 数值数组
   */
  average(values) {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  /**
   * 获取监控快照
   */
  getSnapshot() {
    return {
      isMonitoring: this.isMonitoring,
      metricsHistory: this.metricsHistory,
      alerts: this.alerts,
      alertThresholds: this.alertThresholds,
      healthStatus: this.getHealthStatus(),
      timestamp: Date.now()
    }
  }

  /**
   * 销毁监控器
   */
  destroy() {
    this.stopMonitoring()
    this.metricsHistory = []
    this.alerts = []
    console.log(`📊 [MONITOR] 监控器已销毁`)
  }
}

// 创建全局监控器实例
export const globalQueueMonitor = new QueueMonitor(globalMessageQueue)

// 导出便捷方法
export const startMonitoring = (interval) => globalQueueMonitor.startMonitoring(interval)
export const stopMonitoring = () => globalQueueMonitor.stopMonitoring()
export const getPerformanceReport = (timeRange) => globalQueueMonitor.getPerformanceReport(timeRange)
export const getHealthStatus = () => globalQueueMonitor.getHealthStatus()
