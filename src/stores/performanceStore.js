import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { performanceMonitor, MemoCache } from '@/utils/performanceUtils.js';

export const usePerformanceStore = defineStore('performance', () => {
  // 性能状态
  const isOptimizedMode = ref(true);
  const virtualScrollingEnabled = ref(true);
  const animationsEnabled = ref(true);
  const maxVisibleItems = ref(100);

  // 性能统计
  const renderTimes = ref([]);
  const memoryUsage = ref([]);
  const lastCleanup = ref(Date.now());

  // 缓存实例
  const renderCache = new MemoCache(50);
  const computationCache = new MemoCache(100);

  // 计算属性
  const averageRenderTime = computed(() => {
    if (renderTimes.value.length === 0) return 0;
    const sum = renderTimes.value.reduce((a, b) => a + b, 0);
    return sum / renderTimes.value.length;
  });

  const isPerformanceGood = computed(() => {
    return averageRenderTime.value < 16; // 60fps = 16ms per frame
  });

  const memoryPressure = computed(() => {
    if (memoryUsage.value.length === 0) return 'low';
    const latest = memoryUsage.value[memoryUsage.value.length - 1];
    if (latest > 80) return 'high';
    if (latest > 50) return 'medium';
    return 'low';
  });

  // 性能优化方法
  const optimizeForLowEndDevice = () => {
    isOptimizedMode.value = true;
    virtualScrollingEnabled.value = true;
    animationsEnabled.value = false;
    maxVisibleItems.value = 50;

    // 清理缓存
    clearCaches();
  };

  const optimizeForHighEndDevice = () => {
    isOptimizedMode.value = false;
    virtualScrollingEnabled.value = true;
    animationsEnabled.value = true;
    maxVisibleItems.value = 200;
  };

  const autoOptimize = () => {
    if (averageRenderTime.value > 33 || memoryPressure.value === 'high') {
      // 性能较差，启用优化模式
      optimizeForLowEndDevice();
    } else if (averageRenderTime.value < 10 && memoryPressure.value === 'low') {
      // 性能良好，禁用优化模式
      optimizeForHighEndDevice();
    }
  };

  // 缓存管理
  const getCachedResult = (key) => {
    return renderCache.get(key);
  };

  const setCachedResult = (key, value) => {
    return renderCache.set(key, value);
  };

  const getCachedComputation = (key) => {
    return computationCache.get(key);
  };

  const setCachedComputation = (key, value) => {
    return computationCache.set(key, value);
  };

  const clearCaches = () => {
    renderCache.clear();
    computationCache.clear();
    lastCleanup.value = Date.now();
  };

  // 性能监控
  const startPerformanceMeasure = (label) => {
    performanceMonitor.start(label);
  };

  const endPerformanceMeasure = (label) => {
    const duration = performanceMonitor.end(label);
    if (duration) {
      recordRenderTime(duration);
    }
    return duration;
  };

  const recordRenderTime = (time) => {
    renderTimes.value.push(time);

    // 只保留最近100次记录
    if (renderTimes.value.length > 100) {
      renderTimes.value.shift();
    }

    // 自动优化
    if (renderTimes.value.length % 10 === 0) {
      autoOptimize();
    }
  };

  const recordMemoryUsage = (usage) => {
    memoryUsage.value.push(usage);

    // 只保留最近50次记录
    if (memoryUsage.value.length > 50) {
      memoryUsage.value.shift();
    }

    // 检查内存压力
    if (usage > 80) {
      clearCaches();
    }
  };

  // 批量更新优化
  const batchUpdate = (updates) => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const startTime = performance.now();

        updates.forEach(update => {
          try {
            update();
          } catch (error) {
            console.error('Batch update error:', error);
          }
        });

        const endTime = performance.now();
        recordRenderTime(endTime - startTime);
        resolve();
      });
    });
  };

  // 延迟执行
  const deferredExecution = (fn, delay = 0) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const startTime = performance.now();
        const result = fn();
        const endTime = performance.now();
        recordRenderTime(endTime - startTime);
        resolve(result);
      }, delay);
    });
  };

  // 定期清理
  const performPeriodicCleanup = () => {
    const now = Date.now();
    const timeSinceLastCleanup = now - lastCleanup.value;

    // 每5分钟清理一次
    if (timeSinceLastCleanup > 5 * 60 * 1000) {
      clearCaches();

      // 清理旧的性能记录
      if (renderTimes.value.length > 50) {
        renderTimes.value = renderTimes.value.slice(-50);
      }
      if (memoryUsage.value.length > 25) {
        memoryUsage.value = memoryUsage.value.slice(-25);
      }
    }
  };

  // 监控内存使用（如果浏览器支持）
  const monitorMemory = () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      const used = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      recordMemoryUsage(used);
    }
  };

  // 获取性能报告
  const getPerformanceReport = () => {
    return {
      averageRenderTime: averageRenderTime.value,
      isPerformanceGood: isPerformanceGood.value,
      memoryPressure: memoryPressure.value,
      optimizedMode: isOptimizedMode.value,
      virtualScrollingEnabled: virtualScrollingEnabled.value,
      animationsEnabled: animationsEnabled.value,
      cacheSize: {
        render: renderCache.cache.size,
        computation: computationCache.cache.size
      },
      lastCleanup: lastCleanup.value,
      totalRenderTimes: renderTimes.value.length,
      totalMemoryReadings: memoryUsage.value.length
    };
  };

  return {
    // 状态
    isOptimizedMode,
    virtualScrollingEnabled,
    animationsEnabled,
    maxVisibleItems,
    averageRenderTime,
    isPerformanceGood,
    memoryPressure,

    // 优化方法
    optimizeForLowEndDevice,
    optimizeForHighEndDevice,
    autoOptimize,

    // 缓存管理
    getCachedResult,
    setCachedResult,
    getCachedComputation,
    setCachedComputation,
    clearCaches,

    // 性能监控
    startPerformanceMeasure,
    endPerformanceMeasure,
    recordRenderTime,
    recordMemoryUsage,
    monitorMemory,

    // 批量操作
    batchUpdate,
    deferredExecution,

    // 维护方法
    performPeriodicCleanup,
    getPerformanceReport
  };
});