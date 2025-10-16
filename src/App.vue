<template>
  <div class="app">
    <Header
      @open-session-modal="isSessionModalOpen = true"
      @open-settings-modal="isSettingsModalOpen = true"
    />

    <TabManager
      ref="tabManagerRef"
      @session-connected="handleSessionConnected"
      @session-disconnected="handleSessionDisconnected"
      @show-notification="handleShowNotification"
      @show-settings="isSettingsModalOpen = true"
    />

    <SessionModal
      :is-open="isSessionModalOpen"
      @close="isSessionModalOpen = false"
      @show-notification="handleShowNotification"
      @session-connected="handleSessionConnected"
    />

    <SettingsModal
      :is-open="isSettingsModalOpen"
      @close="isSettingsModalOpen = false"
      @show-notification="handleShowNotification"
    />

    <ToastContainer :toasts="toastState.toasts" @remove="removeToast" />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import Header from './components/Header.vue'
import TabManager from './components/TabManager.vue'
import SessionModal from './components/ConnectionModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import ToastContainer from './components/ui/ToastContainer.vue'

export default {
  name: 'App',
  components: {
    Header,
    TabManager,
    SessionModal,
    SettingsModal,
    ToastContainer
  },
  setup() {
    const isSessionModalOpen = ref(false)
    const isSettingsModalOpen = ref(false)
    const tabManagerRef = ref(null)

    const toastState = reactive({
      toasts: [],
      toastId: 0
    })

    const addToast = (message, type = 'info', duration = 2000) => {
      const id = toastState.toastId++
      const toast = {
        id,
        message,
        type,
        timestamp: Date.now(),
        duration
      }
      
      toastState.toasts.push(toast)
      
      // 自动关闭通知
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    }

    const removeToast = (id) => {
      const index = toastState.toasts.findIndex(t => t.id === id)
      if (index > -1) {
        toastState.toasts.splice(index, 1)
      }
    }

    const toast = {
      success: (message) => addToast(message, 'success'),
      error: (message) => addToast(message, 'error'),
      warning: (message) => addToast(message, 'warning'),
      info: (message) => addToast(message, 'info'),
      toasts: toastState.toasts,
      removeToast
    }

    const handleShowNotification = (message, type = 'info') => {
      if (typeof message === 'string') {
        addToast(message, type)
      } else if (message.success) {
        addToast(message.message, 'success')
      } else if (message.error) {
        addToast(message.message, 'error')
      } else {
        addToast(message.message, 'info')
      }
    }

    const handleSessionConnected = (sessionData) => {
      console.log('🎯 [APP] 收到session-connected事件:', {
        name: sessionData.name,
        id: sessionData.id,
        host: sessionData.host
      });

      toast.success(`已连接到 ${sessionData.name}`)

      // 调用 TabManager 的 handleSessionConnected 方法
      if (tabManagerRef.value) {
        console.log('📞 [APP] 调用TabManager.handleSessionConnected');
        tabManagerRef.value.handleSessionConnected(sessionData)
      } else {
        console.error('❌ [APP] TabManager ref为null，无法调用handleSessionConnected');
      }
    }

    const setupElectronAPI = () => {
      if (typeof window !== 'undefined' && window.require) {
        const { ipcRenderer } = window.require('electron')
        const path = window.require('path')
        window.ipcRenderer = ipcRenderer
        window.path = path

        window.electronAPI = {
          saveSession: (data) => window.ipcRenderer.invoke('save-session', data),
          getSessions: () => window.ipcRenderer.invoke('get-sessions'),
          deleteSession: (id) => window.ipcRenderer.invoke('delete-session', id),
          sshConnect: (config) => window.ipcRenderer.invoke('ssh-connect', config),
          sshExecute: (id, command) => window.ipcRenderer.invoke('ssh-execute', id, command),
          sshDisconnect: (id) => window.ipcRenderer.invoke('ssh-disconnect', id),
          getFileList: (id, path) => window.ipcRenderer.invoke('get-file-list', id, path),
          getConfig: () => window.ipcRenderer.invoke('getConfig'),
          saveConfig: (config) => window.ipcRenderer.invoke('saveConfig', config),
                    readSSHKey: (keyPath) => window.ipcRenderer.invoke('readSSHKey', keyPath),
          uploadFile: (id, localPath, remotePath) => window.ipcRenderer.invoke('uploadFile', id, localPath, remotePath),
          uploadDroppedFile: (id, file, remotePath) => window.ipcRenderer.invoke('uploadDroppedFile', id, file, remotePath),
          selectAndUploadFile: (id, remotePath) => window.ipcRenderer.invoke('selectAndUploadFile', id, remotePath),
          downloadFile: (id, remotePath) => window.ipcRenderer.invoke('downloadFile', id, remotePath),
          downloadAndOpenFile: (id, remotePath) => window.ipcRenderer.invoke('downloadAndOpenFile', id, remotePath),
          startFileWatcher: (remotePath, localPath) => window.ipcRenderer.invoke('startFileWatcher', remotePath, localPath),
          stopFileWatcher: (localPath) => window.ipcRenderer.invoke('stopFileWatcher', localPath)
        }
      }
    }

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K 打开连接管理
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        isSessionModalOpen.value = true
      }

      // Escape 关闭所有模态框
      if (e.key === 'Escape') {
        isSessionModalOpen.value = false
        isSettingsModalOpen.value = false
      }
    }

    onMounted(() => {
      setupElectronAPI()
      document.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown)
    })

    return {
      isSessionModalOpen,
      isSettingsModalOpen,
      toastState,
      tabManagerRef,
      handleSessionConnected,
      handleShowNotification,
      removeToast
    }
  }
}
</script>

<style lang="scss" scoped>
.app {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: color(bg-primary);
  color: color(text-primary);
  font-family: font-family(sans);
  font-size: font-size(base);
  line-height: line-height(normal);
}
</style>
