<template>
  <div class="disconnected-container">
    <div class="disconnected-content">
      <div class="disconnected-icon">🔌</div>
      <h3>连接已断开</h3>
      <p>SSH连接已安全断开</p>
      <button class="reconnect-btn" @click="$emit('reconnect')">
        🔗 重新连接
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DisconnectedState',
  props: {
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['reconnect']
}
</script>

<style lang="scss" scoped>
.disconnected-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.disconnected-content {
  text-align: center;
  max-width: 400px;
}

.disconnected-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.disconnected-content h3 {
  font-size: font-size(xl);
  color: color(text-primary);
  margin: 0 0 spacing(md) 0;
}

.disconnected-content p {
  color: color(text-secondary);
  margin: 0 0 spacing(lg) 0;
  line-height: line-height(relaxed);
}

.reconnect-btn {
  @include button-base;
  padding: spacing(sm) spacing(lg);
  background: color(primary);
  color: color(white);
  border-radius: border-radius(md);

  &:hover {
    background: color(primary-light);
  }
}
</style>
