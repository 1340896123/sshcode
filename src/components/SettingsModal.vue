<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>设置</h2>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>
          <div class="modal-body">
            <div class="settings-section">
              <h3>AI 配置</h3>
              <div class="setting-item">
                <label>AI 提供商</label>
                <select v-model="settings.ai.provider" class="setting-select">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div class="setting-item">
                <label>API Key</label>
                <input
                  v-model="settings.ai.apiKey"
                  type="password"
                  class="setting-input"
                  placeholder="请输入API密钥"
                />
              </div>
            </div>

            <div class="settings-section">
              <h3>终端设置</h3>
              <div class="setting-item">
                <label>字体大小</label>
                <input
                  v-model="settings.terminal.fontSize"
                  type="number"
                  class="setting-input"
                  min="8"
                  max="24"
                />
              </div>
              <div class="setting-item">
                <label>字体</label>
                <select v-model="settings.terminal.font" class="setting-select">
                  <option value="Consolas">Consolas</option>
                  <option value="Monaco">Monaco</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
            </div>

            <div class="settings-section">
              <h3>常规设置</h3>
              <div class="setting-item">
                <label>
                  <input
                    v-model="settings.general.autoSaveSessions"
                    type="checkbox"
                    class="setting-checkbox"
                  />
                  自动保存连接
                </label>
              </div>
              <div class="setting-item">
                <label>主题</label>
                <select v-model="settings.general.theme" class="setting-select">
                  <option value="dark">深色</option>
                  <option value="light">浅色</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" @click="saveSettings">
              保存设置
            </button>
            <button class="secondary-btn" @click="$emit('close')">
              取消
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { reactive } from 'vue'

export default {
  name: 'SettingsModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'show-notification'],
  setup(props, { emit }) {
    const settings = reactive({
      ai: {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
      },
      general: {
        language: 'zh-CN',
        theme: 'dark',
        autoSaveSessions: true
      },
      terminal: {
        font: 'Consolas',
        fontSize: 14,
        bell: false,
        cursorBlink: true
      },
      security: {
        encryptPasswords: false,
        sessionTimeout: 30,
        confirmDangerousCommands: true
      }
    })

    const saveSettings = async () => {
      try {
        if (window.electronAPI) {
          await window.electronAPI.saveConfig(settings)
          emit('show-notification', '设置已保存', 'success')
        } else {
          emit('show-notification', '设置已保存（演示模式）', 'success')
        }
        emit('close')
      } catch (error) {
        emit('show-notification', `保存设置失败: ${error.message}`, 'error')
      }
    }

    return {
      settings,
      saveSettings
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index(modal);
  padding: spacing(lg);
}

.modal-content {
  background: color(surface);
  border-radius: border-radius(lg);
  box-shadow: shadow(xl);
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid color(border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: spacing(lg);
  border-bottom: 1px solid color(border);
}

.modal-header h2 {
  margin: 0;
  font-size: font-size(xl);
  color: color(text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: color(text-muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: border-radius(full);
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.modal-body {
  flex: 1;
  padding: spacing(lg);
  overflow-y: auto;
}

.settings-section {
  margin-bottom: spacing(xl);
}

.settings-section h3 {
  margin: 0 0 spacing(md) 0;
  font-size: font-size(lg);
  color: color(text-primary);
  border-bottom: 1px solid color(border);
  padding-bottom: spacing(sm);
}

.setting-item {
  margin-bottom: spacing(md);
}

.setting-item label {
  display: block;
  margin-bottom: spacing(xs);
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-secondary);
}

.setting-input,
.setting-select {
  @include input-base;
  max-width: 300px;
}

.setting-checkbox {
  margin-right: spacing(xs);
}

.modal-footer {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  padding: spacing(lg);
  border-top: 1px solid color(border);
}

.primary-btn {
  @include button-base;
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
  }
}

.secondary-btn {
  @include button-base;
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  transition: all 0.3s ease;
  transform: scale(0.9);
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>