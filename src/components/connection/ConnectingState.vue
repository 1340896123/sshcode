<template>
  <div class="connecting-container">
    <div class="connecting-animation">
      <div class="loading-spinner"></div>
      <p>正在连接到 {{ connection.host }}...</p>
      <div class="connecting-steps">
        <div class="step" :class="{ completed: connection.connectStep >= 1 }">
          <span class="step-icon">🔍</span>
          <span class="step-text">解析主机地址</span>
        </div>
        <div class="step" :class="{ completed: connection.connectStep >= 2 }">
          <span class="step-icon">🔐</span>
          <span class="step-text">身份验证</span>
        </div>
        <div class="step" :class="{ completed: connection.connectStep >= 3 }">
          <span class="step-icon">🔗</span>
          <span class="step-text">建立SSH连接</span>
        </div>
      </div>
      <div class="cancel-button-container">
        <button class="cancel-button" @click="handleCancel" :disabled="isCancelling">
          <span v-if="!isCancelling" class="cancel-icon">✕</span>
          <span v-else class="cancel-spinner"></span>
          {{ isCancelling ? '取消中...' : '取消连接' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'ConnectingState',
  props: {
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['cancel-connection'],
  setup(props, { emit }) {
    const isCancelling = ref(false);

    const handleCancel = async () => {
      if (isCancelling.value) return;

      isCancelling.value = true;
      try {
        emit('cancel-connection', props.connection.id);
      } finally {
        // 延迟重置状态，给用户反馈时间
        setTimeout(() => {
          isCancelling.value = false;
        }, 1000);
      }
    };

    return {
      isCancelling,
      handleCancel
    };
  }
};
</script>

<style lang="scss" scoped>
.connecting-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.connecting-animation {
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid color(border);
  border-top: 4px solid color(primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto spacing(lg);
}

.connecting-steps {
  margin-top: spacing(lg);
  display: flex;
  flex-direction: column;
  gap: spacing(sm);
}

.step {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(sm);
  border-radius: border-radius(sm);
  transition: all transition(normal) ease;

  &.completed {
    background: rgba(82, 196, 26, 0.1);
    color: color(success);
  }
}

.step-icon {
  font-size: 18px;
}

.step-text {
  font-size: font-size(sm);
  color: color(text-secondary);

  .completed & {
    color: color(success);
  }
}

.cancel-button-container {
  margin-top: spacing(xl);
  display: flex;
  justify-content: center;
}

.cancel-button {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(sm) spacing(lg);
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  color: color(error);
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  font-weight: 500;
  cursor: pointer;
  transition: all transition(normal) ease;
  backdrop-filter: blur(4px);

  &:hover:not(:disabled) {
    background: rgba(255, 77, 79, 0.15);
    border-color: rgba(255, 77, 79, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 77, 79, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(255, 77, 79, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

.cancel-icon {
  font-size: 16px;
  font-weight: bold;
}

.cancel-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 77, 79, 0.3);
  border-top: 2px solid color(error);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
