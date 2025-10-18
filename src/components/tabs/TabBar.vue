<template>
  <div class="tab-bar" :class="{ 'empty-tabs': connections.length === 0 }">
    <div class="tab-list" :class="{ 'has-tabs': connections.length > 0 }">
      <div
        v-for="(connection, index) in connections"
        :key="connection.id"
        class="tab-item"
        :class="{
          active: activeTabId === connection.id,
          editing: editingTabId === connection.id,
          dragging: draggedTabIndex === index,
          'drag-over': dragOverIndex === index
        }"
        role="tab"
        :aria-selected="activeTabId === connection.id"
        :aria-label="`连接标签页: ${connection.name}, 状态: ${getConnectionStatusText(connection.status)}`"
        :tabindex="activeTabId === connection.id ? 0 : -1"
        @click="$emit('switch-tab', connection.id)"
        @dblclick="startEditing(connection.id)"
        @contextmenu.prevent="showContextMenu($event, connection)"
        @keydown="handleTabKeydown($event, connection.id, index)"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, index)"
      >
        <div class="tab-content">
          <span class="tab-icon">{{ getConnectionIcon(connection) }}</span>
          <!-- 编辑模式 -->
          <input
            v-if="editingTabId === connection.id"
            ref="editInput"
            v-model="editingTabName"
            v-click-outside="cancelEditing"
            class="tab-title-input"
            role="textbox"
            :aria-label="`编辑标签页名称: ${editingTabName}`"
            :title="`编辑标签页名称: ${editingTabName}`"
            @keydown.enter="finishEditing"
            @keydown.esc="cancelEditing"
            @click.stop
            @blur="finishEditing"
          />
          <!-- 显示模式 -->
          <span v-else class="tab-title">{{ connection.name }}</span>
          <span class="tab-status" :class="connection.status"></span>
        </div>
        <button
          class="tab-close"
          :aria-label="`关闭连接: ${connection.name}`"
          title="关闭连接"
          @click.stop="$emit('close-connection', connection.id)"
          @keydown.enter.stop="$emit('close-connection', connection.id)"
        >
          ×
        </button>
      </div>

      <!-- 当没有连接时显示提示信息 -->
      <div v-if="connections.length === 0" class="empty-tabs-hint">
        <span class="hint-text">暂无连接</span>
      </div>
    </div>
    <button
      class="new-tab-btn"
      @click="$emit('open-session-modal')"
      :title="connections.length === 0 ? '创建第一个连接' : '新建连接'"
      :aria-label="connections.length === 0 ? '创建第一个SSH连接' : '新建SSH连接标签页'"
      @keydown.enter="$emit('open-session-modal')"
    >
      <span class="btn-text">{{ connections.length === 0 ? '创建第一个连接' : '+' }}</span>
    </button>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="tab-context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="startEditing(contextMenu.connection.id)">
        <span class="menu-icon">✏️</span>
        <span>重命名标签页</span>
      </div>
      <div class="context-menu-item" @click="duplicateConnection(contextMenu.connection)">
        <span class="menu-icon">📋</span>
        <span>复制连接</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" @click="closeConnection(contextMenu.connection.id)">
        <span class="menu-icon">❌</span>
        <span>关闭连接</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { clickOutside } from '@/directives';

export default {
  name: 'TabBar',
  directives: {
    clickOutside
  },
  props: {
    connections: {
      type: Array,
      default: () => []
    },
    activeTabId: {
      type: String,
      default: null
    }
  },
  emits: ['switch-tab', 'close-connection', 'open-session-modal', 'rename-connection', 'duplicate-connection', 'reorder-tabs'],
  setup(props, { emit }) {
    const editingTabId = ref(null);
    const editingTabName = ref('');
    const editInput = ref(null);
    const contextMenu = ref({
      visible: false,
      x: 0,
      y: 0,
      connection: null
    });

    // 拖拽状态
    const draggedTabIndex = ref(null);
    const dragOverIndex = ref(null);

    // 开始编辑标签页名称
    const startEditing = async (connectionId) => {
      const connection = props.connections.find(c => c.id === connectionId);
      if (!connection) return;

      editingTabId.value = connectionId;
      editingTabName.value = connection.name;

      await nextTick();
      if (editInput.value) {
        editInput.value.focus();
        editInput.value.select();
      }
    };

    // 完成编辑
    const finishEditing = () => {
      if (editingTabId.value && editingTabName.value.trim()) {
        emit('rename-connection', editingTabId.value, editingTabName.value.trim());
      }
      cancelEditing();
    };

    // 取消编辑
    const cancelEditing = () => {
      editingTabId.value = null;
      editingTabName.value = '';
    };

    // 显示右键菜单
    const showContextMenu = (event, connection) => {
      contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        connection
      };

      // 点击其他地方关闭菜单
      document.addEventListener('click', hideContextMenu);
    };

    // 隐藏右键菜单
    const hideContextMenu = () => {
      contextMenu.value.visible = false;
      document.removeEventListener('click', hideContextMenu);
    };

    // 复制连接
    const duplicateConnection = (connection) => {
      hideContextMenu();
      emit('duplicate-connection', connection);
    };

    // 关闭连接
    const closeConnection = (connectionId) => {
      hideContextMenu();
      emit('close-connection', connectionId);
    };

    // 拖拽开始
    const handleDragStart = (event, index) => {
      draggedTabIndex.value = index;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', event.target.innerHTML);
      event.target.style.opacity = '0.5';
    };

    // 拖拽结束
    const handleDragEnd = (event) => {
      draggedTabIndex.value = null;
      dragOverIndex.value = null;
      event.target.style.opacity = '';
    };

    // 拖拽悬停
    const handleDragOver = (event, index) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      if (draggedTabIndex.value !== null && draggedTabIndex.value !== index) {
        dragOverIndex.value = index;
      }
    };

    // 拖拽离开
    const handleDragLeave = () => {
      // 延迟清除以避免闪烁
      setTimeout(() => {
        if (dragOverIndex.value !== null) {
          dragOverIndex.value = null;
        }
      }, 100);
    };

    // 放置
    const handleDrop = (event, dropIndex) => {
      event.preventDefault();
      event.stopPropagation();

      if (draggedTabIndex.value !== null && draggedTabIndex.value !== dropIndex) {
        const dragIndex = draggedTabIndex.value;

        // 发送重新排序事件
        emit('reorder-tabs', {
          fromIndex: dragIndex,
          toIndex: dropIndex
        });
      }

      draggedTabIndex.value = null;
      dragOverIndex.value = null;
    };

    // 获取连接图标
    const getConnectionIcon = (connection) => {
      const icons = {
        connecting: '⏳',
        connected: '🟢',
        failed: '❌',
        disconnected: '🔌'
      };
      return icons[connection.status] || '🔌';
    };

    // 获取连接状态文本（用于屏幕阅读器）
    const getConnectionStatusText = (status) => {
      const statusTexts = {
        connecting: '连接中',
        connected: '已连接',
        failed: '连接失败',
        disconnected: '已断开',
        reconnecting: '重连中'
      };
      return statusTexts[status] || '未知状态';
    };

    // 处理标签页键盘导航
    const handleTabKeydown = (event, connectionId, index) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          navigateToTab('left', index);
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateToTab('right', index);
          break;
        case 'Home':
          event.preventDefault();
          navigateToTab('first', 0);
          break;
        case 'End':
          event.preventDefault();
          navigateToTab('last', props.connections.length - 1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          emit('switch-tab', connectionId);
          break;
        case 'Delete':
        case 'Backspace':
          if (event.shiftKey) {
            event.preventDefault();
            emit('close-connection', connectionId);
          }
          break;
        case 'F2':
          event.preventDefault();
          startEditing(connectionId);
          break;
      }
    };

    // 导航到指定标签页
    const navigateToTab = (direction, currentIndex) => {
      let targetIndex;

      switch (direction) {
        case 'left':
          targetIndex = currentIndex > 0 ? currentIndex - 1 : props.connections.length - 1;
          break;
        case 'right':
          targetIndex = currentIndex < props.connections.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'first':
          targetIndex = 0;
          break;
        case 'last':
          targetIndex = props.connections.length - 1;
          break;
        default:
          return;
      }

      if (targetIndex >= 0 && targetIndex < props.connections.length) {
        const targetConnection = props.connections[targetIndex];
        emit('switch-tab', targetConnection.id);
      }
    };

    // 键盘快捷键支持
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && contextMenu.value.visible) {
        hideContextMenu();
      }
    };

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('click', hideContextMenu);
    });

    return {
      editingTabId,
      editingTabName,
      editInput,
      contextMenu,
      draggedTabIndex,
      dragOverIndex,
      startEditing,
      finishEditing,
      cancelEditing,
      showContextMenu,
      hideContextMenu,
      duplicateConnection,
      closeConnection,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      getConnectionIcon,
      getConnectionStatusText,
      handleTabKeydown,
      navigateToTab
    };
  }
};
</script>

<style lang="scss" scoped>
.tab-bar {
  display: flex;
  align-items: center;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  padding: 0 spacing(sm);
  min-height: 48px;

  &.empty-tabs {
    justify-content: center;
  }
}

.tab-list {
  display: flex;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &.has-tabs {
    // 有标签页时的样式
  }

  &:not(.has-tabs) {
    justify-content: center;
    align-items: center;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  background: color(bg-tertiary);
  border: 1px solid color(border);
  border-bottom: none;
  border-radius: border-radius(md) border-radius(md) 0 0;
  cursor: pointer;
  transition: all transition(fast) ease;
  min-width: 150px;
  max-width: 250px;
  position: relative;

  &:hover {
    background: color(surface);
    border-color: color(primary);
  }

  &.active {
    background: color(surface);
    border-color: color(primary);
    border-bottom: 1px solid color(surface);
    margin-bottom: -1px;
    z-index: 1;

    .tab-status {
      &.connected {
        background: color(success);
      }
    }
  }
}

.tab-content {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  flex: 1;
  min-width: 0;
}

.tab-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tab-title {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tab-title-input {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
  background: color(bg-primary);
  border: 1px solid color(primary);
  border-radius: border-radius(sm);
  padding: 2px 6px;
  outline: none;
  flex: 1;
  min-width: 80px;

  &:focus {
    border-color: color(primary);
    box-shadow: 0 0 0 2px rgba(color(primary), 0.2);
  }
}

.tab-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.connecting {
    background: color(warning);
    animation: pulse 1.5s infinite;
  }

  &.connected {
    background: color(success);
  }

  &.failed {
    background: color(error);
  }

  &.disconnected {
    background: color(text-muted);
  }
}

.tab-close {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: color(text-muted);
  font-size: 16px;
  cursor: pointer;
  border-radius: border-radius(full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.new-tab-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }

  .btn-text {
    white-space: nowrap;
  }
}

.empty-tabs-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;

  .hint-text {
    color: color(text-muted);
    font-size: font-size(sm);
    font-style: italic;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

// 右键菜单样式
.tab-context-menu {
  position: fixed;
  background: color(surface);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  padding: spacing(xs) 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  cursor: pointer;
  transition: background-color transition(fast) ease;
  font-size: font-size(sm);
  color: color(text-primary);

  &:hover {
    background: color(bg-tertiary);
  }

  &.danger {
    color: color(error);

    &:hover {
      background: rgba(color(error), 0.1);
    }
  }
}

.context-menu-separator {
  height: 1px;
  background: color(border);
  margin: spacing(xs) 0;
}

.menu-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

// 编辑状态样式
.tab-item.editing {
  .tab-content {
    background: color(surface);
  }
}

// 拖拽状态样式
.tab-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.tab-item.drag-over {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: color(primary);
    z-index: 1;
  }
}

@media (max-width: 768px) {
  .tab-bar {
    padding: 0 spacing(xs);
  }

  .tab-item {
    min-width: 120px;
    max-width: 180px;
  }

  .tab-context-menu {
    min-width: 160px;
  }
}
</style>
