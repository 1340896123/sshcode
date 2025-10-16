<template>
  <div class="connection-failed-container">
    <div class="failed-content">
      <div class="failed-icon">❌</div>
      <h3>连接失败</h3>
      <p class="failed-message">{{ connection.errorMessage || '未知错误' }}</p>
      <div class="failed-actions">
        <button class="retry-btn" @click="$emit('reconnect')">🔄 重试连接</button>
        <button class="edit-btn" @click="$emit('edit')">✏️ 编辑配置</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConnectionFailedState',
  props: {
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['reconnect', 'edit']
};
</script>

<style lang="scss" scoped>
.connection-failed-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.failed-content {
  text-align: center;
  max-width: 400px;
}

.failed-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.failed-content h3 {
  font-size: font-size(xl);
  color: color(text-primary);
  margin: 0 0 spacing(md) 0;
}

.failed-message {
  color: color(text-secondary);
  margin: 0 0 spacing(lg) 0;
  line-height: line-height(relaxed);
}

.failed-actions {
  display: flex;
  gap: spacing(md);
  justify-content: center;
}

.retry-btn,
.edit-btn {
  @include button-base;
  padding: spacing(sm) spacing(lg);
  border-radius: border-radius(md);
}

.retry-btn {
  background: color(primary);
  color: color(white);

  &:hover {
    background: color(primary-light);
  }
}

.edit-btn {
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

@media (max-width: 768px) {
  .failed-actions {
    flex-direction: column;
  }
}
</style>
