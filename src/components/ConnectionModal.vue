<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>{{ isEditing ? '编辑连接' : '连接管理' }}</h2>
            <button class="close-btn" @click="closeModal">×</button>
          </div>

          <div class="modal-body">
            <!-- 连接列表 -->
            <div v-if="!isCreatingNew && !isEditing" class="sessions-list">
              <div v-if="sessions.length === 0" class="empty-sessions">
                <div class="empty-icon">🔗</div>
                <p>暂无连接配置</p>
                <p class="text-muted">点击"新建连接"开始创建SSH连接</p>
              </div>

              <div v-else class="sessions-grid">
                <div
                  v-for="session in sessions"
                  :key="session.id"
                  class="session-card"
                  :class="{ 'test-success': getTestResult(session.id)?.success, 'test-failed': getTestResult(session.id)?.success === false }"
                >
                  <!-- 连接状态指示器 -->
                  <div v-if="getTestResult(session.id)" class="connection-status" :class="getTestResult(session.id).success ? 'status-success' : 'status-failed'">
                    <span class="status-icon">{{ getTestResult(session.id).success ? '✓' : '✗' }}</span>
                    <span class="status-text">{{ getTestResult(session.id).success ? '上次测试成功' : '上次测试失败' }}</span>
                  </div>

                  <div class="session-info">
                    <h3>{{ session.name }}</h3>
                    <p class="session-host">{{ session.username }}@{{ session.host }}:{{ session.port || 22 }}</p>
                    <p class="session-description">{{ session.description || '无描述' }}</p>
                  </div>
                  <div class="session-actions">
                    <button class="action-btn test-btn" @click="testConnection(session)" title="测试连接" :disabled="isTestingConnection">
                      {{ isTestingConnection ? '⏳' : '🔧' }}
                    </button>
                    <button class="action-btn connect-btn" @click="connectSession(session)" title="连接">
                      🔗
                    </button>
                    <button class="action-btn edit-btn" @click="editSession(session)" title="编辑">
                      ✏️
                    </button>
                    <button class="action-btn delete-btn" @click="deleteSession(session.id)" title="删除">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 新建/编辑连接表单 -->
            <div v-if="isCreatingNew || isEditing" class="session-form">
              <!-- 验证错误信息 -->
              <div v-if="validationErrors.length > 0" class="validation-errors">
                <div class="error-header">
                  <span class="error-icon">⚠️</span>
                  <span>请修正以下错误 ({{ validationErrors.length }}项)：</span>
                </div>
                <ul class="error-list">
                  <li v-for="error in validationErrors" :key="error" class="error-item">
                    <span class="error-bullet">•</span>
                    <span class="error-text">{{ error }}</span>
                  </li>
                </ul>
              </div>

              <form @submit.prevent="saveSession">
                <div class="form-group" :class="{ 'has-error': !formData.name.trim() }">
                  <label for="sessionName">连接名称 *</label>
                  <input
                    id="sessionName"
                    v-model="formData.name"
                    type="text"
                    required
                    placeholder="输入连接名称"
                    @blur="validateField('name')"
                  />
                  <div v-if="!formData.name.trim()" class="field-error">
                    连接名称不能为空
                  </div>
                </div>

                <div class="form-group" :class="{ 'has-error': !formData.host.trim() || !isValidHost(formData.host.trim()) }">
                  <label for="sessionHost">主机地址 *</label>
                  <input
                    id="sessionHost"
                    v-model="formData.host"
                    type="text"
                    required
                    placeholder="example.com 或 IP 地址"
                    @blur="validateField('host')"
                  />
                  <div v-if="!formData.host.trim()" class="field-error">
                    主机地址不能为空
                  </div>
                  <div v-else-if="!isValidHost(formData.host.trim())" class="field-error">
                    主机地址格式不正确
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="sessionPort">端口</label>
                    <input
                      id="sessionPort"
                      v-model.number="formData.port"
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="22"
                    />
                  </div>

                  <div class="form-group" :class="{ 'has-error': !formData.username.trim() }">
                    <label for="sessionUsername">用户名 *</label>
                    <input
                      id="sessionUsername"
                      v-model="formData.username"
                      type="text"
                      required
                      placeholder="用户名"
                      @blur="validateField('username')"
                    />
                    <div v-if="!formData.username.trim()" class="field-error">
                      用户名不能为空
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label for="sessionDescription">描述</label>
                  <textarea
                    id="sessionDescription"
                    v-model="formData.description"
                    rows="3"
                    placeholder="连接描述（可选）"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label for="authType">认证方式</label>
                  <select
                    id="authType"
                    v-model="formData.authType"
                    class="auth-select"
                  >
                    <option value="password">密码认证</option>
                    <option value="key">密钥认证</option>
                  </select>
                </div>

                <div class="form-group" v-if="formData.authType === 'password'">
                  <label for="sessionPassword">密码</label>
                  <input
                    id="sessionPassword"
                    v-model="formData.password"
                    type="password"
                    placeholder="输入密码"
                  />
                </div>

                <div class="form-group" v-if="formData.authType === 'key'">
                  <label for="sessionKeyPath">私钥文件路径</label>
                  <div class="key-path-input">
                    <input
                      id="sessionKeyPath"
                      v-model="formData.keyPath"
                      type="text"
                      placeholder="~/.ssh/id_rsa"
                      @blur="validateKeyFile"
                    />
                    <button type="button" class="browse-btn" @click="browseKeyFile">
                      浏览
                    </button>
                  </div>
                  <div v-if="keyValidationMessage" class="key-validation-message" :class="keyValidationType">
                    {{ keyValidationMessage }}
                  </div>
                </div>

                <div class="form-group" v-if="formData.authType === 'key' && formData.keyContent">
                  <label>私钥内容预览</label>
                  <div class="key-preview">
                    <pre>{{ formData.keyContent.substring(0, 200) }}...</pre>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div class="modal-footer">
            <!-- 连接列表页面的按钮 -->
            <div v-if="!isCreatingNew && !isEditing" class="footer-actions">
              <button class="primary-btn" @click="createNewSession">
                新建连接
              </button>
              <button class="secondary-btn" @click="closeModal">关闭</button>
            </div>

            <!-- 表单页面的按钮 -->
            <div v-else class="footer-actions">
              <button class="test-connection-btn" @click="testCurrentConnection" :disabled="!isFormValid || isTestingConnection">
                {{ isTestingConnection ? '测试中...' : '测试连接' }}
              </button>
              <button class="primary-btn" @click="saveSession" :disabled="!isFormValid">
                {{ isEditing ? '保存修改' : '创建连接' }}
              </button>
              <button class="secondary-btn" @click="cancelForm">取消</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'

export default {
  name: "SessionModal",
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "show-notification", "session-connected"],
  setup(props, { emit }) {
    // 状态管理
    const sessions = ref([])
    const isCreatingNew = ref(false)
    const isEditing = ref(false)
    const currentEditId = ref(null)
    const isTestingConnection = ref(false)
    const connectionTestResults = ref(new Map())
    const keyValidationMessage = ref('')
    const keyValidationType = ref('')

    // 表单数据
    const formData = reactive({
      name: '',
      host: '',
      port: 22,
      username: '',
      description: '',
      authType: 'password',
      password: '',
      keyPath: '',
      keyContent: ''
    })

    // 重置表单数据
    const resetForm = () => {
      Object.assign(formData, {
        name: '',
        host: '',
        port: 22,
        username: '',
        description: '',
        authType: 'password',
        password: '',
        keyPath: '',
        keyContent: ''
      })
    }

    // 表单验证
    const isFormValid = computed(() => {
      // 基本字段验证
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        return false
      }

      if (!formData.host.trim() || !isValidHost(formData.host.trim())) {
        return false
      }

      if (!formData.username.trim() || formData.username.trim().length < 1) {
        return false
      }

      if (formData.port && (formData.port < 1 || formData.port > 65535)) {
        return false
      }

      // 认证信息验证
      if (formData.authType === 'password') {
        return formData.password.trim().length >= 1
      } else if (formData.authType === 'key') {
        return formData.keyPath.trim() && formData.keyContent.trim()
      }

      return false
    })

    // 验证主机地址格式
    const isValidHost = (host) => {
      // IPv4地址验证
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
      if (ipv4Regex.test(host)) {
        const parts = host.split('.')
        return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255)
      }

      // 域名验证
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/

      // localhost验证
      if (host === 'localhost') {
        return true
      }

      return domainRegex.test(host) || host.includes('.') || /^[a-zA-Z0-9\-]+$/.test(host)
    }

    // 获取验证错误信息
    const validationErrors = computed(() => {
      const errors = []

      if (!formData.name.trim()) {
        errors.push('连接名称不能为空')
      } else if (formData.name.trim().length < 2) {
        errors.push('连接名称至少需要2个字符')
      }

      if (!formData.host.trim()) {
        errors.push('主机地址不能为空')
      } else if (!isValidHost(formData.host.trim())) {
        errors.push('主机地址格式不正确')
      }

      if (!formData.username.trim()) {
        errors.push('用户名不能为空')
      }

      if (formData.port && (formData.port < 1 || formData.port > 65535)) {
        errors.push('端口号必须在1-65535之间')
      }

      if (formData.authType === 'password' && !formData.password.trim()) {
        errors.push('密码不能为空')
      }

      if (formData.authType === 'key') {
        if (!formData.keyPath.trim()) {
          errors.push('密钥文件路径不能为空')
        } else if (!formData.keyContent.trim()) {
          errors.push('无法读取密钥文件内容')
        }
      }

      return errors
    })

    // 加载连接列表
    const loadSessions = async () => {
      try {
        if (window.electronAPI) {
          sessions.value = await window.electronAPI.getSessions()
        }
      } catch (error) {
        console.error('加载连接失败:', error)
        emit('show-notification', '加载连接列表失败', 'error')
      }
    }

    // 创建新连接
    const createNewSession = () => {
      resetForm()
      isCreatingNew.value = true
      isEditing.value = false
      currentEditId.value = null
    }

    // 编辑连接
    const editSession = (session) => {
      Object.assign(formData, {
        name: session.name,
        host: session.host,
        port: session.port || 22,
        username: session.username,
        description: session.description || '',
        authType: session.authType || 'password',
        password: session.password || '',
        keyPath: session.keyPath || '',
        keyContent: session.keyContent || ''
      })
      isCreatingNew.value = true
      isEditing.value = true
      currentEditId.value = session.id
    }

    // 保存连接
    const saveSession = async () => {
      try {
        if (!isFormValid.value) {
          emit('show-notification', '请填写所有必填字段', 'warning')
          return
        }

        const sessionData = {
          id: isEditing.value ? currentEditId.value : Date.now().toString(),
          name: formData.name.trim(),
          host: formData.host.trim(),
          port: formData.port || 22,
          username: formData.username.trim(),
          description: formData.description.trim(),
          authType: formData.authType,
          password: formData.authType === 'password' ? formData.password : '',
          keyPath: formData.authType === 'key' ? formData.keyPath : '',
          keyContent: formData.authType === 'key' ? formData.keyContent : '',
          createdAt: isEditing.value ?
            sessions.value.find(s => s.id === currentEditId.value)?.createdAt :
            new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        if (window.electronAPI) {
          const result = await window.electronAPI.saveSession(sessionData)
          if (result.success) {
            emit('show-notification',
              isEditing.value ? '连接更新成功' : '连接创建成功', 'success')
            await loadSessions()
            cancelForm()
          } else {
            emit('show-notification', `保存失败: ${result.error}`, 'error')
          }
        }
      } catch (error) {
        console.error('保存连接失败:', error)
        emit('show-notification', '保存连接失败', 'error')
      }
    }

    // 删除连接
    const deleteSession = async (sessionId) => {
      if (!confirm('确定要删除这个连接吗？')) {
        return
      }

      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.deleteSession(sessionId)
          if (result.success) {
            emit('show-notification', '连接删除成功', 'success')
            await loadSessions()
          } else {
            emit('show-notification', `删除失败: ${result.error}`, 'error')
          }
        }
      } catch (error) {
        console.error('删除连接失败:', error)
        emit('show-notification', '删除连接失败', 'error')
      }
    }

    // 连接连接
    const connectSession = async (session) => {
      try {
        emit('show-notification', '正在连接SSH服务器...', 'info')

        if (window.electronAPI) {
          const result = await window.electronAPI.sshConnect(session)
          if (result.success) {
            emit('show-notification', `已连接到 ${session.name}`, 'success')
            emit('session-connected', { ...session, id: session.id })
            closeModal()
          } else {
            emit('show-notification', `连接失败: ${result.error}`, 'error')
          }
        }
      } catch (error) {
        console.error('SSH连接失败:', error)
        emit('show-notification', 'SSH连接失败', 'error')
      }
    }

    // 验证密钥文件
    const validateKeyFile = async () => {
      if (!formData.keyPath.trim()) {
        keyValidationMessage.value = ''
        return
      }

      try {
        keyValidationMessage.value = '正在验证密钥文件...'
        keyValidationType.value = 'info'

        if (window.electronAPI) {
          const result = await window.electronAPI.readSSHKey(formData.keyPath)
          if (result.success) {
            formData.keyContent = result.keyContent

            // 验证密钥格式
            const keyType = detectKeyType(result.keyContent)
            if (keyType) {
              keyValidationMessage.value = `✓ 有效密钥文件 (${keyType})`
              keyValidationType.value = 'success'
            } else {
              keyValidationMessage.value = '⚠️ 未知密钥格式，可能不支持'
              keyValidationType.value = 'warning'
            }
          } else {
            keyValidationMessage.value = `✗ ${result.error}`
            keyValidationType.value = 'error'
          }
        }
      } catch (error) {
        keyValidationMessage.value = `✗ 验证失败: ${error.message}`
        keyValidationType.value = 'error'
      }
    }

    // 检测密钥类型
    const detectKeyType = (keyContent) => {
      const trimmedKey = keyContent.trim()

      // RSA 私钥
      if (trimmedKey.includes('-----BEGIN RSA PRIVATE KEY-----') ||
          trimmedKey.includes('-----BEGIN PRIVATE KEY-----')) {
        return 'RSA'
      }

      // OpenSSH 格式
      if (trimmedKey.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----')) {
        return 'OpenSSH'
      }

      // DSA 私钥
      if (trimmedKey.includes('-----BEGIN DSA PRIVATE KEY-----')) {
        return 'DSA'
      }

      // ECDSA 私钥
      if (trimmedKey.includes('-----BEGIN EC PRIVATE KEY-----')) {
        return 'ECDSA'
      }

      // ED25519 私钥
      if (trimmedKey.includes('-----BEGIN OPENSSH PRIVATE KEY-----') &&
          trimmedKey.includes('ssh-ed25519')) {
        return 'ED25519'
      }

      return null
    }

    // 浏览密钥文件
    const browseKeyFile = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.readSSHKey(formData.keyPath || '~/.ssh/id_rsa')
          if (result.success) {
            formData.keyContent = result.keyContent
            emit('show-notification', '密钥文件读取成功', 'success')

            // 自动验证密钥
            await validateKeyFile()
          } else {
            keyValidationMessage.value = `✗ ${result.error}`
            keyValidationType.value = 'error'
            emit('show-notification', `读取密钥文件失败: ${result.error}`, 'error')
          }
        }
      } catch (error) {
        keyValidationMessage.value = `✗ 验证失败: ${error.message}`
        keyValidationType.value = 'error'
        console.error('读取密钥文件失败:', error)
        emit('show-notification', '读取密钥文件失败', 'error')
      }
    }

    // 取消表单
    const cancelForm = () => {
      resetForm()
      isCreatingNew.value = false
      isEditing.value = false
      currentEditId.value = null
    }

    // 测试连接
    const testConnection = async (session) => {
      isTestingConnection.value = true
      const testId = `${session.id}-${Date.now()}`

      try {
        emit('show-notification', '正在测试连接...', 'info')

        if (window.electronAPI) {
          const result = await window.electronAPI.sshConnect({
            ...session,
            id: testId // 使用临时ID避免影响现有连接
          })

          // 更新测试结果
          connectionTestResults.value.set(session.id, {
            success: result.success,
            message: result.success ? '连接测试成功' : result.error,
            timestamp: new Date().toISOString()
          })

          if (result.success) {
            emit('show-notification', `${session.name} 连接测试成功`, 'success')
            // 立即断开测试连接
            await window.electronAPI.sshDisconnect(testId)
          } else {
            emit('show-notification', `连接测试失败: ${result.error}`, 'error')
          }
        }
      } catch (error) {
        console.error('连接测试失败:', error)
        connectionTestResults.value.set(session.id, {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString()
        })
        emit('show-notification', '连接测试失败', 'error')
      } finally {
        isTestingConnection.value = false
      }
    }

    // 测试当前表单中的连接配置
    const testCurrentConnection = async () => {
      if (!isFormValid.value) {
        emit('show-notification', '请先完善表单信息', 'warning')
        return
      }

      isTestingConnection.value = true

      try {
        emit('show-notification', '正在测试连接...', 'info')

        const testSession = {
          id: 'current-test',
          name: formData.name.trim(),
          host: formData.host.trim(),
          port: formData.port || 22,
          username: formData.username.trim(),
          authType: formData.authType,
          password: formData.authType === 'password' ? formData.password : '',
          keyPath: formData.authType === 'key' ? formData.keyPath : '',
          keyContent: formData.authType === 'key' ? formData.keyContent : ''
        }

        if (window.electronAPI) {
          const result = await window.electronAPI.sshConnect(testSession)

          if (result.success) {
            emit('show-notification', '连接测试成功！配置有效', 'success')
            // 立即断开测试连接
            await window.electronAPI.sshDisconnect('current-test')
          } else {
            emit('show-notification', `连接测试失败: ${result.error}`, 'error')
          }
        }
      } catch (error) {
        console.error('连接测试失败:', error)
        emit('show-notification', '连接测试失败', 'error')
      } finally {
        isTestingConnection.value = false
      }
    }

    // 获取连接的连接测试结果
    const getTestResult = (sessionId) => {
      return connectionTestResults.value.get(sessionId)
    }

    // 清除过期的测试结果（超过5分钟）
    const clearOldTestResults = () => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      for (const [sessionId, result] of connectionTestResults.value.entries()) {
        if (new Date(result.timestamp) < fiveMinutesAgo) {
          connectionTestResults.value.delete(sessionId)
        }
      }
    }

    // 关闭模态框
    const closeModal = () => {
      cancelForm()
      emit('close')
    }

    // 监听密钥路径变化，自动读取密钥内容
    watch(() => formData.keyPath, (newPath) => {
      if (newPath && formData.authType === 'key') {
        browseKeyFile()
      }
    })

    // 监听模态框打开状态
    watch(() => props.isOpen, (isOpen) => {
      if (isOpen) {
        loadSessions()
      }
    })

    // 组件挂载时加载连接
    onMounted(() => {
      if (props.isOpen) {
        loadSessions()
      }

      // 定期清理过期的测试结果
      const cleanupInterval = setInterval(clearOldTestResults, 60000) // 每分钟清理一次

      // 组件卸载时清除定时器
      onUnmounted(() => {
        clearInterval(cleanupInterval)
      })
    })

    return {
      sessions,
      isCreatingNew,
      isEditing,
      formData,
      isFormValid,
      validationErrors,
      isTestingConnection,
      keyValidationMessage,
      keyValidationType,
      createNewSession,
      editSession,
      saveSession,
      deleteSession,
      connectSession,
      testConnection,
      testCurrentConnection,
      getTestResult,
      validateKeyFile,
      browseKeyFile,
      cancelForm,
      closeModal
    }
  },
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
  max-height: 85vh;
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

// 连接列表样式
.sessions-list {
  min-height: 300px;
}

.empty-sessions {
  text-align: center;
  padding: spacing(xxl) 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: spacing(md);
}

.empty-sessions p {
  margin: spacing(sm) 0;
  color: color(text-secondary);
}

.text-muted {
  color: color(text-muted) !important;
  font-size: font-size(sm);
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: spacing(md);
  padding: spacing(sm) 0;
}

.session-card {
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  padding: spacing(md);
  transition: all transition(normal) ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: color(bg-tertiary);
    border-color: color(primary);
    transform: translateY(-2px);
    box-shadow: shadow(md);
  }

  &.test-success {
    border-left: 4px solid color(success);
  }

  &.test-failed {
    border-left: 4px solid color(error);
  }
}

.connection-status {
  position: absolute;
  top: spacing(sm);
  right: spacing(sm);
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  border-radius: border-radius(full);
  font-size: font-size(xs);
  font-weight: font-weight(medium);

  &.status-success {
    background: rgba(34, 197, 94, 0.1);
    color: color(success);
  }

  &.status-failed {
    background: rgba(220, 38, 38, 0.1);
    color: color(error);
  }
}

.status-icon {
  font-size: font-size(xs);
}

.status-text {
  font-size: font-size(xs);
}

.session-info {
  margin-bottom: spacing(md);
}

.session-info h3 {
  margin: 0 0 spacing(xs) 0;
  font-size: font-size(lg);
  font-weight: font-weight(semibold);
  color: color(text-primary);
}

.session-host {
  font-size: font-size(sm);
  color: color(primary);
  font-family: font-family(mono);
  margin: 0 0 spacing(xs) 0;
}

.session-description {
  font-size: font-size(sm);
  color: color(text-secondary);
  margin: 0;
  line-height: line-height(normal);
}

.session-actions {
  display: flex;
  gap: spacing(xs);
  justify-content: flex-end;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all transition(fast) ease;

  &:hover {
    transform: scale(1.1);
  }
}

.connect-btn {
  background: color(success);
  color: color(white);

  &:hover {
    background: color(success-light);
  }
}

.edit-btn {
  background: color(warning);
  color: color(white);

  &:hover {
    background: color(warning-light);
  }
}

.test-btn {
  background: color(info);
  color: color(white);

  &:hover {
    background: color(info-light);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

.delete-btn {
  background: color(error);
  color: color(white);

  &:hover {
    background: color(error-light);
  }
}

// 表单样式
.session-form {
  max-width: 600px;
  margin: 0 auto;
}

// 验证错误样式
.validation-errors {
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: border-radius(md);
  padding: spacing(md);
  margin-bottom: spacing(lg);
}

.error-header {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  margin-bottom: spacing(sm);
  font-weight: font-weight(semibold);
  color: color(error);
}

.error-list {
  margin: 0;
  padding-left: spacing(lg);
}

.error-item {
  color: color(error);
  font-size: font-size(sm);
  margin-bottom: spacing(xs);

  &:last-child {
    margin-bottom: 0;
  }
}

.form-group {
  margin-bottom: spacing(lg);
}

.form-group label {
  display: block;
  margin-bottom: spacing(xs);
  font-weight: font-weight(medium);
  color: color(text-primary);
  font-size: font-size(sm);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: spacing(md);
}

.form-group input,
.form-group textarea {
  @include input-base;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.auth-type-selector {
  display: flex;
  gap: spacing(lg);
  padding: spacing(sm) 0;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  cursor: pointer;
  color: color(text-secondary);
  transition: color transition(fast) ease;

  &:hover {
    color: color(text-primary);
  }

  input[type="radio"] {
    accent-color: color(primary);
  }
}

.key-path-input {
  display: flex;
  gap: spacing(sm);

  input {
    flex: 1;
  }
}

.browse-btn {
  @include button-base;
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);
  white-space: nowrap;
  padding: spacing(sm) spacing(md);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

.key-validation-message {
  margin-top: spacing(xs);
  padding: spacing(xs) spacing(sm);
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  display: flex;
  align-items: center;
  gap: spacing(xs);

  &.success {
    background: rgba(34, 197, 94, 0.1);
    color: color(success);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  &.error {
    background: rgba(220, 38, 38, 0.1);
    color: color(error);
    border: 1px solid rgba(220, 38, 38, 0.2);
  }

  &.warning {
    background: rgba(251, 146, 60, 0.1);
    color: color(warning);
    border: 1px solid rgba(251, 146, 60, 0.2);
  }

  &.info {
    background: rgba(59, 130, 246, 0.1);
    color: color(info);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
}

.key-preview {
  background: color(bg-primary);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  padding: spacing(md);
  max-height: 120px;
  overflow-y: auto;

  pre {
    margin: 0;
    font-family: font-family(mono);
    font-size: font-size(xs);
    color: color(text-muted);
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.modal-footer {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  padding: spacing(lg);
  border-top: 1px solid color(border);
}

.footer-actions {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  width: 100%;
}

.primary-btn {
  @include button-base;
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);
  padding: spacing(sm) spacing(xl);

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
}

.test-connection-btn {
  @include button-base;
  background: linear-gradient(135deg, color(info), color(info-light));
  color: color(white);
  padding: spacing(sm) spacing(lg);
  margin-right: spacing(sm);

  &:hover {
    background: linear-gradient(135deg, color(info-light), color(info));
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

.secondary-btn {
  @include button-base;
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);
  padding: spacing(sm) spacing(xl);

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

// 响应式设计
@media (max-width: 768px) {
  .modal-overlay {
    padding: spacing(md);
  }

  .modal-content {
    max-height: 90vh;
  }

  .sessions-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .auth-type-selector {
    flex-direction: column;
    gap: spacing(sm);
  }

  .key-path-input {
    flex-direction: column;
  }

  .footer-actions {
    flex-direction: column;
  }
}
</style>