<template>
  <div
    class="virtual-file-list"
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
      <!-- 可见项目 -->
      <div
        v-for="file in visibleFiles"
        :key="file.name"
        class="virtual-item"
        :style="{
          position: 'absolute',
          top: getItemTop(file.index) + 'px',
          width: '100%',
          height: itemHeight + 'px'
        }"
      >
        <FileListItem
          :file="file"
          :is-selected="selectedFiles.has(file.name)"
          @select="handleSelect"
          @open="handleOpen"
          @download="handleDownload"
          @rename="handleRename"
          @delete="handleDelete"
          @context-menu="handleContextMenu"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在加载...</p>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && files.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <h3>空目录</h3>
      <p>此目录中没有文件或文件夹</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { calculateVisibleItems, throttle } from '@/utils/performanceUtils';
import FileListItem from './FileListItem.vue';

export default {
  name: 'VirtualFileList',
  components: {
    FileListItem
  },
  props: {
    files: {
      type: Array,
      default: () => []
    },
    selectedFiles: {
      type: Set,
      default: () => new Set()
    },
    loading: {
      type: Boolean,
      default: false
    },
    itemHeight: {
      type: Number,
      default: 60
    },
    containerHeight: {
      type: Number,
      default: 400
    },
    overscan: {
      type: Number,
      default: 5
    }
  },
  emits: ['select', 'open', 'download', 'rename', 'delete', 'context-menu'],
  setup(props, { emit }) {
    const scrollContainer = ref(null);
    const scrollTop = ref(0);

    // 计算可见文件
    const visibleRange = computed(() => {
      return calculateVisibleItems({
        scrollTop: scrollTop.value,
        containerHeight: props.containerHeight,
        itemHeight: props.itemHeight,
        totalCount: props.files.length,
        overscan: props.overscan
      });
    });

    // 可见文件列表
    const visibleFiles = computed(() => {
      const { startIndex, endIndex } = visibleRange.value;
      return props.files.slice(startIndex, endIndex + 1).map((file, index) => ({
        ...file,
        index: startIndex + index
      }));
    });

    // 总高度
    const totalHeight = computed(() => {
      return props.files.length * props.itemHeight;
    });

    // 获取项目顶部位置
    const getItemTop = (index) => {
      return index * props.itemHeight;
    };

    // 节流的滚动处理
    const handleScroll = throttle((event) => {
      scrollTop.value = event.target.scrollTop;
    }, 16); // 约60fps

    // 滚动到指定文件
    const scrollToItem = (index) => {
      if (!scrollContainer.value) return;

      const targetTop = index * props.itemHeight;
      const containerHeight = props.containerHeight;
      const scrollTop = scrollContainer.value.scrollTop;

      // 确保目标项目在可视区域内
      if (targetTop < scrollTop) {
        scrollContainer.value.scrollTop = targetTop;
      } else if (targetTop + props.itemHeight > scrollTop + containerHeight) {
        scrollContainer.value.scrollTop = targetTop + props.itemHeight - containerHeight;
      }
    };

    // 滚动到文件
    const scrollToFile = (filename) => {
      const index = props.files.findIndex(file => file.name === filename);
      if (index !== -1) {
        scrollToItem(index);
      }
    };

    // 事件处理
    const handleSelect = (file, event) => {
      emit('select', file, event);
    };

    const handleOpen = (file) => {
      emit('open', file);
    };

    const handleDownload = (file) => {
      emit('download', file);
    };

    const handleRename = (file) => {
      emit('rename', file);
    };

    const handleDelete = (file) => {
      emit('delete', file);
    };

    const handleContextMenu = ({ event, file }) => {
      emit('context-menu', { event, file });
    };

    // 键盘导航
    const handleKeyNavigation = (event) => {
      if (!props.selectedFiles.size) return;

      const selectedArray = Array.from(props.selectedFiles);
      const lastSelected = selectedArray[selectedArray.length - 1];
      const currentIndex = props.files.findIndex(file => file.name === lastSelected);

      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          newIndex = Math.min(props.files.length - 1, currentIndex + 1);
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = props.files.length - 1;
          break;
        case 'PageUp':
          event.preventDefault();
          newIndex = Math.max(0, currentIndex - Math.floor(props.containerHeight / props.itemHeight));
          break;
        case 'PageDown':
          event.preventDefault();
          newIndex = Math.min(props.files.length - 1, currentIndex + Math.floor(props.containerHeight / props.itemHeight));
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        const newFile = props.files[newIndex];
        if (newFile) {
          scrollToItem(newIndex);
          emit('select', newFile, {
            ctrlKey: event.ctrlKey || event.metaKey,
            shiftKey: event.shiftKey
          });
        }
      }
    };

    // 生命周期
    onMounted(() => {
      document.addEventListener('keydown', handleKeyNavigation);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyNavigation);
    });

    // 监听文件变化，自动调整滚动位置
    watch(() => props.files.length, (newLength, oldLength) => {
      if (newLength < oldLength && scrollTop.value > 0) {
        // 如果文件数量减少，调整滚动位置
        const maxScrollTop = Math.max(0, totalHeight.value - props.containerHeight);
        if (scrollTop.value > maxScrollTop) {
          scrollTop.value = maxScrollTop;
          if (scrollContainer.value) {
            scrollContainer.value.scrollTop = maxScrollTop;
          }
        }
      }
    });

    return {
      scrollContainer,
      scrollTop,
      visibleFiles,
      totalHeight,
      getItemTop,
      handleScroll,
      scrollToItem,
      scrollToFile,
      handleSelect,
      handleOpen,
      handleDownload,
      handleRename,
      handleDelete,
      handleContextMenu
    };
  }
};
</script>

<style lang="scss" scoped>
.virtual-file-list {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1a1a1a;
}

.virtual-scroll-content {
  position: relative;
}

.virtual-item {
  border-bottom: 1px solid #333;
}

.virtual-item:last-child {
  border-bottom: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #444;
  border-top: 3px solid #74c0fc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #868e96;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #ffffff;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #868e96;
}

// 滚动条样式
.virtual-file-list::-webkit-scrollbar {
  width: 8px;
}

.virtual-file-list::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.virtual-file-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;

  &:hover {
    background: #777;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>