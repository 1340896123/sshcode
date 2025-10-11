class FileExplorer {
  constructor() {
    this.explorers = new Map(); // 存储每个标签页的文件浏览器状态
    this.currentTabId = null;
    this.init();
  }

  // 获取当前标签页的文件浏览器状态
  getCurrentExplorer() {
    if (!this.currentTabId) {
      this.currentTabId = window.tabManager?.getActiveTabId();
    }
    return this.explorers.get(this.currentTabId);
  }

  // 获取或创建文件浏览器状态
  getOrCreateExplorer(tabId) {
    if (!this.explorers.has(tabId)) {
      this.explorers.set(tabId, {
        fileList: document.querySelector(`.file-list[data-tab-id="${tabId}"]`),
        currentPathElement: document.querySelector(`.current-path[data-tab-id="${tabId}"]`),
        currentPath: '/',
        currentSession: null,
        pathHistory: ['/'],
        historyIndex: 0
      });
    }
    return this.explorers.get(tabId);
  }

  init() {
    // 监听标签页切换事件
    window.addEventListener('tabSwitch', (e) => {
      this.currentTabId = e.detail.tabId;
    });

    // 使用事件委托处理所有文件浏览器相关事件
    this.setupEventDelegation();
    
    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
    });

    // 设置拖拽上传
    this.setupDragAndDrop();
  }

  setupEventDelegation() {
    // 刷新按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-refresh-files')) {
        const tabId = e.target.dataset.tabId;
        this.refresh(tabId);
      }
    });

    // 上传按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-upload')) {
        const tabId = e.target.dataset.tabId;
        this.uploadFile(tabId);
      }
    });

    // 新建文件按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-new-file')) {
        const tabId = e.target.dataset.tabId;
        this.createNewFile(tabId);
      }
    });

    // 新建目录按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-new-dir')) {
        const tabId = e.target.dataset.tabId;
        this.createNewDirectory(tabId);
      }
    });

    // 前往按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-navigate')) {
        const tabId = e.target.dataset.tabId;
        this.navigateToPath(tabId);
      }
    });

    // 路径输入框事件
    document.addEventListener('keypress', (e) => {
      if (e.target.classList.contains('current-path')) {
        const tabId = e.target.dataset.tabId;
        if (e.key === 'Enter') {
          this.navigateToPath(tabId);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.completePath(tabId);
        }
      }
    });

    // 路径输入框焦点事件
    document.addEventListener('focus', (e) => {
      if (e.target.classList.contains('current-path')) {
        e.target.select();
      }
    }, true);

    // 文件列表点击事件
    document.addEventListener('click', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (fileItem) {
        const tabId = fileItem.dataset.tabId;
        const fileName = fileItem.dataset.fileName;
        const fileType = fileItem.dataset.fileType;
        
        if (e.target.classList.contains('file-download')) {
          e.stopPropagation();
          this.downloadFile(fileName, tabId);
        } else if (e.target.classList.contains('file-delete')) {
          e.stopPropagation();
          this.deleteFile(fileName, fileType, tabId);
        } else if (fileType === 'directory') {
          this.changeDirectory(fileName, tabId);
        } else {
          this.openFile(fileName, tabId);
        }
      }
    });

    // 文件列表双击事件
    document.addEventListener('dblclick', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (fileItem) {
        const tabId = fileItem.dataset.tabId;
        const fileName = fileItem.dataset.fileName;
        const fileType = fileItem.dataset.fileType;
        
        if (fileType === 'directory') {
          this.changeDirectory(fileName, tabId);
        } else {
          this.openFile(fileName, tabId);
        }
      }
    });
  }

  setupDragAndDrop() {
    document.addEventListener('dragover', (e) => {
      const fileList = e.target.closest('.file-list');
      if (fileList) {
        e.preventDefault();
        fileList.style.backgroundColor = '#2a2a2a';
      }
    });

    document.addEventListener('dragleave', (e) => {
      const fileList = e.target.closest('.file-list');
      if (fileList) {
        fileList.style.backgroundColor = '';
      }
    });

    document.addEventListener('drop', (e) => {
      const fileList = e.target.closest('.file-list');
      if (fileList) {
        e.preventDefault();
        fileList.style.backgroundColor = '';
        
        const tabId = fileList.dataset.tabId;
        const files = Array.from(e.dataTransfer.files);
        
        if (files.length > 0) {
          this.uploadDroppedFiles(files, tabId);
        }
      }
    });
  }

  async refresh(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    try {
      const result = await window.electronAPI.getFileList(explorer.currentSession.id, explorer.currentPath);
      
      if (result.success) {
        this.renderFileList(result.files, tabId);
      } else {
        this.showNotification(`获取文件列表失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`获取文件列表时发生错误: ${error.message}`, 'error');
    }
  }

  renderFileList(files, tabId) {
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.fileList) return;

    explorer.fileList.innerHTML = '';

    if (files.length === 0) {
      explorer.fileList.innerHTML = '<div class="empty-state">目录为空</div>';
      return;
    }

    // 排序：目录在前，文件在后，按名称排序
    files.sort((a, b) => {
      if (a.type === 'd' && b.type !== 'd') return -1;
      if (a.type !== 'd' && b.type === 'd') return 1;
      return a.name.localeCompare(b.name);
    });

    files.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.dataset.tabId = tabId;
      fileItem.dataset.fileName = file.name;
      fileItem.dataset.fileType = file.type;

      const icon = file.type === 'd' ? '📁' : this.getFileIcon(file.name);
      const size = file.type === 'd' ? '' : this.formatFileSize(file.size);
      const modified = new Date(file.modifyTime).toLocaleString();

      fileItem.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-details">
            <span class="file-size">${size}</span>
            <span class="file-date">${modified}</span>
          </div>
        </div>
        <div class="file-actions">
          ${file.type !== 'd' ? `<button class="btn btn-small file-download" title="下载">⬇</button>` : ''}
          <button class="btn btn-small file-delete" title="删除">🗑</button>
        </div>
      `;

      explorer.fileList.appendChild(fileItem);
    });
  }

  getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      'js': '📜',
      'ts': '📘',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'png': '🖼',
      'jpg': '🖼',
      'jpeg': '🖼',
      'gif': '🖼',
      'svg': '🎨',
      'pdf': '📕',
      'zip': '📦',
      'tar': '📦',
      'gz': '📦'
    };
    return iconMap[ext] || '📄';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async navigateToPath(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    const path = explorer.currentPathElement.value.trim();
    
    if (!path) return;

    explorer.currentPath = path;
    explorer.currentPathElement.value = path;
    
    // 添加到历史记录
    if (explorer.pathHistory[explorer.historyIndex] !== path) {
      explorer.pathHistory = explorer.pathHistory.slice(0, explorer.historyIndex + 1);
      explorer.pathHistory.push(path);
      explorer.historyIndex++;
    }

    await this.refresh(tabId);
  }

  async changeDirectory(dirName, tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    
    if (dirName === '..') {
      const parts = explorer.currentPath.split('/').filter(p => p);
      parts.pop();
      explorer.currentPath = '/' + parts.join('/');
      if (explorer.currentPath === '') explorer.currentPath = '/';
    } else {
      explorer.currentPath = explorer.currentPath === '/' ? `/${dirName}` : `${explorer.currentPath}/${dirName}`;
    }

    explorer.currentPathElement.value = explorer.currentPath;
    await this.refresh(tabId);
  }

  async uploadFile(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    try {
      const result = await window.electronAPI.selectAndUploadFile(explorer.currentSession.id, explorer.currentPath);
      
      if (result.success) {
        this.showNotification('文件上传成功', 'success');
        await this.refresh(tabId);
      } else {
        this.showNotification(`文件上传失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`文件上传时发生错误: ${error.message}`, 'error');
    }
  }

  async uploadDroppedFiles(files, tabId) {
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    for (const file of files) {
      try {
        const result = await window.electronAPI.uploadDroppedFile(explorer.currentSession.id, file, explorer.currentPath);
        
        if (!result.success) {
          this.showNotification(`上传 ${file.name} 失败: ${result.error}`, 'error');
        }
      } catch (error) {
        this.showNotification(`上传 ${file.name} 时发生错误: ${error.message}`, 'error');
      }
    }

    this.showNotification('文件上传完成', 'success');
    await this.refresh(tabId);
  }

  async downloadFile(fileName, tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    const remotePath = explorer.currentPath === '/' ? `/${fileName}` : `${explorer.currentPath}/${fileName}`;

    try {
      const result = await window.electronAPI.downloadFile(explorer.currentSession.id, remotePath);
      
      if (result.success) {
        this.showNotification(`文件已下载到: ${result.localPath}`, 'success');
      } else {
        this.showNotification(`文件下载失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`文件下载时发生错误: ${error.message}`, 'error');
    }
  }

  async openFile(fileName, tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    const remotePath = explorer.currentPath === '/' ? `/${fileName}` : `${explorer.currentPath}/${fileName}`;

    try {
      const result = await window.electronAPI.downloadAndOpenFile(explorer.currentSession.id, remotePath);
      
      if (result.success) {
        this.showNotification(`文件已打开: ${fileName}`, 'success');
      } else {
        this.showNotification(`打开文件失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`打开文件时发生错误: ${error.message}`, 'error');
    }
  }

  async deleteFile(fileName, fileType, tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    const typeText = fileType === 'd' ? '目录' : '文件';
    if (!confirm(`确定要删除${typeText} "${fileName}" 吗？`)) return;

    const remotePath = explorer.currentPath === '/' ? `/${fileName}` : `${explorer.currentPath}/${fileName}`;
    const command = fileType === 'd' ? `rm -rf "${remotePath}"` : `rm "${remotePath}"`;

    try {
      const result = await window.electronAPI.sshExecute(explorer.currentSession.id, command);
      
      if (result.success) {
        this.showNotification(`${typeText}删除成功`, 'success');
        await this.refresh(tabId);
      } else {
        this.showNotification(`删除失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`删除时发生错误: ${error.message}`, 'error');
    }
  }

  createNewFile(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const fileName = prompt('请输入文件名:');
    if (!fileName) return;

    const explorer = this.getOrCreateExplorer(tabId);
    const remotePath = explorer.currentPath === '/' ? `/${fileName}` : `${explorer.currentPath}/${fileName}`;
    const command = `touch "${remotePath}"`;

    this.executeCommand(command, `文件 "${fileName}" 创建成功`, tabId);
  }

  createNewDirectory(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const dirName = prompt('请输入目录名:');
    if (!dirName) return;

    const explorer = this.getOrCreateExplorer(tabId);
    const remotePath = explorer.currentPath === '/' ? `/${dirName}` : `${explorer.currentPath}/${dirName}`;
    const command = `mkdir -p "${remotePath}"`;

    this.executeCommand(command, `目录 "${dirName}" 创建成功`, tabId);
  }

  async executeCommand(command, successMessage, tabId) {
    const explorer = this.getOrCreateExplorer(tabId);
    if (!explorer.currentSession) return;

    try {
      const result = await window.electronAPI.sshExecute(explorer.currentSession.id, command);
      
      if (result.success) {
        this.showNotification(successMessage, 'success');
        await this.refresh(tabId);
      } else {
        this.showNotification(`操作失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`操作时发生错误: ${error.message}`, 'error');
    }
  }

  async completePath(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const explorer = this.getOrCreateExplorer(tabId);
    const currentPath = explorer.currentPathElement.value;
    
    // 简单的路径补全逻辑
    if (currentPath.includes('/')) {
      const lastSlash = currentPath.lastIndexOf('/');
      const dir = currentPath.substring(0, lastSlash) || '/';
      const prefix = currentPath.substring(lastSlash + 1);

      try {
        const result = await window.electronAPI.getFileList(explorer.currentSession.id, dir);
        
        if (result.success) {
          const matches = result.files
            .filter(file => file.name.startsWith(prefix) && file.type === 'd')
            .map(file => file.name);

          if (matches.length === 1) {
            explorer.currentPathElement.value = dir === '/' ? `/${matches[0]}` : `${dir}/${matches[0]}`;
          } else if (matches.length > 1) {
            // 显示多个匹配项
            this.showNotification(`多个匹配: ${matches.join(', ')}`, 'info');
          }
        }
      } catch (error) {
        console.error('路径补全失败:', error);
      }
    }
  }

  onSessionConnected(session, tabId = null) {
    if (tabId) {
      const explorer = this.getOrCreateExplorer(tabId);
      explorer.currentSession = session;
      explorer.currentPath = '/';
      explorer.currentPathElement.value = '/';
      this.refresh(tabId);
    } else {
      // 兼容旧版本，更新当前标签页
      const currentTabId = window.tabManager?.getActiveTabId();
      if (currentTabId) {
        this.onSessionConnected(session, currentTabId);
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// 创建文件浏览器实例
window.fileExplorer = new FileExplorer();