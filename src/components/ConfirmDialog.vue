<template>
  <div v-if="visible" class="confirm-dialog-overlay" @click="$emit('cancel')">
    <div class="confirm-dialog" @click.stop>
      <div class="dialog-header">
        <h3 class="dialog-title">{{ title }}</h3>
      </div>

      <div class="dialog-body">
        <div class="dialog-message">{{ message }}</div>

        <!-- 额外的警告信息 -->
        <div v-if="warning" class="dialog-warning">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">{{ warning }}</span>
        </div>

        <!-- 选项列表 -->
        <div v-if="options.length > 0" class="dialog-options">
          <label
            v-for="option in options"
            :key="option.key"
            class="option-item"
          >
            <input
              v-model="selectedOptions"
              type="checkbox"
              :value="option.key"
            />
            <span class="option-text">{{ option.text }}</span>
          </label>
        </div>
      </div>

      <div class="dialog-footer">
        <button
          class="btn btn-cancel"
          @click="$emit('cancel')"
        >
          {{ cancelText }}
        </button>
        <button
          class="btn"
          :class="confirmButtonClass"
          @click="handleConfirm"
          :disabled="confirmDisabled"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'ConfirmDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '确认操作'
    },
    message: {
      type: String,
      default: '确定要执行此操作吗？'
    },
    warning: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: '确认'
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    type: {
      type: String,
      default: 'warning', // warning, danger, info
      validator: (value) => ['warning', 'danger', 'info'].includes(value)
    },
    options: {
      type: Array,
      default: () => []
    },
    confirmDisabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const selectedOptions = ref([]);

    const confirmButtonClass = computed(() => {
      return {
        'btn-warning': props.type === 'warning',
        'btn-danger': props.type === 'danger',
        'btn-primary': props.type === 'info'
      };
    });

    const handleConfirm = () => {
      emit('confirm', {
        options: selectedOptions.value
      });
      // 重置选项
      selectedOptions.value = [];
    };

    return {
      selectedOptions,
      confirmButtonClass,
      handleConfirm
    };
  }
};
</script>

<style lang="scss" scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.confirm-dialog {
  background: color(surface);
  border: 1px solid color(border);
  border-radius: border-radius(lg);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  min-width: 400px;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
}

.dialog-header {
  padding: spacing(lg) spacing(lg) spacing(md);
  border-bottom: 1px solid color(border);
}

.dialog-title {
  margin: 0;
  font-size: font-size(lg);
  font-weight: font-weight(semibold);
  color: color(text-primary);
}

.dialog-body {
  padding: spacing(lg);
}

.dialog-message {
  font-size: font-size(sm);
  color: color(text-primary);
  line-height: 1.5;
  margin-bottom: spacing(md);
}

.dialog-warning {
  display: flex;
  align-items: flex-start;
  gap: spacing(xs);
  padding: spacing(sm);
  background: rgba(color(warning), 0.1);
  border: 1px solid color(warning);
  border-radius: border-radius(sm);
  margin-bottom: spacing(md);
}

.warning-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.warning-text {
  font-size: font-size(sm);
  color: color(warning);
  line-height: 1.4;
}

.dialog-options {
  margin-top: spacing(md);
}

.option-item {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) 0;
  cursor: pointer;
  transition: background-color transition(fast) ease;

  &:hover {
    background: color(bg-tertiary);
    margin: 0 (-spacing(sm));
    padding: spacing(xs) spacing(sm);
    border-radius: border-radius(sm);
  }
}

.option-text {
  font-size: font-size(sm);
  color: color(text-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: spacing(sm);
  padding: spacing(md) spacing(lg) spacing(lg);
  border-top: 1px solid color(border);
}

.btn {
  min-width: 80px;
  padding: spacing(xs) spacing(md);
  border: 1px solid transparent;
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-cancel {
  background: color(bg-secondary);
  border-color: color(border);
  color: color(text-primary);

  &:hover:not(:disabled) {
    background: color(bg-tertiary);
  }
}

.btn-primary {
  background: color(primary);
  color: color(white);

  &:hover:not(:disabled) {
    background: color(primary-dark);
  }
}

.btn-warning {
  background: color(warning);
  color: color(white);

  &:hover:not(:disabled) {
    background: color(warning-dark);
  }
}

.btn-danger {
  background: color(error);
  color: color(white);

  &:hover:not(:disabled) {
    background: color(error-dark);
  }
}

@media (max-width: 768px) {
  .confirm-dialog {
    min-width: 300px;
    max-width: 90vw;
    margin: spacing(md);
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding: spacing(md);
  }
}
</style>