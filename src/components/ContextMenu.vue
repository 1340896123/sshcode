<template>
  <teleport to="body">
    <div v-if="visible" class="context-menu" :style="{ left: x + 'px', top: y + 'px' }" @click.stop>
      <div class="menu-item" @click="handleCopy" :disabled="!selectedText">
        <span class="menu-icon">📋</span>
        <span class="menu-text">复制</span>
        <span class="menu-shortcut">Ctrl+C</span>
      </div>
      <div class="menu-item" @click="handleAddToAI" :disabled="!selectedText">
        <span class="menu-icon">🤖</span>
        <span class="menu-text">添加到AI助手</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="handleSelectAll">
        <span class="menu-icon">⬚</span>
        <span class="menu-text">全选</span>
        <span class="menu-shortcut">Ctrl+A</span>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  selectedText: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['copy', 'add-to-ai', 'select-all']);

// 处理复制
const handleCopy = () => {
  if (props.selectedText) {
    emit('copy');
  }
};

// 处理添加到AI助手
const handleAddToAI = () => {
  if (props.selectedText) {
    emit('add-to-ai');
  }
};

// 处理全选
const handleSelectAll = () => {
  emit('select-all');
};

// 监听全局点击事件，用于关闭右键菜单
const handleClickOutside = event => {
  if (props.visible && !event.target.closest('.context-menu')) {
    emit('close');
  }
};

// 监听键盘事件
const handleKeyDown = event => {
  if (!props.visible) return;

  switch (event.key) {
    case 'Escape':
      emit('close');
      event.preventDefault();
      break;
    case 'c':
      if (event.ctrlKey || event.metaKey) {
        handleCopy();
        event.preventDefault();
      }
      break;
    case 'a':
      if (event.ctrlKey || event.metaKey) {
        handleSelectAll();
        event.preventDefault();
      }
      break;
  }
};

// 监听ESC键关闭菜单
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});

// 确保菜单不会超出视窗
watch([() => props.x, () => props.y, () => props.visible], () => {
  if (!props.visible) return;

  nextTick(() => {
    const menu = document.querySelector('.context-menu');
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = props.x;
      let newY = props.y;

      // 水平位置调整
      if (rect.right > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }

      // 垂直位置调整
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }

      // 确保不会超出左边界和上边界
      newX = Math.max(10, newX);
      newY = Math.max(10, newY);

      if (newX !== props.x || newY !== props.y) {
        emit('update:position', { x: newX, y: newY });
      }
    }
  });
});
</script>

<style lang="scss" scoped>
.context-menu {
  position: fixed;
  background: var(--bg-secondary, #2a2a2a);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  z-index: 10000;
  backdrop-filter: blur(10px);
  padding: 4px 0;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  color: var(--text-primary, #fff);

  &:hover:not([disabled]) {
    background: var(--bg-tertiary, #333);
  }

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    color: var(--text-muted, #666);
  }

  .menu-icon {
    width: 16px;
    text-align: center;
    font-size: 12px;
  }

  .menu-text {
    flex: 1;
  }

  .menu-shortcut {
    font-size: 11px;
    color: var(--text-secondary, #999);
    font-family: 'Consolas', 'Monaco', monospace;
  }
}

.menu-divider {
  height: 1px;
  background: var(--border-color, #444);
  margin: 4px 8px;
}

// 深色主题变量
:root {
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #1a1a1a;
  --text-primary: #fff;
  --text-secondary: #aaa;
  --text-muted: #666;
  --border-color: #444;
}
</style>
