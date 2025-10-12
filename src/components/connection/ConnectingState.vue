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
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConnectingState',
  props: {
    connection: {
      type: Object,
      required: true
    }
  }
}
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
