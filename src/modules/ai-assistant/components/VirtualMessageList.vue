<template>
  <div
    class="virtual-message-list"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
    ref="scrollContainer"
  >
    <!-- 虚拟滚动容器 -->
    <div
      class="virtual-scroll-content"
      :style="{
        height: totalHeight + 'px',
        position: 'relative'
      }"
    >
      <!-- 可见消息 -->
      <div
        v-for="message in visibleMessages"
        :key="message.id"
        class="virtual-message"
        :style="{
          position: 'absolute',
          top: getItemTop(message.index) + 'px',
          width: '100%',
          minHeight: getItemHeight(message) + 'px'
        }"
      >
        <component
          :is="getMessageComponent(message)"
          :message="message"
          :collapsed-by-default="message.defaultCollapsed"
          :realtime-output="getRealtimeOutput(message)"
          :show-realtime-output="shouldShowRealtimeOutput(message)"
          @copy-to-clipboard="handleCopyNotification"
          @retry-command="handleRetryCommand"
        />
      </div>
    </div>

    <!-- 底部滚动提示 -->
    <div
      v-if="showScrollToBottom"
      class="scroll-to-bottom"
      @click="scrollToBottom"
    >
      <span>📜 有新消息</span>
      <button>滚动到底部</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { calculateVisibleItems, throttle, MemoCache } from '@/utils/performanceUtils';
import UserMessage from './messages/UserMessage.vue';
import AssistantMessage from './messages/AssistantMessage.vue';
import CommandExecution from './ai/CommandExecution.vue';
import SystemMessage from './messages/SystemMessage.vue';

export default {
  name: 'VirtualMessageList',
  components: {
    UserMessage,
    AssistantMessage,
    CommandExecution,
    SystemMessage
  },
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    containerHeight: {
      type: Number,
      default: 400
    },
    defaultItemHeight: {
      type: Number,
      default: 100
    },
    overscan: {
      type: Number,
      default: 3
    }
  },
  emits: ['copy-to-clipboard', 'retry-command'],
  setup(props, { emit }) {
    const scrollContainer = ref(null);
    const scrollTop = ref(0);
    const isAtBottom = ref(true);
    const showScrollToBottom = ref(false);

    // 消息高度缓存
    const heightCache = new MemoCache(200);

    // 计算消息高度
    const getItemHeight = (message) => {
      const cacheKey = `${message.id}-${message.content?.length || 0}`;
      let height = heightCache.get(cacheKey);

      if (!height) {
        // 估算高度
        const baseHeight = props.defaultItemHeight;
        const contentLength = message.content?.length || 0;
        const hasActions = message.actions && message.actions.length > 0;
        const isToolMessage = ['tool-start', 'tool-complete', 'tool-error'].includes(message.type);

        let extraHeight = 0;

        // 根据内容长度估算高度
        if (contentLength > 500) extraHeight += Math.min(100, Math.floor(contentLength / 50) * 10);
        else if (contentLength > 100) extraHeight += 30;

        // 操作按钮高度
        if (hasActions) extraHeight += 40;

        // 工具消息额外高度
        if (isToolMessage) extraHeight += 60;

        height = baseHeight + extraHeight;
        heightCache.set(cacheKey, height);
      }

      return height;
    };

    // 计算所有消息的累积高度
    const messageHeights = computed(() => {
      const heights = [];
      let totalHeight = 0;

      for (let i = 0; i < props.messages.length; i++) {
        const message = props.messages[i];
        const height = getItemHeight(message);
        heights.push({
          index: i,
          height,
          offset: totalHeight
        });
        totalHeight += height;
      }

      return heights;
    });

    // 查找指定位置的可见范围
    const findVisibleRange = (scrollTop) => {
      const startScroll = scrollTop;
      const endScroll = scrollTop + props.containerHeight;

      let startIndex = 0;
      let endIndex = props.messages.length - 1;

      // 二分查找起始位置
      let left = 0;
      let right = messageHeights.value.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const heightInfo = messageHeights.value[mid];

        if (heightInfo.offset + heightInfo.height <= startScroll) {
          startIndex = mid + 1;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      // 查找结束位置
      left = startIndex;
      right = messageHeights.value.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const heightInfo = messageHeights.value[mid];

        if (heightInfo.offset < endScroll) {
          endIndex = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      // 应用overscan
      startIndex = Math.max(0, startIndex - props.overscan);
      endIndex = Math.min(props.messages.length - 1, endIndex + props.overscan);

      return { startIndex, endIndex };
    };

    // 可见消息列表
    const visibleMessages = computed(() => {
      if (props.messages.length === 0) return [];

      const { startIndex, endIndex } = findVisibleRange(scrollTop.value);

      return props.messages.slice(startIndex, endIndex + 1).map((message, index) => ({
        ...message,
        index: startIndex + index
      }));
    });

    // 总高度
    const totalHeight = computed(() => {
      if (messageHeights.value.length === 0) return 0;
      const lastHeight = messageHeights.value[messageHeights.value.length - 1];
      return lastHeight.offset + lastHeight.height;
    });

    // 获取项目顶部位置
    const getItemTop = (index) => {
      if (index < messageHeights.value.length) {
        return messageHeights.value[index].offset;
      }
      return 0;
    };

    // 获取消息组件类型
    const getMessageComponent = (message) => {
      if (message.role === 'user') return 'UserMessage';
      if (message.role === 'assistant') return 'AssistantMessage';
      if (['tool-start', 'tool-complete', 'tool-error'].includes(message.type)) return 'CommandExecution';
      return 'SystemMessage';
    };

    // 获取实时输出
    const getRealtimeOutput = (message) => {
      // 这里需要从AI聊天状态中获取
      return '';
    };

    // 判断是否显示实时输出
    const shouldShowRealtimeOutput = (message) => {
      return false;
    };

    // 节流的滚动处理
    const handleScroll = throttle((event) => {
      const newScrollTop = event.target.scrollTop;
      scrollTop.value = newScrollTop;

      // 检查是否在底部
      const container = scrollContainer.value;
      if (container) {
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
        isAtBottom.value = atBottom;
        showScrollToBottom.value = !atBottom;
      }
    }, 16);

    // 滚动到底部
    const scrollToBottom = () => {
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
        isAtBottom.value = true;
        showScrollToBottom.value = false;
      }
    };

    // 自动滚动到底部（新消息时）
    const autoScrollToBottom = () => {
      if (isAtBottom.value) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    };

    // 手动滚动到消息
    const scrollToMessage = (messageId) => {
      const index = props.messages.findIndex(msg => msg.id === messageId);
      if (index !== -1 && index < messageHeights.value.length) {
        const offset = messageHeights.value[index].offset;
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = offset;
        }
      }
    };

    // 事件处理
    const handleCopyNotification = (message, type) => {
      emit('copy-to-clipboard', message, type);
    };

    const handleRetryCommand = (command) => {
      emit('retry-command', command);
    };

    // 监听消息变化，自动滚动
    watch(() => props.messages.length, () => {
      autoScrollToBottom();
      // 清理高度缓存
      heightCache.clear();
    });

    // 监听消息内容变化，清理缓存
    watch(() => props.messages.map(m => `${m.id}-${m.content?.length || 0}`).join(','), () => {
      heightCache.clear();
    });

    // 生命周期
    onMounted(() => {
      nextTick(() => {
        scrollToBottom();
      });
    });

    return {
      scrollContainer,
      scrollTop,
      visibleMessages,
      totalHeight,
      showScrollToBottom,
      getItemTop,
      getItemHeight,
      getMessageComponent,
      getRealtimeOutput,
      shouldShowRealtimeOutput,
      handleScroll,
      scrollToBottom,
      scrollToMessage,
      handleCopyNotification,
      handleRetryCommand
    };
  }
};
</script>

<style lang="scss" scoped>
.virtual-message-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  background: #1a1a1a;
}

.virtual-scroll-content {
  position: relative;
}

.virtual-message {
  padding: 8px 0;
}

.scroll-to-bottom {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 100;

  &:hover {
    background: rgba(59, 130, 246, 1);
    transform: translateY(-2px);
  }

  span {
    font-size: 14px;
  }

  button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    color: white;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// 滚动条样式
.virtual-message-list::-webkit-scrollbar {
  width: 6px;
}

.virtual-message-list::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.virtual-message-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;

  &:hover {
    background: #777;
  }
}
</style>