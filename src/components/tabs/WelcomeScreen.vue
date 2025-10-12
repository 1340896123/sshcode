<template>
  <div class="welcome-screen">
    <div class="welcome-content">
      <div class="welcome-icon">🖥️</div>
      <h1>SSH Remote</h1>
      <p class="welcome-subtitle">安全的SSH远程连接管理工具</p>
      <div class="feature-list">
        <div class="feature-item">
          <span class="feature-icon">🔐</span>
          <span>支持密码和密钥认证</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">⚡</span>
          <span>快速连接测试</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📁</span>
          <span>文件传输管理</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">💾</span>
          <span>连接配置保存</span>
        </div>
      </div>
      <div class="action-buttons">
        <button class="primary-btn" @click="$emit('open-session-modal')">
          <span class="btn-icon">🔗</span>
          创建连接
        </button>
        <button class="secondary-btn" @click="$emit('open-session-modal')">
          <span class="btn-icon">📚</span>
          查看帮助
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WelcomeScreen',
  emits: ['open-session-modal']
}
</script>

<style lang="scss" scoped>
.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.welcome-content {
  text-align: center;
  max-width: 600px;
}

.welcome-icon {
  font-size: 120px;
  margin-bottom: spacing(lg);
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.welcome-content h1 {
  font-size: font-size(xxxl);
  font-weight: font-weight(bold);
  color: color(text-primary);
  margin: 0 0 spacing(sm) 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.welcome-subtitle {
  font-size: font-size(lg);
  color: color(text-secondary);
  margin: 0 0 spacing(xl) 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: spacing(md);
  margin: spacing(xl) 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(md);
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  transition: all transition(normal) ease;

  &:hover {
    background: color(bg-tertiary);
    transform: translateY(-2px);
    box-shadow: shadow(md);
  }
}

.feature-icon {
  font-size: 20px;
}

.action-buttons {
  display: flex;
  gap: spacing(md);
  justify-content: center;
  flex-wrap: wrap;
}

.primary-btn, .secondary-btn {
  @include button-base;
  padding: spacing(md) spacing(xl);
  font-size: font-size(base);
  border-radius: border-radius(lg);
  display: flex;
  align-items: center;
  gap: spacing(sm);
  transition: all transition(normal) ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.primary-btn {
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);
  box-shadow: shadow(md);

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
    box-shadow: shadow(lg);
  }
}

.secondary-btn {
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

@media (max-width: 768px) {
  .feature-list {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>
