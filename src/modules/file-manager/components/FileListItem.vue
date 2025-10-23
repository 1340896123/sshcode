<template>
  <div
    class="file-item"
    :class="{
      selected: isSelected,
      directory: isDirectory
    }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="showContextMenu"
  >
    <!-- 文件图标 -->
    <div class="file-icon">
      {{ fileIcon }}
    </div>

    <!-- 文件信息 -->
    <div class="file-info">
      <div class="file-name" :title="file.name">{{ file.name }}</div>
      <div class="file-description">
        {{ fileSizeDisplay }} • {{ filePermissions }}
      </div>
    </div>

    <!-- 文件元数据 -->
    <div class="file-meta">
      <div class="file-date">{{ formatDate }}</div>
    </div>

    <!-- 操作按钮 -->
    <div class="file-actions">
      <button
        v-if="!isDirectory"
        class="action-btn download"
        @click.stop="downloadFile"
        title="下载"
      >
        ⬇️
      </button>
      <button
        class="action-btn rename"
        @click.stop="renameItem"
        title="重命名"
      >
        ✏️
      </button>
      <button
        class="action-btn delete"
        @click.stop="deleteItem"
        title="删除"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { FILE_ICONS } from '../utils/fileIcons';

export default {
  name: 'FileListItem',
  props: {
    file: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select', 'open', 'download', 'rename', 'delete', 'context-menu'],
  setup(props, { emit }) {
    // 计算属性
    const isDirectory = computed(() => {
      return props.file.type === 'd' || props.file.type?.includes('dir');
    });

    const fileIcon = computed(() => {
      if (isDirectory.value) return '📁';

      const extension = props.file.name.split('.').pop()?.toLowerCase();
      return FILE_ICONS[extension] || '📄';
    });

    const fileSizeDisplay = computed(() => {
      if (isDirectory.value) return '目录';

      const bytes = props.file.size || 0;
      if (bytes === 0) return '0 B';

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    });

    const filePermissions = computed(() => {
      return props.file.permissions || 'rw-r--r--';
    });

    const formatDate = computed(() => {
      if (!props.file.modifyTime) return '-';

      const date = new Date(props.file.modifyTime);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // 事件处理
    const handleClick = (event) => {
      emit('select', props.file, event);
    };

    const handleDoubleClick = () => {
      emit('open', props.file);
    };

    const showContextMenu = (event) => {
      emit('context-menu', {
        event,
        file: props.file
      });
    };

    const downloadFile = () => {
      emit('download', props.file);
    };

    const renameItem = () => {
      emit('rename', props.file);
    };

    const deleteItem = () => {
      emit('delete', props.file);
    };

    return {
      isDirectory,
      fileIcon,
      fileSizeDisplay,
      filePermissions,
      formatDate,
      handleClick,
      handleDoubleClick,
      showContextMenu,
      downloadFile,
      renameItem,
      deleteItem
    };
  }
};
</script>

<style lang="scss" scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  border: 1px solid transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);

    .file-actions {
      opacity: 1;
    }
  }

  &.selected {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
  }

  &.directory {
    font-weight: 500;
  }
}

.file-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.file-description {
  font-size: 12px;
  color: #868e96;
  line-height: 1.3;
}

.file-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.file-date {
  font-size: 12px;
  color: #868e96;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #b0b0b0;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  &.download:hover {
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
  }

  &.rename:hover {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  &.delete:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .file-item {
    padding: 8px 12px;
    gap: 8px;
  }

  .file-icon {
    font-size: 16px;
    width: 20px;
  }

  .file-name {
    font-size: 13px;
  }

  .file-description {
    font-size: 11px;
  }

  .file-meta {
    display: none;
  }

  .file-actions {
    opacity: 1;
  }

  .action-btn {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
}
</style>