<template>
  <header class="header">
    <!-- 顶部光泽效果 -->
    <div class="header-shine"></div>

    <div class="header-left">
      <!-- Logo区域 -->
      <div class="logo">
        <!-- Logo图标 -->
        <div class="logo-icon">
          S
        </div>
        <h1 class="logo-title">
          SSH Remote
        </h1>
      </div>

      <!-- 会话管理按钮 -->
      <button
        class="session-btn"
        @click="$emit('open-session-modal')"
        @mouseenter="onSessionBtnHover"
        @mouseleave="onSessionBtnLeave"
        @mousedown="onSessionBtnDown"
        @mouseup="onSessionBtnUp"
        ref="sessionBtn"
      >
        <span class="session-btn-icon">🔗</span>
        <span>会话管理</span>
      </button>
    </div>

    <div class="header-right">
      <!-- 连接状态指示器 -->
      <div class="connection-status" :class="{ connected: isConnected }">
        <!-- 状态指示点 -->
        <div class="status-dot" :class="{ connected: isConnected }"></div>
        <span class="status-text">{{ isConnected ? '已连接' : '未连接' }}</span>
      </div>

      <!-- 设置按钮 -->
      <button
        class="settings-btn"
        @click="$emit('open-settings-modal')"
        @mouseenter="onSettingsBtnHover"
        @mouseleave="onSettingsBtnLeave"
        @mousedown="onSettingsBtnDown"
        @mouseup="onSettingsBtnUp"
        ref="settingsBtn"
      >
        ⚙️
      </button>
    </div>
  </header>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'Header',
  props: {
    connectionStatus: {
      type: String,
      default: '未连接'
    }
  },
  emits: ['open-session-modal', 'open-settings-modal'],
  setup(props) {
    const sessionBtn = ref(null)
    const settingsBtn = ref(null)

    const isConnected = computed(() => {
      return props.connectionStatus.includes('已连接')
    })

    const onSessionBtnHover = (e) => {
      const btn = e.target
      btn.style.background = 'linear-gradient(135deg, #40a9ff, #1890ff)'
      btn.style.boxShadow = '0 6px 20px rgba(17, 119, 187, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      btn.style.transform = 'translateY(-2px) translateZ(0)'
    }

    const onSessionBtnLeave = (e) => {
      const btn = e.target
      btn.style.background = 'linear-gradient(135deg, #1890ff, #40a9ff)'
      btn.style.boxShadow = '0 4px 12px rgba(17, 119, 187, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      btn.style.transform = 'translateY(0) translateZ(0)'
    }

    const onSessionBtnDown = (e) => {
      e.target.style.transform = 'scale(0.98) translateZ(0)'
    }

    const onSessionBtnUp = (e) => {
      e.target.style.transform = 'translateY(-2px) translateZ(0)'
    }

    const onSettingsBtnHover = (e) => {
      const btn = e.target
      btn.style.borderColor = '#40a9ff'
      btn.style.color = '#ffffff'
      btn.style.background = '#404040'
      btn.style.transform = 'translateY(-2px) translateZ(0)'
      btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    }

    const onSettingsBtnLeave = (e) => {
      const btn = e.target
      btn.style.borderColor = '#404040'
      btn.style.color = '#b3b3b3'
      btn.style.background = '#404040'
      btn.style.transform = 'translateY(0) translateZ(0)'
      btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    }

    const onSettingsBtnDown = (e) => {
      e.target.style.transform = 'scale(0.95) translateZ(0)'
    }

    const onSettingsBtnUp = (e) => {
      e.target.style.transform = 'translateY(-2px) translateZ(0)'
    }

    return {
      sessionBtn,
      settingsBtn,
      isConnected,
      onSessionBtnHover,
      onSessionBtnLeave,
      onSessionBtnDown,
      onSessionBtnUp,
      onSettingsBtnHover,
      onSettingsBtnLeave,
      onSettingsBtnDown,
      onSettingsBtnUp
    }
  }
}
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(lg);
  height: 64px;
  min-height: 64px;
  background: linear-gradient(180deg, color(bg-secondary) 0%, color(bg-tertiary) 100%);
  border-bottom: 1px solid color(border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: z-index(sticky);
  position: relative;
  overflow: hidden;
}

.header-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  pointer-events: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: spacing(lg);
}

.logo {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  position: relative;
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: border-radius(lg);
  background: linear-gradient(135deg, color(primary), color(primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  color: color(white);
  font-size: 18px;
  font-weight: font-weight(bold);
  box-shadow: 0 4px 12px rgba(17, 119, 187, 0.3);
  transform: translateZ(0);
}

.logo-title {
  font-size: font-size(xl);
  font-weight: font-weight(bold);
  color: color(text-primary);
  margin: 0;
  letter-spacing: -0.025em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.session-btn {
  display: inline-flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(sm) spacing(md);
  font-size: font-size(sm);
  font-weight: font-weight(semibold);
  color: color(white);
  background: linear-gradient(135deg, color(primary), color(primary-light));
  border: none;
  border-radius: border-radius(md);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0);
  box-shadow: 0 4px 12px rgba(17, 119, 187, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
}

.session-btn-icon {
  position: relative;
  z-index: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: spacing(sm);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(156, 163, 175, 0.2), rgba(156, 163, 175, 0.1));
  border: 1px solid color(text-muted);
  position: relative;
  overflow: hidden;
}

.connection-status.connected {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
  border-color: color(success);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: color(text-muted);
  box-shadow: none;
  animation: none;
}

.status-dot.connected {
  background-color: color(success);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  animation: pulse-success 2s infinite;
}

.status-text {
  font-size: font-size(xs);
  font-weight: font-weight(semibold);
  color: color(text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.connection-status.connected .status-text {
  color: color(success);
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: color(bg-tertiary);
  border: 1px solid color(border);
  border-radius: 10px;
  color: color(text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
}

@keyframes pulse-success {
  0% {
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.8);
  }
  100% {
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  }
}
</style>