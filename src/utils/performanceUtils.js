// 性能优化工具函数

/**
 * 防抖函数 - 优化频繁触发的事件
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * 节流函数 - 限制函数执行频率
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 内存缓存 - 避免重复计算
 */
export class MemoCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (this.cache.has(key)) {
      // 移到最后 (LRU)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * 虚拟滚动计算 - 优化大列表渲染
 */
export function calculateVisibleItems({
  scrollTop,
  containerHeight,
  itemHeight,
  totalCount,
  overscan = 5
}) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const offsetY = startIndex * itemHeight;
  const visibleCount = endIndex - startIndex + 1;

  return {
    startIndex,
    endIndex,
    offsetY,
    visibleCount,
    totalHeight: totalCount * itemHeight
  };
}

/**
 * 优化的数组比较 - 避免不必要的重新渲染
 */
export function arrayEquals(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 深度比较对象 - 用于props变化检测
 */
export function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) return true;

  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

/**
 * 批量DOM操作 - 减少重排重绘
 */
export function batchDOMUpdates(updates) {
  // 使用 requestAnimationFrame 批量更新DOM
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

/**
 * 懒加载组件包装器
 */
export function lazyLoad(component, options = {}) {
  return {
    component,
    loading: options.loading || null,
    error: options.error || null,
    delay: options.delay || 200,
    timeout: options.timeout || 3000
  };
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
  }

  start(label) {
    this.timers.set(label, performance.now());
  }

  end(label) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ [Performance] ${label}: ${duration.toFixed(2)}ms`);
      this.timers.delete(label);
      return duration;
    }
    return 0;
  }

  measure(label, fn) {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  async measureAsync(label, fn) {
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 渲染优化工具
 */
export class RenderOptimizer {
  constructor() {
    this.pendingUpdates = new Set();
    this.isScheduled = false;
  }

  scheduleUpdate(updateFn) {
    this.pendingUpdates.add(updateFn);

    if (!this.isScheduled) {
      this.isScheduled = true;
      requestAnimationFrame(() => {
        this.flushUpdates();
      });
    }
  }

  flushUpdates() {
    const updates = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();
    this.isScheduled = false;

    // 批量执行更新
    updates.forEach(update => {
      try {
        update();
      } catch (error) {
        console.error('Render update error:', error);
      }
    });
  }
}

// 全局渲染优化器实例
export const renderOptimizer = new RenderOptimizer();