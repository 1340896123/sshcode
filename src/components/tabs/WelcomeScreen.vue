<template>
  <div class="welcome-screen">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <!-- 主要内容 -->
    <div class="welcome-container">
      <!-- 头部欢迎区域 -->
      <div class="hero-section">
        <div class="hero-content">
          <div class="logo-container">
            <div class="logo-icon">
              <div class="icon-bg"></div>
              <span class="icon-text">🔐</span>
            </div>
          </div>
          <h1 class="hero-title">
            <span class="title-gradient">SSH Remote</span>
          </h1>
          <p class="hero-subtitle">企业级SSH远程连接管理平台</p>
          <div class="hero-badges">
            <span class="badge secure">安全可靠</span>
            <span class="badge efficient">高效管理</span>
            <span class="badge ai">智能助手</span>
          </div>
        </div>
      </div>

      <!-- 功能特性区域 -->
      <div class="features-section">
        <div class="section-header">
          <h3 class="section-title">核心功能</h3>
          <p class="section-subtitle">为专业开发者打造的全方位SSH管理工具</p>
        </div>

        <div class="features-grid">
          <div class="feature-card" v-for="(feature, index) in features" :key="index">
            <div class="feature-icon-wrapper">
              <div class="feature-icon-bg"></div>
              <span class="feature-icon">{{ feature.icon }}</span>
            </div>
            <h4 class="feature-title">{{ feature.title }}</h4>
            <p class="feature-description">{{ feature.description }}</p>
          </div>
        </div>
      </div>

      <!-- 统计信息区域 -->
      <div class="stats-section" v-if="recentSessions.length > 0">
        <div class="stats-container">
          <div class="stats-header">
            <h3 class="stats-title">连接统计</h3>
            <div class="stats-badge">活跃使用</div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon-wrapper">
                <span class="stat-icon">🔗</span>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ recentSessions.length }}</div>
                <div class="stat-label">已保存连接</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon-wrapper">
                <span class="stat-icon">⏰</span>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ lastConnected }}</div>
                <div class="stat-label">最后连接</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮区域 -->
      <div class="actions-section">
        <div class="actions-container">
          <button class="action-btn primary" @click="$emit('open-session-modal')">
            <span class="btn-icon">🚀</span>
            <span class="btn-text">创建连接</span>
            <span class="btn-arrow">→</span>
          </button>
          <button class="action-btn secondary" @click="showHelp = true">
            <span class="btn-icon">📖</span>
            <span class="btn-text">使用指南</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 帮助模态框 -->
    <div v-if="showHelp" class="help-modal" @click="showHelp = false">
      <div class="help-content" @click.stop>
        <div class="help-header">
          <h3>使用指南</h3>
          <button class="close-btn" @click="showHelp = false">×</button>
        </div>
        <div class="help-body">
          <div class="help-section">
            <h4>🚀 快速开始</h4>
            <ol>
              <li>点击"创建连接"按钮添加SSH服务器</li>
              <li>填写服务器信息（主机、端口、用户名）</li>
              <li>选择认证方式（密码或SSH密钥）</li>
              <li>测试连接并保存配置</li>
              <li>开始使用终端和文件管理功能</li>
            </ol>
          </div>

          <div class="help-section">
            <h4>💻 终端操作</h4>
            <ul>
              <li>支持完整的SSH终端功能</li>
              <li>命令历史记录（↑↓键浏览）</li>
              <li>支持Ctrl+C/V复制粘贴</li>
              <li>自动会话保持和超时管理</li>
            </ul>
          </div>

          <div class="help-section">
            <h4>📁 文件管理</h4>
            <ul>
              <li>SFTP文件浏览器</li>
              <li>支持文件上传下载</li>
              <li>右键菜单操作（新建、删除、重命名）</li>
              <li>拖拽文件上传</li>
            </ul>
          </div>

          <div class="help-section">
            <h4>🤖 AI助手</h4>
            <ul>
              <li>自然语言命令执行</li>
              <li>智能命令建议</li>
              <li>危险命令检测和保护</li>
              <li>多AI提供商支持</li>
            </ul>
          </div>

          <div class="help-section">
            <h4>⌨️ 快捷键</h4>
            <ul>
              <li><kbd>Ctrl/Cmd + K</kbd> - 打开连接管理</li>
              <li><kbd>Ctrl/Cmd + \</kbd> - 聚焦终端输入</li>
              <li><kbd>Ctrl/Cmd + /</kbd> - 聚焦AI聊天</li>
              <li><kbd>Esc</kbd> - 关闭模态框</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WelcomeScreen',
  emits: ['open-session-modal'],
  data() {
    return {
      showHelp: false,
      recentSessions: [],
      features: [
        {
          icon: '🔐',
          title: '安全认证',
          description: '支持密码和SSH密钥多种认证方式，确保连接安全'
        },
        {
          icon: '💻',
          title: '完整终端',
          description: '功能完整的SSH终端，支持命令历史和会话管理'
        },
        {
          icon: '📁',
          title: '文件管理',
          description: 'SFTP文件浏览器，支持上传下载和文件操作'
        },
        {
          icon: '🤖',
          title: 'AI助手',
          description: '智能命令执行和建议，让远程操作更高效'
        },
        {
          icon: '⚡',
          title: '快速连接',
          description: '一键连接测试，快速验证服务器可达性'
        },
        {
          icon: '💾',
          title: '配置保存',
          description: '安全保存连接配置，支持分组管理'
        }
      ]
    };
  },
  computed: {
    lastConnected() {
      if (this.recentSessions.length === 0) return '无';
      const now = new Date();
      const lastSession = this.recentSessions[0];
      if (lastSession.lastConnected) {
        const lastTime = new Date(lastSession.lastConnected);
        const diffMs = now - lastTime;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
          }
          return `${diffHours}小时前`;
        } else if (diffDays === 1) {
          return '昨天';
        } else if (diffDays < 7) {
          return `${diffDays}天前`;
        } else {
          return lastTime.toLocaleDateString();
        }
      }
      return '未知';
    }
  },
  async mounted() {
    await this.loadRecentSessions();
  },
  methods: {
    async loadRecentSessions() {
      try {
        if (window.electronAPI && window.electronAPI.getSessions) {
          this.recentSessions = await window.electronAPI.getSessions();
        }
      } catch (error) {
        console.warn('无法加载最近会话:', error);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.welcome-screen {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}

/* 背景装饰 */
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 6s ease-in-out infinite;

  &.orb-1 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    top: -100px;
    left: -100px;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #10b981, #3b82f6);
    bottom: -50px;
    right: -50px;
    animation-delay: 2s;
  }

  &.orb-3 {
    width: 250px;
    height: 250px;
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    top: 50%;
    left: 60%;
    animation-delay: 4s;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

.grid-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* 主容器 */
.welcome-container {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  width: 100%;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
  max-height: 100%;
}

/* 英雄区域 */
.hero-section {
  text-align: center;
  flex-shrink: 0;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.logo-container {
  margin-bottom: 1.5rem;
}

.logo-icon {
  position: relative;
  display: inline-block;
  width: 80px;
  height: 80px;
  margin: 0 auto;
}

.icon-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 20px;
  transform: rotate(6deg);
  box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3);
  animation: logoFloat 3s ease-in-out infinite;
}

@keyframes logoFloat {
  0%,
  100% {
    transform: rotate(6deg) translateY(0px);
  }
  50% {
    transform: rotate(6deg) translateY(-10px);
  }
}

.icon-text {
  position: relative;
  font-size: 2rem;
  line-height: 80px;
  display: block;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.hero-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  margin: 0 0 0.75rem 0;
  line-height: 1.1;
}

.title-gradient {
  background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 80px rgba(96, 165, 250, 0.5);
}

.hero-subtitle {
  font-size: clamp(0.875rem, 2vw, 1rem);
  color: #94a3b8;
  margin: 0 0 1rem 0;
  font-weight: 400;
}

.hero-badges {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.badge {
  padding: 0.375rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &.secure {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.2);
  }

  &.efficient {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.2);
  }

  &.ai {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
    border-color: rgba(168, 85, 247, 0.2);
  }
}

/* 功能特性区域 */
.features-section {
  flex-shrink: 0;
}

.section-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem 0;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.feature-card {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-8px);
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

    &::before {
      opacity: 1;
    }

    .feature-icon-bg {
      transform: scale(1.1);
    }
  }
}

.feature-icon-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 0.75rem;
}

.feature-icon-bg {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 0.75rem;
  transition: transform 0.3s ease;
}

.feature-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.25rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.feature-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.375rem 0;
}

.feature-description {
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
  font-size: 0.875rem;
}

/* 统计区域 */
.stats-section {
  flex-shrink: 0;
}

.stats-container {
  background: rgba(30, 41, 59, 0.3);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stats-title {
  font-size: clamp(1.125rem, 2.5vw, 1.25rem);
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.stats-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    background: rgba(15, 23, 42, 0.8);
  }
}

.stat-icon-wrapper {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  font-size: 1rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 0.125rem;
}

.stat-label {
  color: #94a3b8;
  font-size: 0.75rem;
}

/* 操作按钮区域 */
.actions-section {
  text-align: center;
  flex-shrink: 0;
}

.actions-container {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  cursor: pointer;

  &.primary {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }

    &:hover::before {
      left: 100%;
    }
  }

  &.secondary {
    background: rgba(30, 41, 59, 0.5);
    color: #f1f5f9;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);

    &:hover {
      background: rgba(30, 41, 59, 0.8);
      transform: translateY(-2px);
    }
  }
}

.btn-icon {
  font-size: 1.125rem;
}

.btn-text {
  font-weight: 600;
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.action-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* 帮助模态框 */
.help-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.help-content {
  background: linear-gradient(135deg, #1e293b, #334155);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  max-width: 800px;
  max-height: 80vh;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.5);
}

.help-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #f1f5f9;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
  }
}

.help-body {
  padding: 1.5rem;
  max-height: calc(80vh - 100px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.help-section {
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #60a5fa;
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  ul,
  ol {
    margin: 0;
    padding-left: 1.5rem;
    color: #cbd5e1;
    line-height: 1.7;

    li {
      margin-bottom: 0.5rem;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

kbd {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #60a5fa;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .welcome-container {
    padding: 1rem;
  }

  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .welcome-screen {
    padding: 0.5rem 0;
  }

  .welcome-container {
    padding: 0.5rem;
    gap: 1.5rem;
  }

  .hero-section {
    margin-bottom: 1.5rem;
  }

  .logo-icon {
    width: 100px;
    height: 100px;
  }

  .icon-text {
    font-size: 2.5rem;
    line-height: 100px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .feature-card {
    padding: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .stats-container {
    padding: 1.25rem;
  }

  .actions-container {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .action-btn {
    width: 100%;
    max-width: 280px;
    justify-content: center;
    padding: 0.875rem 1.5rem;
  }

  .help-content {
    margin: 0.5rem;
    max-height: 90vh;
    width: calc(100% - 1rem);
  }

  .help-header {
    padding: 1rem;
  }

  .help-body {
    padding: 1rem;
  }

  .gradient-orb {
    filter: blur(60px);

    &.orb-1 {
      width: 250px;
      height: 250px;
    }

    &.orb-2 {
      width: 200px;
      height: 200px;
    }

    &.orb-3 {
      width: 150px;
      height: 150px;
    }
  }
}

/* 小窗口优化 */
@media (max-height: 700px) {
  .welcome-screen {
    align-items: flex-start;
    padding-top: 1rem;
  }

  .welcome-container {
    gap: 1.5rem;
  }

  .hero-section {
    margin-bottom: 1rem;
  }

  .logo-icon {
    width: 80px;
    height: 80px;
  }

  .icon-text {
    font-size: 2rem;
    line-height: 80px;
  }

  .hero-badges {
    margin-bottom: 1rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .feature-card {
    padding: 1rem;
  }

  .stats-container {
    padding: 1rem;
  }

  .stats-header {
    margin-bottom: 1rem;
  }

  .actions-section {
    padding-bottom: 1rem;
  }
}

/* 极小窗口优化 */
@media (max-height: 500px), (max-width: 480px) {
  .welcome-container {
    gap: 1rem;
  }

  .hero-section {
    margin-bottom: 0.75rem;
  }

  .logo-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 1rem;
  }

  .icon-text {
    font-size: 1.5rem;
    line-height: 60px;
  }

  .hero-badges {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .badge {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .feature-card {
    padding: 0.875rem;
  }

  .feature-icon-bg {
    width: 50px;
    height: 50px;
  }

  .feature-icon {
    font-size: 1.25rem;
  }

  .stats-container {
    padding: 0.875rem;
  }

  .stat-card {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .stat-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .stat-icon {
    font-size: 1rem;
  }

  .action-btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
  }
}
</style>
