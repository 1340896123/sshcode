<template>
  <div class="tab-settings">
    <div class="settings-section">
      <h3 class="section-title">标签页设置</h3>

      <div class="setting-group">
        <div class="setting-item">
          <label class="setting-label">
            <span>最大标签页数量</span>
            <span class="setting-description">限制同时打开的SSH连接数量</span>
          </label>
          <div class="setting-control">
            <input
              v-model.number="localSettings.maxTabs"
              type="number"
              min="1"
              max="50"
              class="number-input"
              @change="handleSettingChange"
            />
            <span class="setting-hint">建议: 10-15个</span>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span>关闭标签页确认</span>
            <span class="setting-description">关闭有活动操作的标签页时显示确认对话框</span>
          </label>
          <div class="setting-control">
            <label class="switch">
              <input
                v-model="localSettings.confirmClose"
                type="checkbox"
                @change="handleSettingChange"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span>显示工具提示</span>
            <span class="setting-description">在标签页上显示连接状态和操作提示</span>
          </label>
          <div class="setting-control">
            <label class="switch">
              <input
                v-model="localSettings.showTooltips"
                type="checkbox"
                @change="handleSettingChange"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">会话管理</h3>

      <div class="setting-group">
        <div class="setting-item">
          <label class="setting-label">
            <span>自动保存会话</span>
            <span class="setting-description">应用关闭时自动保存标签页状态</span>
          </label>
          <div class="setting-control">
            <label class="switch">
              <input
                v-model="localSettings.autoSaveSession"
                type="checkbox"
                @change="handleSettingChange"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span>启动时恢复会话</span>
            <span class="setting-description">应用启动时自动恢复上次的标签页</span>
          </label>
          <div class="setting-control">
            <label class="switch">
              <input
                v-model="localSettings.restoreSession"
                type="checkbox"
                @change="handleSettingChange"
                :disabled="!localSettings.autoSaveSession"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span>自动重连</span>
            <span class="setting-description">恢复会话时自动重新连接</span>
          </label>
          <div class="setting-control">
            <label class="switch">
              <input
                v-model="localSettings.autoReconnect"
                type="checkbox"
                @change="handleSettingChange"
                :disabled="!localSettings.restoreSession"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">性能设置</h3>

      <div class="setting-group">
        <div class="setting-item">
          <label class="setting-label">
            <span>内存限制 (MB)</span>
            <span class="setting-description">标签页使用的最大内存量</span>
          </label>
          <div class="setting-control">
            <input
              v-model.number="localSettings.maxMemoryUsage"
              type="number"
              min="50"
              max="1000"
              step="50"
              class="number-input"
              @change="handleSettingChange"
            />
            <span class="setting-hint">建议: 200MB</span>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span>终端缓冲区大小</span>
            <span class="setting-description">每个标签页保留的终端输出行数</span>
          </label>
          <div class="setting-control">
            <input
              v-model.number="localSettings.terminalBufferLimit"
              type="number"
              min="100"
              max="5000"
              step="100"
              class="number-input"
              @change="handleSettingChange"
            />
            <span class="setting-hint">建议: 1000行</span>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span>不活动标签页超时</span>
            <span class="setting-description">标签页不活动多长时间后断开连接 (分钟)</span>
          </label>
          <div class="setting-control">
            <input
              v-model.number="localSettings.inactivityTimeout"
              type="number"
              min="0"
              max="120"
              class="number-input"
              @change="handleSettingChange"
            />
            <span class="setting-hint">0 = 禁用超时</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">快捷键设置</h3>

      <div class="setting-group">
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="shortcut-action">切换到下一个标签页</span>
            <kbd class="shortcut-key">Ctrl + Tab</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-action">切换到上一个标签页</span>
            <kbd class="shortcut-key">Ctrl + Shift + Tab</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-action">关闭当前标签页</span>
            <kbd class="shortcut-key">Ctrl + W</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-action">新建标签页</span>
            <kbd class="shortcut-key">Ctrl + T</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-action">重命名标签页</span>
            <kbd class="shortcut-key">F2</kbd>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-action">复制连接</span>
            <kbd class="shortcut-key">Ctrl + D</kbd>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-actions">
      <button class="btn btn-secondary" @click="resetToDefaults">
        恢复默认设置
      </button>
      <button class="btn btn-primary" @click="saveSettings">
        保存设置
      </button>
    </div>

    <div v-if="showResetConfirm" class="confirm-dialog">
      <div class="confirm-content">
        <h4>重置设置</h4>
        <p>确定要将标签页设置恢复为默认值吗？</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="showResetConfirm = false">
            取消
          </button>
          <button class="btn btn-danger" @click="confirmReset">
            确认重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch, onMounted } from 'vue';

export default {
  name: 'TabSettings',
  props: {
    settings: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['save-settings'],
  setup(props, { emit }) {
    const showResetConfirm = ref(false);

    // 默认设置
    const defaultSettings = {
      maxTabs: 15,
      confirmClose: true,
      showTooltips: true,
      autoSaveSession: true,
      restoreSession: true,
      autoReconnect: false,
      maxMemoryUsage: 200,
      terminalBufferLimit: 1000,
      inactivityTimeout: 30
    };

    // 本地设置副本
    const localSettings = reactive({ ...defaultSettings });

    // 从props更新本地设置
    const updateLocalSettings = () => {
      Object.assign(localSettings, { ...defaultSettings, ...props.settings });
    };

    // 处理设置变更
    const handleSettingChange = () => {
      // 实时验证设置值
      if (localSettings.maxTabs < 1) localSettings.maxTabs = 1;
      if (localSettings.maxTabs > 50) localSettings.maxTabs = 50;
      if (localSettings.maxMemoryUsage < 50) localSettings.maxMemoryUsage = 50;
      if (localSettings.terminalBufferLimit < 100) localSettings.terminalBufferLimit = 100;
      if (localSettings.inactivityTimeout < 0) localSettings.inactivityTimeout = 0;

      // 自动保存会话关闭时，恢复会话也关闭
      if (!localSettings.autoSaveSession) {
        localSettings.restoreSession = false;
        localSettings.autoReconnect = false;
      }

      // 恢复会话关闭时，自动重连也关闭
      if (!localSettings.restoreSession) {
        localSettings.autoReconnect = false;
      }
    };

    // 保存设置
    const saveSettings = () => {
      handleSettingChange();
      emit('save-settings', { ...localSettings });
    };

    // 重置为默认设置
    const resetToDefaults = () => {
      showResetConfirm.value = true;
    };

    // 确认重置
    const confirmReset = () => {
      Object.assign(localSettings, defaultSettings);
      showResetConfirm.value = false;
      saveSettings();
    };

    // 监听props变化
    watch(() => props.settings, updateLocalSettings, { immediate: true, deep: true });

    onMounted(() => {
      updateLocalSettings();
    });

    return {
      localSettings,
      showResetConfirm,
      handleSettingChange,
      saveSettings,
      resetToDefaults,
      confirmReset
    };
  }
};
</script>

<style lang="scss" scoped>
.tab-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: spacing(lg);
}

.settings-section {
  margin-bottom: spacing(xl);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  overflow: hidden;
}

.section-title {
  background: color(surface);
  padding: spacing(md) spacing(lg);
  margin: 0;
  font-size: font-size(lg);
  font-weight: font-weight(semibold);
  color: color(text-primary);
  border-bottom: 1px solid color(border);
}

.setting-group {
  padding: spacing(lg);
}

.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: spacing(lg);

  &:last-child {
    margin-bottom: 0;
  }
}

.setting-label {
  flex: 1;
  margin-right: spacing(lg);

  span {
    display: block;

    &:first-child {
      font-weight: font-weight(medium);
      color: color(text-primary);
      margin-bottom: spacing(xs);
    }

    &:last-child {
      font-size: font-size(sm);
      color: color(text-muted);
      line-height: 1.4;
    }
  }
}

.setting-control {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  min-width: 200px;
  justify-content: flex-end;
}

.number-input {
  width: 80px;
  padding: spacing(xs) spacing(sm);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  background: color(bg-primary);
  color: color(text-primary);
  font-size: font-size(sm);
  text-align: center;

  &:focus {
    outline: none;
    border-color: color(primary);
    box-shadow: 0 0 0 2px rgba(color(primary), 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.setting-hint {
  font-size: font-size(xs);
  color: color(text-muted);
  white-space: nowrap;
}

// Switch component
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: color(text-muted);
  transition: all 0.3s ease;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: all 0.3s ease;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: color(primary);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

// Shortcuts
.shortcut-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: spacing(md);
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm);
  background: color(bg-tertiary);
  border-radius: border-radius(sm);
}

.shortcut-action {
  font-size: font-size(sm);
  color: color(text-primary);
}

.shortcut-key {
  background: color(surface);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  padding: spacing(xs) spacing(sm);
  font-size: font-size(xs);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: color(text-primary);
  font-weight: font-weight(medium);
}

// Actions
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: spacing(sm);
  padding: spacing(lg) 0;
  border-top: 1px solid color(border);
  margin-top: spacing(xl);
}

.btn {
  padding: spacing(sm) spacing(lg);
  border: 1px solid transparent;
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  cursor: pointer;
  transition: all transition(fast) ease;

  &.btn-primary {
    background: color(primary);
    color: color(white);

    &:hover {
      background: color(primary-dark);
    }
  }

  &.btn-secondary {
    background: color(bg-tertiary);
    border-color: color(border);
    color: color(text-primary);

    &:hover {
      background: color(surface);
    }
  }

  &.btn-danger {
    background: color(error);
    color: color(white);

    &:hover {
      background: color(error-dark);
    }
  }
}

// Confirm dialog
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-content {
  background: color(surface);
  border-radius: border-radius(lg);
  padding: spacing(xl);
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

  h4 {
    margin: 0 0 spacing(md) 0;
    color: color(text-primary);
  }

  p {
    margin: 0 0 spacing(lg) 0;
    color: color(text-secondary);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing(sm);
  }
}

@media (max-width: 768px) {
  .tab-settings {
    padding: spacing(md);
  }

  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: spacing(sm);
  }

  .setting-control {
    justify-content: flex-start;
    min-width: auto;
  }

  .setting-label {
    margin-right: 0;
  }

  .shortcut-list {
    grid-template-columns: 1fr;
  }

  .settings-actions {
    flex-direction: column;
  }
}
</style>