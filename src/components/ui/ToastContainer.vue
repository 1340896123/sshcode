<template>
  <div class="toast-container">
    <transition-group name="toast" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="[`toast-${toast.type}`]"
        @click="removeToast(toast.id)"
      >
        <div class="toast-icon">
          {{ getToastIcon(toast.type) }}
        </div>
        <div class="toast-content">
          <div class="toast-message">
            {{ toast.message }}
          </div>
          <div v-if="toast.duration && toast.duration > 0" class="toast-progress">
            <div
              class="toast-progress-bar"
              :style="{ animationDuration: `${toast.duration}ms` }"
            ></div>
          </div>
        </div>
        <button class="toast-close" @click.stop="removeToast(toast.id)">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'ToastContainer',
  props: {
    toasts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['remove'],
  setup(props, { emit }) {
    const removeToast = id => {
      emit('remove', id);
    };

    const getToastIcon = type => {
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      return icons[type] || icons.info;
    };

    return {
      removeToast,
      getToastIcon
    };
  }
};
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1030;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;

  /* 响应式调整 */
  @media (max-width: 768px) {
    top: 70px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  background: #262626;
  border: 1px solid #404040;
  color: #ffffff;
}

.toast-success {
  border-color: #52c41a;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.1), rgba(82, 196, 26, 0.05));
}

.toast-error {
  border-color: #ff4d4f;
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.1), rgba(255, 77, 79, 0.05));
}

.toast-warning {
  border-color: #faad14;
  background: linear-gradient(135deg, rgba(250, 173, 20, 0.1), rgba(250, 173, 20, 0.05));
}

.toast-info {
  border-color: #1890ff;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(24, 144, 255, 0.05));
}

.toast-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toast-message {
  font-size: 14px;
  line-height: 1.5;
}

.toast-progress {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.toast-progress-bar {
  height: 100%;
  background: currentColor;
  border-radius: 2px;
  animation: toast-progress linear forwards;
  opacity: 0.8;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #737373;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.15s ease;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* Toast transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
