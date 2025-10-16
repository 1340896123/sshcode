<template>
  <div class="file-manager">
    <!-- 文件管理工具栏 -->
    <div class="file-toolbar">
      <div class="navigation-controls">
        <button class="nav-btn" @click="goBack" :disabled="!canGoBack" title="后退">
          ←
        </button>
        <button class="nav-btn" @click="goForward" :disabled="!canGoForward" title="前进">
          →
        </button>
        <button class="nav-btn" @click="goHome" title="主目录">
          🏠
        </button>
        <button class="nav-btn" @click="refreshDirectory" title="刷新">
          🔄
        </button>
      </div>

      <div class="current-path">
        <input
          type="text"
          v-model="currentPath"
          @keydown.enter="navigateToPath"
          class="path-input"
          title="当前路径"
        />
      </div>

      <div class="file-actions">
        <button class="action-btn" @click="createNewFile" title="新建文件">
          📄 新建
        </button>
        <button class="action-btn" @click="createNewDirectory" title="新建目录">
          📁 新建文件夹
        </button>
        <button class="action-btn" @click="uploadFile" title="上传文件">
          ⬆️ 上传
        </button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载文件列表...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="refreshDirectory">重试</button>
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>空目录</h3>
        <p>此目录中没有文件或文件夹</p>
      </div>

      <div v-else class="file-list">
        <!-- 返回上级目录 -->
        <div
          v-if="currentPath !== '/'"
          class="file-item directory-item"
          @click="navigateToParentDirectory"
        >
          <div class="file-icon">📁</div>
          <div class="file-info">
            <div class="file-name">..</div>
            <div class="file-description">返回上级目录</div>
          </div>
          <div class="file-meta"></div>
        </div>

        <!-- 目录列表 -->
        <div
          v-for="file in directories"
          :key="`dir-${file.name}`"
          class="file-item directory-item"
          @dblclick="navigateToDirectory(file.name)"
          @contextmenu.prevent="showContextMenu($event, file)"
        >
          <div class="file-icon">📁</div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-description">目录</div>
          </div>
          <div class="file-meta">
            <div class="file-date">{{ formatDate(file.modifyTime) }}</div>
          </div>
          <div class="file-actions-overlay">
            <button class="mini-action-btn" @click.stop="navigateToDirectory(file.name)" title="打开">
              👁️
            </button>
            <button class="mini-action-btn" @click.stop="renameItem(file)" title="重命名">
              ✏️
            </button>
            <button class="mini-action-btn delete-btn" @click.stop="deleteItem(file)" title="删除">
              🗑️
            </button>
          </div>
        </div>

        <!-- 文件列表 -->
        <div
          v-for="file in regularFiles"
          :key="`file-${file.name}`"
          class="file-item"
          :class="{ selected: selectedFiles.has(file.name) }"
          @click="toggleFileSelection(file.name, $event)"
          @dblclick="openFile(file)"
          @contextmenu.prevent="showContextMenu($event, file)"
          draggable="true"
          @dragstart="handleDragStart($event, file)"
          @dragover.prevent
          @drop.prevent="handleFileDrop($event, file)"
        >
          <div class="file-icon">{{ getFileIcon(file) }}</div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-description">
              {{ formatFileSize(file.size) }} • {{ getFilePermissions(file) }}
            </div>
          </div>
          <div class="file-meta">
            <div class="file-date">{{ formatDate(file.modifyTime) }}</div>
          </div>
          <div class="file-actions-overlay">
            <button class="mini-action-btn" @click.stop="downloadFile(file)" title="下载">
              ⬇️
            </button>
            <button class="mini-action-btn" @click.stop="openFile(file)" title="打开">
              👁️
            </button>
            <button class="mini-action-btn" @click.stop="renameItem(file)" title="重命名">
              ✏️
            </button>
            <button class="mini-action-btn delete-btn" @click.stop="deleteItem(file)" title="删除">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="file-status-bar">
      <div class="status-info">
        <span v-if="selectedFiles.size > 0">
          已选择 {{ selectedFiles.size }} 个项目
        </span>
        <span v-else>
          {{ directories.length }} 个目录，{{ regularFiles.length }} 个文件
        </span>
      </div>
      <div class="status-actions">
        <button
          v-if="selectedFiles.size > 0"
          class="status-btn"
          @click="downloadSelectedFiles"
          title="下载选中文件"
        >
          ⬇️ 下载选中
        </button>
        <button
          v-if="selectedFiles.size > 0"
          class="status-btn"
          @click="deleteSelectedFiles"
          title="删除选中文件"
        >
          🗑️ 删除选中
        </button>
        <button
          v-if="selectedFiles.size > 0"
          class="status-btn"
          @click="clearSelection"
          title="清除选择"
        >
          ✖️ 清除选择
        </button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :class="{ show: contextMenu.show }"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="contextMenuAction('open')" v-if="!contextMenu.item?.type?.includes('dir')">
        👁️ 打开
      </div>
      <div class="context-menu-item" @click="contextMenuAction('download')" v-if="!contextMenu.item?.type?.includes('dir')">
        ⬇️ 下载
      </div>
      <div class="context-menu-item" @click="contextMenuAction('rename')">
        ✏️ 重命名
      </div>
      <div class="context-menu-separator" v-if="!contextMenu.item?.type?.includes('dir')"></div>
      <div class="context-menu-item danger" @click="contextMenuAction('delete')">
        🗑️ 删除
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="contextMenuAction('properties')">
        ℹ️ 属性
      </div>
    </div>

    <!-- 新建文件/目录对话框 -->
    <div v-if="newItemModal.show" class="modal-overlay" @click="closeNewItemModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ newItemModal.type === 'file' ? '新建文件' : '新建目录' }}</h3>
          <button class="close-btn" @click="closeNewItemModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称:</label>
            <input
              type="text"
              v-model="newItemModal.name"
              @keydown.enter="confirmCreateNewItem"
              placeholder="输入名称"
              ref="newItemInput"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="primary-btn" @click="confirmCreateNewItem">创建</button>
          <button class="secondary-btn" @click="closeNewItemModal">取消</button>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="renameModal.show" class="modal-overlay" @click="closeRenameModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>重命名</h3>
          <button class="close-btn" @click="closeRenameModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>新名称:</label>
            <input
              type="text"
              v-model="renameModal.newName"
              @keydown.enter="confirmRename"
              ref="renameInput"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="primary-btn" @click="confirmRename">确定</button>
          <button class="secondary-btn" @click="closeRenameModal">取消</button>
        </div>
      </div>
    </div>

    <!-- 上传文件拖拽区域 -->
    <div
      v-if="dragOverlay.show"
      class="drag-overlay"
      @dragover.prevent
      @drop.prevent="handleGlobalFileDrop"
    >
      <div class="drag-content">
        <div class="drag-icon">📁</div>
        <h3>释放以上传文件</h3>
        <p>将文件拖放到此处以上传到当前目录</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

export default {
  name: 'FileManager',
  props: {
    connectionId: {
      type: String,
      required: true
    },
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['show-notification', 'execute-command'],
  setup(props, { emit }) {
    // 状态管理
    const files = ref([])
    const currentPath = ref('/')
    const loading = ref(false)
    const error = ref('')
    const selectedFiles = ref(new Set())
    const navigationHistory = ref([])
    const historyIndex = ref(-1)

    // 右键菜单状态
    const contextMenu = reactive({
      show: false,
      x: 0,
      y: 0,
      item: null
    })

    // 新建项目模态框
    const newItemModal = reactive({
      show: false,
      type: 'file', // 'file' or 'directory'
      name: ''
    })

    // 重命名模态框
    const renameModal = reactive({
      show: false,
      item: null,
      newName: ''
    })

    // 拖拽状态
    const dragOverlay = reactive({
      show: false
    })

    // 计算属性
    const directories = computed(() => {
      return files.value.filter(file => file.type === 'd' || file.type?.includes('dir')).sort((a, b) => a.name.localeCompare(b.name))
    })

    const regularFiles = computed(() => {
      return files.value.filter(file => file.type !== 'd' && !file.type?.includes('dir')).sort((a, b) => a.name.localeCompare(b.name))
    })

    const canGoBack = computed(() => historyIndex.value > 0)
    const canGoForward = computed(() => historyIndex.value < navigationHistory.value.length - 1)

    // 加载文件列表
    const loadFileList = async (path = currentPath.value) => {
      if (!props.connectionId) return

      loading.value = true
      error.value = ''

      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getFileList(props.connectionId, path)
          if (result.success) {
            files.value = result.files || []
            
            // 如果返回了备选路径，使用备选路径
            if (result.fallbackPath) {
              currentPath.value = result.fallbackPath
              emit('show-notification', `路径 ${path} 不存在，已自动切换到 ${result.fallbackPath}`, 'warning')
            } else {
              currentPath.value = path
            }

            // 更新导航历史
            if (historyIndex.value === -1 || navigationHistory.value[historyIndex.value] !== currentPath.value) {
              navigationHistory.value = navigationHistory.value.slice(0, historyIndex.value + 1)
              navigationHistory.value.push(currentPath.value)
              historyIndex.value = navigationHistory.value.length - 1
            }
          } else {
            error.value = result.error || '加载文件列表失败'
            emit('show-notification', `加载文件列表失败: ${error.value}`, 'error')
          }
        } else {
          // ElectronAPI不可用时显示错误
          error.value = 'ElectronAPI不可用，请在Electron环境中运行应用'
          emit('show-notification', 'ElectronAPI不可用，请在Electron环境中运行应用', 'error')
        }
      } catch (err) {
        error.value = err.message || '加载文件列表时发生异常'
        emit('show-notification', `加载文件列表异常: ${error.value}`, 'error')
      } finally {
        loading.value = false
      }
    }

    // 移除模拟文件列表函数，现在使用真实的SSH文件操作

    // 导航方法
    const navigateToDirectory = (dirName) => {
      const newPath = currentPath.value === '/' ? `/${dirName}` : `${currentPath.value}/${dirName}`
      loadFileList(newPath)
    }

    const navigateToParentDirectory = () => {
      if (currentPath.value === '/') return

      const parentPath = currentPath.value.split('/').slice(0, -1).join('/') || '/'
      loadFileList(parentPath)
    }

    const navigateToPath = () => {
      loadFileList(currentPath.value)
    }

    const goBack = () => {
      if (canGoBack.value) {
        historyIndex.value--
        loadFileList(navigationHistory.value[historyIndex.value])
      }
    }

    const goForward = () => {
      if (canGoForward.value) {
        historyIndex.value++
        loadFileList(navigationHistory.value[historyIndex.value])
      }
    }

    const goHome = () => {
      // 根据用户名确定主目录路径
      const homePath = props.connection.username === 'root' ? '/root' : `/home/${props.connection.username}`
      loadFileList(homePath)
    }

    const refreshDirectory = () => {
      loadFileList(currentPath.value)
    }

    // 文件选择
    const toggleFileSelection = (fileName, event) => {
      if (event.ctrlKey || event.metaKey) {
        // 多选
        if (selectedFiles.value.has(fileName)) {
          selectedFiles.value.delete(fileName)
        } else {
          selectedFiles.value.add(fileName)
        }
      } else {
        // 单选
        selectedFiles.value.clear()
        selectedFiles.value.add(fileName)
      }
    }

    const clearSelection = () => {
      selectedFiles.value.clear()
    }

    // 文件操作
    const openFile = (file) => {
      if (file.type?.includes('dir')) {
        navigateToDirectory(file.name)
      } else {
        downloadAndOpenFile(file)
      }
    }

    const downloadFile = async (file) => {
      try {
        emit('show-notification', '正在下载文件...', 'info')

        if (window.electronAPI) {
          const remotePath = currentPath.value === '/' ? `/${file.name}` : `${currentPath.value}/${file.name}`
          const result = await window.electronAPI.downloadFile(props.connectionId, remotePath)

          if (result.success) {
            emit('show-notification', `${file.name} 下载完成`, 'success')
          } else {
            emit('show-notification', `下载失败: ${result.error}`, 'error')
          }
        } else {
          emit('show-notification', 'ElectronAPI不可用，无法下载文件', 'error')
        }
      } catch (err) {
        emit('show-notification', `下载文件失败: ${err.message}`, 'error')
      }
    }

    const downloadAndOpenFile = async (file) => {
      try {
        emit('show-notification', '正在下载并打开文件...', 'info')

        if (window.electronAPI) {
          const remotePath = currentPath.value === '/' ? `/${file.name}` : `${currentPath.value}/${file.name}`
          const result = await window.electronAPI.downloadAndOpenFile(props.connectionId, remotePath)

          if (result.success) {
            emit('show-notification', `${file.name} 已打开`, 'success')
          } else {
            emit('show-notification', `打开文件失败: ${result.error}`, 'error')
          }
        } else {
          emit('show-notification', 'ElectronAPI不可用，无法打开文件', 'error')
        }
      } catch (err) {
        emit('show-notification', `打开文件失败: ${err.message}`, 'error')
      }
    }

    const uploadFile = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.selectAndUploadFile(props.connectionId, currentPath.value)

          if (result.success) {
            emit('show-notification', '文件上传成功', 'success')
            refreshDirectory()
          } else {
            emit('show-notification', `上传失败: ${result.error}`, 'error')
          }
        } else {
          emit('show-notification', 'ElectronAPI不可用，无法上传文件', 'error')
        }
      } catch (err) {
        emit('show-notification', `上传文件失败: ${err.message}`, 'error')
      }
    }

    // 新建文件/目录
    const createNewFile = () => {
      newItemModal.type = 'file'
      newItemModal.name = ''
      newItemModal.show = true
      nextTick(() => {
        document.querySelector('[ref="newItemInput"]')?.focus()
      })
    }

    const createNewDirectory = () => {
      newItemModal.type = 'directory'
      newItemModal.name = ''
      newItemModal.show = true
      nextTick(() => {
        document.querySelector('[ref="newItemInput"]')?.focus()
      })
    }

    const confirmCreateNewItem = async () => {
      if (!newItemModal.name.trim()) {
        emit('show-notification', '名称不能为空', 'warning')
        return
      }

      try {
        const command = newItemModal.type === 'directory'
          ? `mkdir -p "${currentPath.value}/${newItemModal.name}"`
          : `touch "${currentPath.value}/${newItemModal.name}"`

        emit('execute-command', command)
        emit('show-notification', `${newItemModal.type === 'directory' ? '目录' : '文件'}创建成功`, 'success')
        closeNewItemModal()
        refreshDirectory()
      } catch (err) {
        emit('show-notification', `创建失败: ${err.message}`, 'error')
      }
    }

    const closeNewItemModal = () => {
      newItemModal.show = false
      newItemModal.name = ''
    }

    // 重命名
    const renameItem = (item) => {
      renameModal.item = item
      renameModal.newName = item.name
      renameModal.show = true
      nextTick(() => {
        document.querySelector('[ref="renameInput"]')?.focus()
        document.querySelector('[ref="renameInput"]')?.select()
      })
    }

    const confirmRename = async () => {
      if (!renameModal.newName.trim() || renameModal.newName === renameModal.item.name) {
        closeRenameModal()
        return
      }

      try {
        const oldPath = currentPath.value === '/' ? `/${renameModal.item.name}` : `${currentPath.value}/${renameModal.item.name}`
        const newPath = currentPath.value === '/' ? `/${renameModal.newName}` : `${currentPath.value}/${renameModal.newName}`
        const command = `mv "${oldPath}" "${newPath}"`

        emit('execute-command', command)
        emit('show-notification', '重命名成功', 'success')
        closeRenameModal()
        refreshDirectory()
      } catch (err) {
        emit('show-notification', `重命名失败: ${err.message}`, 'error')
      }
    }

    const closeRenameModal = () => {
      renameModal.show = false
      renameModal.item = null
      renameModal.newName = ''
    }

    // 删除
    const deleteItem = async (item) => {
      if (!confirm(`确定要删除 ${item.name} 吗？此操作不可撤销。`)) {
        return
      }

      try {
        const path = currentPath.value === '/' ? `/${item.name}` : `${currentPath.value}/${item.name}`
        const command = item.type?.includes('dir') ? `rm -rf "${path}"` : `rm "${path}"`

        emit('execute-command', command)
        emit('show-notification', `${item.name} 已删除`, 'success')
        refreshDirectory()
      } catch (err) {
        emit('show-notification', `删除失败: ${err.message}`, 'error')
      }
    }

    const deleteSelectedFiles = async () => {
      if (selectedFiles.value.size === 0) return

      if (!confirm(`确定要删除选中的 ${selectedFiles.value.size} 个项目吗？此操作不可撤销。`)) {
        return
      }

      try {
        for (const fileName of selectedFiles.value) {
          const file = [...directories.value, ...regularFiles.value].find(f => f.name === fileName)
          if (file) {
            const path = currentPath.value === '/' ? `/${fileName}` : `${currentPath.value}/${fileName}`
            const command = file.type?.includes('dir') ? `rm -rf "${path}"` : `rm "${path}"`
            emit('execute-command', command)
          }
        }

        emit('show-notification', `已删除 ${selectedFiles.value.size} 个项目`, 'success')
        clearSelection()
        refreshDirectory()
      } catch (err) {
        emit('show-notification', `删除失败: ${err.message}`, 'error')
      }
    }

    const downloadSelectedFiles = async () => {
      if (selectedFiles.value.size === 0) return

      try {
        let count = 0
        for (const fileName of selectedFiles.value) {
          const file = regularFiles.value.find(f => f.name === fileName)
          if (file) {
            await downloadFile(file)
            count++
          }
        }

        emit('show-notification', `已下载 ${count} 个文件`, 'success')
        clearSelection()
      } catch (err) {
        emit('show-notification', `批量下载失败: ${err.message}`, 'error')
      }
    }

    // 右键菜单
    const showContextMenu = (event, item) => {
      // 先设置位置但隐藏菜单
      let x = event.clientX
      let y = event.clientY

      // 初步位置调整，避免立即超出边界
      const padding = 8
      if (x < padding) x = padding
      if (y < padding) y = padding

      contextMenu.x = x
      contextMenu.y = y
      contextMenu.item = item

      // 显示菜单
      contextMenu.show = true

      // 使用 nextTick 确保菜单已渲染后再精确计算位置
      nextTick(() => {
        const menuElement = document.querySelector('.context-menu')
        if (!menuElement) return

        const menuRect = menuElement.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // 精确位置调整
        if (x + menuRect.width > viewportWidth - padding) {
          x = viewportWidth - menuRect.width - padding
        }

        if (y + menuRect.height > viewportHeight - padding) {
          y = viewportHeight - menuRect.height - padding
        }

        // 更新最终位置
        contextMenu.x = x
        contextMenu.y = y
      })
    }

    const hideContextMenu = () => {
      contextMenu.show = false
      contextMenu.item = null
    }

    const contextMenuAction = (action) => {
      if (!contextMenu.item) return

      switch (action) {
        case 'open':
          openFile(contextMenu.item)
          break
        case 'download':
          downloadFile(contextMenu.item)
          break
        case 'rename':
          renameItem(contextMenu.item)
          break
        case 'delete':
          deleteItem(contextMenu.item)
          break
        case 'properties':
          showFileProperties(contextMenu.item)
          break
      }

      hideContextMenu()
    }

    const showFileProperties = (file) => {
      const details = `
名称: ${file.name}
类型: ${file.type?.includes('dir') ? '目录' : '文件'}
大小: ${formatFileSize(file.size)}
权限: ${getFilePermissions(file)}
修改时间: ${formatDate(file.modifyTime)}
所有者: ${file.owner}:${file.group}
      `.trim()

      emit('show-notification', details, 'info')
    }

    // 拖拽处理
    const handleDragStart = (event, file) => {
      event.dataTransfer.effectAllowed = 'copy'
      event.dataTransfer.setData('text/plain', file.name)
    }

    const handleFileDrop = (event, targetFile) => {
      // 处理文件拖拽到其他文件上（可以实现文件移动等功能）
      event.preventDefault()
    }

    const handleGlobalFileDrop = async (event) => {
      event.preventDefault()
      dragOverlay.show = false

      const files = Array.from(event.dataTransfer.files)
      if (files.length === 0) return

      try {
        for (const file of files) {
          if (window.electronAPI) {
            const result = await window.electronAPI.uploadDroppedFile(props.connectionId, file, currentPath.value)

            if (result.success) {
              emit('show-notification', `${file.name} 上传成功`, 'success')
            } else {
              emit('show-notification', `${file.name} 上传失败: ${result.error}`, 'error')
            }
          } else {
            emit('show-notification', 'ElectronAPI不可用，无法上传文件', 'error')
          }
        }

        refreshDirectory()
      } catch (err) {
        emit('show-notification', `文件上传失败: ${err.message}`, 'error')
      }
    }

    // 工具函数
    const getFileIcon = (file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      const iconMap = {
        // 文档
        'txt': '📄', 'md': '📝', 'pdf': '📕', 'doc': '📘', 'docx': '📘',
        'xls': '📗', 'xlsx': '📗', 'ppt': '📙', 'pptx': '📙',
        // 代码
        'js': '📜', 'ts': '📘', 'html': '🌐', 'css': '🎨', 'json': '📋',
        'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️', 'go': '🐹',
        // 图片
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🎨',
        'ico': '🖼️', 'bmp': '🖼️',
        // 音频
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵',
        // 视频
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬',
        // 压缩包
        'zip': '📦', 'rar': '📦', 'tar': '📦', 'gz': '📦', '7z': '📦',
        // 其他
        'exe': '⚙️', 'dmg': '💿', 'iso': '💿', 'apk': '📱'
      }

      return iconMap[extension] || '📄'
    }

    const getFilePermissions = (file) => {
      return file.permissions || 'rw-r--r--'
    }

    const formatFileSize = (bytes) => {
      if (!bytes || bytes === 0) return '0 B'

      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))

      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatDate = (date) => {
      if (!date) return '-'

      const d = new Date(date)
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 事件监听
    const handleClickOutside = (event) => {
      if (!event.target.closest('.context-menu')) {
        hideContextMenu()
      }
    }

    const handleGlobalDragOver = (event) => {
      event.preventDefault()
      dragOverlay.show = true
    }

    const handleGlobalDragLeave = (event) => {
      event.preventDefault()
      if (event.target === document.documentElement) {
        dragOverlay.show = false
      }
    }

    // 生命周期
    onMounted(() => {
      loadFileList()
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('dragover', handleGlobalDragOver)
      document.addEventListener('dragleave', handleGlobalDragLeave)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('dragover', handleGlobalDragOver)
      document.removeEventListener('dragleave', handleGlobalDragLeave)
    })

    // 监听连接变化
    watch(() => props.connectionId, (newId) => {
      if (newId) {
        loadFileList()
      }
    })

    return {
      files,
      currentPath,
      loading,
      error,
      selectedFiles,
      contextMenu,
      newItemModal,
      renameModal,
      dragOverlay,
      directories,
      regularFiles,
      canGoBack,
      canGoForward,
      loadFileList,
      navigateToDirectory,
      navigateToParentDirectory,
      navigateToPath,
      goBack,
      goForward,
      goHome,
      refreshDirectory,
      toggleFileSelection,
      clearSelection,
      openFile,
      downloadFile,
      downloadAndOpenFile,
      uploadFile,
      createNewFile,
      createNewDirectory,
      confirmCreateNewItem,
      closeNewItemModal,
      renameItem,
      confirmRename,
      closeRenameModal,
      deleteItem,
      deleteSelectedFiles,
      downloadSelectedFiles,
      showContextMenu,
      hideContextMenu,
      contextMenuAction,
      showFileProperties,
      handleDragStart,
      handleFileDrop,
      handleGlobalFileDrop,
      getFileIcon,
      getFilePermissions,
      formatFileSize,
      formatDate
    }
  }
}
</script>

<style lang="scss" scoped>
.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: color(bg-primary);
  overflow: hidden;
}

// 工具栏样式
.file-toolbar {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(sm) spacing(md);
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  min-height: 48px;
}

.navigation-controls {
  display: flex;
  gap: spacing(xs);
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all transition(fast) ease;

  &:hover:not(:disabled) {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.current-path {
  flex: 1;
  min-width: 200px;
}

.path-input {
  width: 100%;
  padding: spacing(xs) spacing(sm);
  background: color(bg-primary);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  color: color(text-primary);
  font-family: font-family(mono);
  font-size: font-size(sm);

  &:focus {
    outline: none;
    border-color: color(primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}

.file-actions {
  display: flex;
  gap: spacing(xs);
}

.action-btn {
  padding: spacing(xs) spacing(sm);
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  font-size: font-size(xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: spacing(xs);
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary-light);
  }
}

// 文件列表容器
.file-list-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

// 状态样式
.loading-state,
.error-state,
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
  color: color(text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid color(border);
  border-top: 3px solid color(primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: spacing(md);
}

.error-icon,
.empty-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.retry-btn {
  margin-top: spacing(md);
  padding: spacing(sm) spacing(lg);
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  cursor: pointer;
}

// 文件列表样式
.file-list {
  height: 100%;
  overflow-y: auto;
  padding: spacing(xs);
}

.file-item {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(sm) spacing(md);
  border-radius: border-radius(sm);
  cursor: pointer;
  transition: all transition(fast) ease;
  position: relative;
  user-select: none;

  &:hover {
    background: color(bg-secondary);

    .file-actions-overlay {
      opacity: 1;
    }
  }

  &.selected {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  &.directory-item {
    font-weight: font-weight(medium);
  }
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-description {
  font-size: font-size(xs);
  color: color(text-muted);
  margin-top: 2px;
}

.file-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.file-date {
  font-size: font-size(xs);
  color: color(text-muted);
  white-space: nowrap;
}

.file-actions-overlay {
  display: flex;
  gap: spacing(xs);
  opacity: 0;
  transition: opacity transition(fast) ease;
}

.mini-action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: border-radius(full);
  background: color(bg-tertiary);
  color: color(text-secondary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary);
    color: color(white);
  }

  &.delete-btn:hover {
    background: color(error);
  }
}

// 状态栏样式
.file-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(md);
  background: color(bg-secondary);
  border-top: 1px solid color(border);
  font-size: font-size(xs);
  color: color(text-muted);
}

.status-actions {
  display: flex;
  gap: spacing(xs);
}

.status-btn {
  padding: spacing(xs) spacing(sm);
  background: color(bg-tertiary);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  color: color(text-secondary);
  font-size: font-size(xs);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover {
    background: color(bg-primary);
    color: color(text-primary);
  }
}

// 右键菜单样式
.context-menu {
  position: fixed;
  background: color(surface);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  box-shadow: shadow(lg);
  z-index: z-index(dropdown);
  min-width: 160px;
  padding: spacing(xs) 0;
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.15s ease-out;
  transform-origin: top left;

  &.show {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  padding: spacing(xs) spacing(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: spacing(xs);
  font-size: font-size(sm);
  color: color(text-primary);
  transition: background-color transition(fast) ease;

  &:hover {
    background: color(bg-secondary);
  }

  &.danger {
    color: color(error);

    &:hover {
      background: rgba(220, 38, 38, 0.1);
    }
  }
}

.context-menu-separator {
  height: 1px;
  background: color(border);
  margin: spacing(xs) 0;
}

// 模态框样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index(modal);
}

.modal-content {
  background: color(surface);
  border-radius: border-radius(md);
  box-shadow: shadow(lg);
  min-width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(md);
  border-bottom: 1px solid color(border);
}

.modal-header h3 {
  margin: 0;
  font-size: font-size(lg);
  color: color(text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: color(text-muted);
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: border-radius(full);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.modal-body {
  padding: spacing(md);
}

.modal-footer {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  padding: spacing(md);
  border-top: 1px solid color(border);
}

.form-group {
  margin-bottom: spacing(md);
}

.form-group label {
  display: block;
  margin-bottom: spacing(xs);
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
}

.form-group input {
  width: 100%;
  padding: spacing(sm);
  background: color(bg-primary);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  color: color(text-primary);
  font-size: font-size(base);

  &:focus {
    outline: none;
    border-color: color(primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}

.primary-btn,
.secondary-btn {
  padding: spacing(sm) spacing(lg);
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  cursor: pointer;
  transition: all transition(fast) ease;
}

.primary-btn {
  background: color(primary);
  color: color(white);
  border: none;

  &:hover {
    background: color(primary-light);
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

// 拖拽覆盖层样式
.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index(drag-overlay);
  border: 2px dashed color(primary);
}

.drag-content {
  text-align: center;
  color: color(primary);
}

.drag-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.drag-content h3 {
  margin: 0 0 spacing(sm) 0;
  font-size: font-size(xl);
  color: color(primary);
}

.drag-content p {
  margin: 0;
  font-size: font-size(base);
  color: color(primary);
}

// 动画
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .file-toolbar {
    flex-wrap: wrap;
    gap: spacing(xs);
    padding: spacing(xs);
  }

  .navigation-controls {
    order: 1;
  }

  .current-path {
    order: 3;
    min-width: 100%;
    margin-top: spacing(xs);
  }

  .file-actions {
    order: 2;
  }

  .action-btn {
    padding: spacing(xs);
    font-size: font-size(xs);

    span:not(.icon) {
      display: none;
    }
  }

  .file-item {
    padding: spacing(xs) spacing(sm);
  }

  .file-meta {
    display: none;
  }

  .file-actions-overlay {
    opacity: 1;
  }

  .modal-content {
    min-width: 300px;
  }
}
</style>
