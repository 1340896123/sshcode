<template>
  <div class="tab-manager">
    <div class="tab-content">
      <div class="empty-state">
        <div class="empty-icon">💻</div>
        <h2>欢迎使用 SSH Remote</h2>
        <p>点击上方的"会话管理"按钮创建您的第一个SSH连接</p>
        <button class="primary-btn" @click="$emit('open-session-modal')">
          创建会话
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TabManager',
  emits: ['session-connected', 'session-disconnected', 'show-notification', 'open-session-modal'],
  setup(props, { emit }) {
    return {}
  }
}
</script>

<style lang="scss" scoped>
.tab-manager {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xl);
}

.empty-state {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.empty-state h2 {
  font-size: font-size(xxl);
  color: color(text-primary);
  margin-bottom: spacing(md);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.empty-state p {
  font-size: font-size(lg);
  color: color(text-secondary);
  margin-bottom: spacing(xl);
  line-height: line-height(relaxed);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.primary-btn {
  @include button-base;
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);
  padding: spacing(md) spacing(xl);
  font-size: font-size(base);
  border-radius: border-radius(lg);
  box-shadow: shadow(md);
  transition: all transition(normal) ease;

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
    transform: translateY(-2px);
    box-shadow: shadow(lg);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>