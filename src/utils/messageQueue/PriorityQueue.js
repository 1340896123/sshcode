/**
 * 优先级队列实现
 * 基于二叉堆的高效优先级队列
 */

export class PriorityQueue {
  constructor() {
    this.heap = []
    this.compare = (a, b) => a.priority - b.priority
  }

  /**
   * 获取队列大小
   */
  size() {
    return this.heap.length
  }

  /**
   * 检查队列是否为空
   */
  isEmpty() {
    return this.heap.length === 0
  }

  /**
   * 获取堆顶元素（不移除）
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null
  }

  /**
   * 入队操作
   */
  enqueue(item) {
    // 验证消息格式
    if (!this.validateMessage(item)) {
      throw new Error('Invalid message format')
    }

    // 添加时间戳
    item.timestamp = Date.now()
    item.id = this.generateMessageId()

    // 添加到堆末尾
    this.heap.push(item)
    
    // 上浮调整
    this.bubbleUp(this.heap.length - 1)
    
    return item.id
  }

  /**
   * 出队操作
   */
  dequeue() {
    if (this.isEmpty()) {
      return null
    }

    const root = this.heap[0]
    const last = this.heap.pop()

    if (this.heap.length > 0) {
      this.heap[0] = last
      this.bubbleDown(0)
    }

    return root
  }

  /**
   * 根据ID移除消息
   */
  removeById(messageId) {
    const index = this.heap.findIndex(item => item.id === messageId)
    if (index === -1) {
      return false
    }

    const last = this.heap.pop()
    if (index !== this.heap.length) {
      this.heap[index] = last
      this.bubbleDown(index)
      this.bubbleUp(index)
    }

    return true
  }

  /**
   * 根据类型移除消息
   */
  removeByType(messageType) {
    const removed = []
    this.heap = this.heap.filter(item => {
      if (item.type === messageType) {
        removed.push(item)
        return false
      }
      return true
    })

    // 重建堆
    this.buildHeap()
    return removed
  }

  /**
   * 清空队列
   */
  clear() {
    this.heap = []
  }

  /**
   * 获取队列统计信息
   */
  getStats() {
    const stats = {
      total: this.heap.length,
      byPriority: {},
      byType: {},
      byStatus: {},
      oldestMessage: null,
      newestMessage: null
    }

    // 按优先级、类型、状态分组统计
    this.heap.forEach(item => {
      // 按优先级统计
      const priority = item.priority || 2
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1

      // 按类型统计
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1

      // 按状态统计
      const status = item.status || 'pending'
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1

      // 记录最旧和最新消息
      if (!stats.oldestMessage || item.timestamp < stats.oldestMessage.timestamp) {
        stats.oldestMessage = item
      }
      if (!stats.newestMessage || item.timestamp > stats.newestMessage.timestamp) {
        stats.newestMessage = item
      }
    })

    return stats
  }

  /**
   * 获取指定类型的消息列表
   */
  getMessagesByType(messageType) {
    return this.heap.filter(item => item.type === messageType)
  }

  /**
   * 获取指定优先级的消息列表
   */
  getMessagesByPriority(priority) {
    return this.heap.filter(item => item.priority === priority)
  }

  /**
   * 更新消息优先级
   */
  updatePriority(messageId, newPriority) {
    const index = this.heap.findIndex(item => item.id === messageId)
    if (index === -1) {
      return false
    }

    const oldPriority = this.heap[index].priority
    this.heap[index].priority = newPriority

    // 根据优先级变化决定上浮或下沉
    if (newPriority < oldPriority) {
      this.bubbleUp(index)
    } else {
      this.bubbleDown(index)
    }

    return true
  }

  /**
   * 验证消息格式
   */
  validateMessage(item) {
    return item && 
           typeof item === 'object' &&
           item.type &&
           typeof item.priority === 'number' &&
           item.priority >= 0 && item.priority <= 3
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 上浮调整
   */
  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
        break
      }
      
      // 交换位置
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
      index = parentIndex
    }
  }

  /**
   * 下沉调整
   */
  bubbleDown(index) {
    const lastIndex = this.heap.length - 1
    
    while (true) {
      const leftChildIndex = index * 2 + 1
      const rightChildIndex = index * 2 + 2
      let smallestChildIndex = index

      if (leftChildIndex <= lastIndex && 
          this.compare(this.heap[leftChildIndex], this.heap[smallestChildIndex]) < 0) {
        smallestChildIndex = leftChildIndex
      }

      if (rightChildIndex <= lastIndex && 
          this.compare(this.heap[rightChildIndex], this.heap[smallestChildIndex]) < 0) {
        smallestChildIndex = rightChildIndex
      }

      if (smallestChildIndex === index) {
        break
      }

      // 交换位置
      [this.heap[index], this.heap[smallestChildIndex]] = [this.heap[smallestChildIndex], this.heap[index]]
      index = smallestChildIndex
    }
  }

  /**
   * 构建堆
   */
  buildHeap() {
    // 从最后一个非叶子节点开始下沉调整
    const startIndex = Math.floor(this.heap.length / 2) - 1
    
    for (let i = startIndex; i >= 0; i--) {
      this.bubbleDown(i)
    }
  }

  /**
   * 转换为数组（按优先级排序）
   */
  toArray() {
    return [...this.heap].sort(this.compare)
  }

  /**
   * 获取队列快照
   */
  getSnapshot() {
    return {
      messages: this.heap.map(item => ({
        id: item.id,
        type: item.type,
        priority: item.priority,
        status: item.status,
        timestamp: item.timestamp,
        data: item.data
      })),
      stats: this.getStats(),
      timestamp: Date.now()
    }
  }
}
