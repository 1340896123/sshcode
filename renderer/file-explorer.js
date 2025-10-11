class FileExplorer {
  constructor() {
    this.fileList = document.getElementById('file-list');
    this.currentPathElement = document.getElementById('current-path');
    this.currentPath = '/';
    this.currentSession = null;
    this.pathHistory = ['/'];
    this.historyIndex = 0;
    this.init();
  }

  init() {
    // 刷新按钮
    document.getElementById('btn-refresh-files').addEventListener('click', () => {
      this.refresh();
    });

    // 上传按钮
    document.getElementById('btn-upload').addEventListener('click', () => {
      this.uploadFile();
    });

    // 新建文件按钮
    document.getElementById('btn-new-file').addEventListener('click', () => {
      this.createNewFile();
    });

    // 新建目录按钮
    document.getElementById('btn-new-dir').addEventListener('click', () => {
      this.createNewDirectory();
    });

    // 前往按钮
    document.getElementById('btn-navigate').addEventListener('click', () => {
      this.navigateToPath();
    });

    // 路径输入框回车事件
    this.currentPathElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.navigateToPath();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.completePath();
      }
    });

    // 路径输入框焦点事件
    this.currentPathElement.addEventListener('focus', () => {
      this.currentPathElement.select();
    });

    // 路径输入框键盘事件
    this.currentPathElement.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        this.navigateHistory(1);
      } else if (e.key === 'Escape') {
        // ESC键恢复当前路径
        this.updateBreadcrumb(this.currentPath);
        this.currentPathElement.blur();
      }
    });

    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
    });

    // 添加拖拽事件监听
    this.setupDragAndDrop();

    // 添加文件列表右键菜单
    this.fileList.addEventListener('contextmenu', (e) => {
      // 只有点击空白区域时才显示新建菜单
      if (e.target === this.fileList) {
        e.preventDefault();
        this.showEmptySpaceContextMenu(e);
      }
    });

    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+N: 新建文件
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.createNewFile();
      }
      // Ctrl+Shift+D: 新建目录
      else if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.createNewDirectory();
      }
    });
  }

  async onSessionConnected(session) {
    this.currentSession = session;
    this.currentPath = '/';
    await this.loadFiles();
  }

  async loadFiles(path = this.currentPath) {
    if (!this.currentSession) {
      this.showEmptyState('请先连接SSH服务器');
      return;
    }

    try {
      this.showLoading();
      const result = await window.electronAPI.getFileList(this.currentSession.id, path);
      
      if (result.success) {
        this.currentPath = path;
        this.renderFiles(result.files);
        this.updateBreadcrumb(path);
        this.addToHistory(path);
      } else {
        this.showError('加载文件列表失败: ' + result.error);
      }
    } catch (error) {
      this.showError('加载文件列表失败: ' + error.message);
    }
  }

  renderFiles(files) {
    this.fileList.innerHTML = '';

    // 添加返回上级目录选项
    if (this.currentPath !== '/') {
      const parentItem = this.createFileItem({
        type: 'd',
        name: '..',
        size: 0,
        modifyTime: new Date()
      }, true);
      this.fileList.appendChild(parentItem);
    }

    // 先显示目录，后显示文件
    const directories = files.filter(file => file.type === 'd' && file.name !== '.' && file.name !== '..');
    const regularFiles = files.filter(file => file.type !== 'd');

    directories.forEach(file => {
      const item = this.createFileItem(file);
      this.fileList.appendChild(item);
    });

    regularFiles.forEach(file => {
      const item = this.createFileItem(file);
      this.fileList.appendChild(item);
    });
  }

  createFileItem(file, isParent = false) {
    const item = document.createElement('div');
    item.className = `file-item ${file.type === 'd' ? 'directory' : 'file'}`;
    
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = file.type === 'd' ? '📁' : '📄';
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    
    const size = document.createElement('span');
    size.className = 'file-size';
    size.textContent = this.formatFileSize(file.size);
    
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(size);
    
    item.addEventListener('click', () => {
      this.handleFileClick(file, isParent);
    });

    item.addEventListener('dblclick', () => {
      this.handleFileDoubleClick(file, isParent);
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, file);
    });

    return item;
  }

  handleFileClick(file, isParent) {
    // 切换选中状态
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
  }

  async handleFileDoubleClick(file, isParent) {
    if (isParent || file.type === 'd') {
      // 进入目录
      const newPath = isParent ? this.getParentPath(this.currentPath) : 
                      this.currentPath === '/' ? `/${file.name}` : 
                      `${this.currentPath}/${file.name}`;
      await this.loadFiles(newPath);
    } else {
      // 下载并打开文件
      await this.downloadAndOpenFile(file);
    }
  }

  showEmptySpaceContextMenu(event) {
    // 移除已存在的上下文菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.backgroundColor = '#2d2d30';
    menu.style.border = '1px solid #3e3e42';
    menu.style.borderRadius = '4px';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '180px';
    menu.style.visibility = 'hidden'; // 先隐藏，用于计算尺寸

    const menuItems = [
      { text: '📄 新建文件', action: () => this.createNewFile() },
      { text: '📁 新建目录', action: () => this.createNewDirectory() },
      { type: 'separator' },
      { text: '📥 上传文件', action: () => this.uploadFile() },
      { type: 'separator' },
      { text: '🔄 刷新', action: () => this.refresh() }
    ];

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.text;
        menuItem.style.padding = '8px 15px';
        menuItem.style.cursor = 'pointer';
        menuItem.style.fontSize = '13px';
        menuItem.style.color = '#d4d4d4';
        menuItem.style.display = 'flex';
        menuItem.style.alignItems = 'center';
        
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.backgroundColor = '#3e3e42';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = 'transparent';
        });
        
        menuItem.addEventListener('click', () => {
          item.action();
          menu.remove();
        });
        
        menu.appendChild(menuItem);
      }
    });

    // 计算菜单位置，确保不超出窗口边界
    this.positionMenu(menu, event.pageX, event.pageY);

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  showContextMenu(event, file) {
    // 移除已存在的上下文菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.backgroundColor = '#2d2d30';
    menu.style.border = '1px solid #3e3e42';
    menu.style.borderRadius = '4px';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '180px';
    menu.style.visibility = 'hidden'; // 先隐藏，用于计算尺寸

    const menuItems = [];

    if (file.type === 'd') {
      menuItems.push(
        { text: '📂 打开', action: () => this.handleFileDoubleClick(file) },
        { type: 'separator' },
        { text: '📄 新建文件', action: () => this.createFile(file) },
        { text: '📁 新建目录', action: () => this.createDirectory(file) }
      );
    } else {
      menuItems.push(
        { text: '⬇️ 下载', action: () => this.downloadFile(file) },
        { text: '✏️ 编辑', action: () => this.editFile(file) },
        { text: '🗑️ 删除', action: () => this.deleteFile(file) }
      );
    }

    menuItems.push(
      { type: 'separator' },
      { text: '✏️ 重命名', action: () => this.renameFile(file) },
      { text: 'ℹ️ 属性', action: () => this.showFileProperties(file) }
    );

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.text;
        menuItem.style.padding = '8px 15px';
        menuItem.style.cursor = 'pointer';
        menuItem.style.fontSize = '13px';
        menuItem.style.color = '#d4d4d4';
        menuItem.style.display = 'flex';
        menuItem.style.alignItems = 'center';
        
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.backgroundColor = '#3e3e42';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = 'transparent';
        });
        
        menuItem.addEventListener('click', () => {
          item.action();
          menu.remove();
        });
        
        menu.appendChild(menuItem);
      }
    });

    // 计算菜单位置，确保不超出窗口边界
    this.positionMenu(menu, event.pageX, event.pageY);

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  updateBreadcrumb(path) {
    this.currentPathElement.value = path;
  }

  async navigateToPath() {
    const inputPath = this.currentPathElement.value.trim();
    
    if (!inputPath) {
      this.showNotification('请输入有效路径', 'error');
      this.setPathInputState('error');
      return;
    }

    if (!this.currentSession) {
      this.showNotification('请先连接SSH服务器', 'error');
      this.setPathInputState('error');
      return;
    }

    // 处理特殊路径快捷方式
    let normalizedPath = this.expandPathShortcuts(inputPath);
    
    // 标准化路径
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }

    // 处理相对路径中的 . 和 ..
    normalizedPath = this.normalizePath(normalizedPath);

    try {
      this.setPathInputState('loading');
      const result = await window.electronAPI.getFileList(this.currentSession.id, normalizedPath);
      
      if (result.success) {
        this.currentPath = normalizedPath;
        this.renderFiles(result.files);
        this.updateBreadcrumb(normalizedPath);
        this.addToHistory(normalizedPath);
        this.setPathInputState('success');
        this.showNotification(`已导航到: ${normalizedPath}`, 'success');
        
        // 2秒后恢复正常状态
        setTimeout(() => {
          this.setPathInputState('normal');
        }, 2000);
      } else {
        this.showError('导航失败: ' + result.error);
        this.setPathInputState('error');
        // 恢复原来的路径
        this.updateBreadcrumb(this.currentPath);
      }
    } catch (error) {
      this.showError('导航失败: ' + error.message);
      this.setPathInputState('error');
      // 恢复原来的路径
      this.updateBreadcrumb(this.currentPath);
    }
  }

  setPathInputState(state) {
    this.currentPathElement.classList.remove('error', 'success');
    
    switch (state) {
      case 'error':
        this.currentPathElement.classList.add('error');
        break;
      case 'success':
        this.currentPathElement.classList.add('success');
        break;
      case 'loading':
        this.currentPathElement.style.opacity = '0.6';
        break;
      case 'normal':
        this.currentPathElement.style.opacity = '1';
        this.currentPathElement.classList.remove('error', 'success');
        break;
    }
  }

  expandPathShortcuts(path) {
    const shortcuts = {
      '~': '/home',
      '~root': '/root',
      '~user': '/home',
      'var': '/var',
      'etc': '/etc',
      'usr': '/usr',
      'tmp': '/tmp',
      'opt': '/opt',
      'home': '/home',
      'root': '/root'
    };

    // 检查是否是快捷方式
    if (shortcuts[path]) {
      return shortcuts[path];
    }

    // 检查是否以快捷方式开头
    for (const [shortcut, fullPath] of Object.entries(shortcuts)) {
      if (path.startsWith(shortcut + '/')) {
        return fullPath + path.substring(shortcut.length);
      }
    }

    return path;
  }

  normalizePath(path) {
    const parts = path.split('/').filter(part => part !== '');
    const normalizedParts = [];
    
    for (const part of parts) {
      if (part === '..') {
        if (normalizedParts.length > 0) {
          normalizedParts.pop();
        }
      } else if (part !== '.') {
        normalizedParts.push(part);
      }
    }
    
    return '/' + normalizedParts.join('/');
  }

  getParentPath(path) {
    if (path === '/') return '/';
    const parts = path.split('/').filter(part => part);
    parts.pop();
    return parts.length === 0 ? '/' : '/' + parts.join('/');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showEmptyState(message) {
    this.fileList.innerHTML = `<div class="empty-state">${message}</div>`;
  }

  showLoading() {
    this.fileList.innerHTML = '<div class="loading"></div>';
  }

  showError(message) {
    this.fileList.innerHTML = `<div class="empty-state" style="color: #d16969;">${message}</div>`;
  }

  async refresh() {
    await this.loadFiles(this.currentPath);
  }

  async downloadFile(file) {
    if (!this.currentSession) {
      this.showNotification('请先连接SSH服务器', 'error');
      return;
    }

    try {
      const remotePath = this.currentPath === '/' ? `/${file.name}` : `${this.currentPath}/${file.name}`;
      const result = await window.electronAPI.downloadFile(this.currentSession.id, remotePath);
      
      if (result.success) {
        this.showNotification(`文件已下载到: ${result.localPath}`, 'success');
      } else {
        this.showNotification('文件下载失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('文件下载失败: ' + error.message, 'error');
    }
  }

  async downloadAndOpenFile(file) {
    if (!this.currentSession) {
      this.showNotification('请先连接SSH服务器', 'error');
      return;
    }

    try {
      const remotePath = this.currentPath === '/' ? `/${file.name}` : `${this.currentPath}/${file.name}`;
      const result = await window.electronAPI.downloadAndOpenFile(this.currentSession.id, remotePath);
      
      if (result.success) {
        this.showNotification(`文件已打开: ${file.name}`, 'success');
        this.showNotification('文件修改后会自动提示同步', 'info');
        
        // 开始监听文件变化
        this.startFileWatcher(remotePath, result.localPath);
      } else {
        this.showNotification('文件打开失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('文件打开失败: ' + error.message, 'error');
    }
  }

  async uploadFile() {
    if (!this.currentSession) {
      this.showNotification('请先连接SSH服务器', 'error');
      return;
    }

    try {
      const result = await window.electronAPI.selectAndUploadFile(this.currentSession.id, this.currentPath);
      
      if (result.success) {
        this.showNotification('文件上传成功', 'success');
        await this.refresh();
      } else {
        this.showNotification('文件上传失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('文件上传失败: ' + error.message, 'error');
    }
  }

  async createNewFile() {
    const fileName = prompt('请输入文件名:');
    if (!fileName) return;

    // 验证文件名
    if (!this.isValidFileName(fileName)) {
      this.showNotification('文件名包含非法字符', 'error');
      return;
    }

    try {
      const filePath = this.currentPath === '/' ? `/${fileName}` : `${this.currentPath}/${fileName}`;
      const command = `touch "${filePath}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification(`文件 "${fileName}" 创建成功`, 'success');
        // 自动选中新创建的文件
        setTimeout(() => {
          this.selectFileByName(fileName);
        }, 100);
      } else {
        this.showNotification('文件创建失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('文件创建失败: ' + error.message, 'error');
    }
  }

  async createNewDirectory() {
    const dirName = prompt('请输入目录名:');
    if (!dirName) return;

    // 验证目录名
    if (!this.isValidFileName(dirName)) {
      this.showNotification('目录名包含非法字符', 'error');
      return;
    }

    try {
      const dirPath = this.currentPath === '/' ? `/${dirName}` : `${this.currentPath}/${dirName}`;
      const command = `mkdir "${dirPath}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification(`目录 "${dirName}" 创建成功`, 'success');
        // 自动选中新创建的目录
        setTimeout(() => {
          this.selectFileByName(dirName);
        }, 100);
      } else {
        this.showNotification('目录创建失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('目录创建失败: ' + error.message, 'error');
    }
  }

  async createFile(parentDir) {
    const fileName = prompt('请输入文件名:');
    if (!fileName) return;

    if (!this.isValidFileName(fileName)) {
      this.showNotification('文件名包含非法字符', 'error');
      return;
    }

    try {
      const parentPath = parentDir.name === '..' ? this.getParentPath(this.currentPath) : 
                        this.currentPath === '/' ? `/${parentDir.name}` : 
                        `${this.currentPath}/${parentDir.name}`;
      const filePath = `${parentPath}/${fileName}`;
      const command = `touch "${filePath}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification(`文件 "${fileName}" 创建成功`, 'success');
      } else {
        this.showNotification('文件创建失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('文件创建失败: ' + error.message, 'error');
    }
  }

  async createDirectory(parentDir) {
    const dirName = prompt('请输入目录名:');
    if (!dirName) return;

    if (!this.isValidFileName(dirName)) {
      this.showNotification('目录名包含非法字符', 'error');
      return;
    }

    try {
      const parentPath = parentDir.name === '..' ? this.getParentPath(this.currentPath) : 
                        this.currentPath === '/' ? `/${parentDir.name}` : 
                        `${this.currentPath}/${parentDir.name}`;
      const dirPath = `${parentPath}/${dirName}`;
      const command = `mkdir "${dirPath}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification(`目录 "${dirName}" 创建成功`, 'success');
      } else {
        this.showNotification('目录创建失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('目录创建失败: ' + error.message, 'error');
    }
  }

  async deleteFile(file) {
    if (!confirm(`确定要删除 "${file.name}" 吗？`)) return;

    try {
      const command = file.type === 'd' ? 
        `rm -rf "${this.currentPath === '/' ? '' : this.currentPath}/${file.name}"` :
        `rm "${this.currentPath === '/' ? '' : this.currentPath}/${file.name}"`;
      
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification('删除成功', 'success');
      } else {
        this.showNotification('删除失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('删除失败: ' + error.message, 'error');
    }
  }

  async renameFile(file) {
    const newName = prompt('请输入新名称:', file.name);
    if (!newName || newName === file.name) return;

    try {
      const command = `mv "${this.currentPath === '/' ? '' : this.currentPath}/${file.name}" "${this.currentPath === '/' ? '' : this.currentPath}/${newName}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification('重命名成功', 'success');
      } else {
        this.showNotification('重命名失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('重命名失败: ' + error.message, 'error');
    }
  }

  editFile(file) {
    // TODO: 实现文件编辑功能
    this.showNotification('文件编辑功能开发中...', 'info');
  }

  showFileProperties(file) {
    // TODO: 实现文件属性显示
    this.showNotification('文件属性功能开发中...', 'info');
  }

  setupDragAndDrop() {
    const fileList = this.fileList;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      fileList.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      fileList.addEventListener(eventName, () => {
        fileList.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      fileList.addEventListener(eventName, () => {
        fileList.classList.remove('drag-over');
      });
    });

    fileList.addEventListener('drop', async (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await this.handleDroppedFiles(files);
      }
    });
  }

  async handleDroppedFiles(files) {
    if (!this.currentSession) {
      this.showNotification('请先连接SSH服务器', 'error');
      return;
    }

    for (const file of files) {
      try {
        // 对于拖拽的文件，需要通过主进程获取真实路径
        const result = await window.electronAPI.uploadDroppedFile(this.currentSession.id, file, this.currentPath);
        
        if (result.success) {
          this.showNotification(`${file.name} 上传成功`, 'success');
        } else {
          this.showNotification(`${file.name} 上传失败: ${result.error}`, 'error');
        }
      } catch (error) {
        this.showNotification(`${file.name} 上传失败: ${error.message}`, 'error');
      }
    }
    
    await this.refresh();
  }

  startFileWatcher(remotePath, localPath) {
    // 通知主进程开始监听文件变化
    window.electronAPI.startFileWatcher(remotePath, localPath);
    
    // 监听文件变化事件
    window.addEventListener('fileChanged', (e) => {
      if (e.detail.remotePath === remotePath) {
        this.handleFileChanged(remotePath, e.detail.localPath);
      }
    });
  }

  async handleFileChanged(remotePath, localPath) {
    const fileName = window.path.basename(remotePath);
    const shouldUpload = confirm(`检测到文件 ${fileName} 发生变化，是否上传到服务器？`);
    
    if (shouldUpload) {
      try {
        this.showNotification(`正在上传 ${fileName}...`, 'info');
        
        const remoteDir = this.getParentPath(remotePath);
        const result = await window.electronAPI.uploadFile(this.currentSession.id, localPath, remoteDir);
        
        if (result.success) {
          this.showNotification(`✅ ${fileName} 同步成功`, 'success');
        } else {
          this.showNotification(`❌ ${fileName} 同步失败: ${result.error}`, 'error');
        }
      } catch (error) {
        this.showNotification(`❌ ${fileName} 同步失败: ${error.message}`, 'error');
      }
    }
  }

  async completePath() {
    if (!this.currentSession) return;

    const inputPath = this.currentPathElement.value.trim();
    if (!inputPath) return;

    // 获取当前输入的目录路径
    let dirPath = inputPath;
    let prefix = '';

    if (inputPath.endsWith('/')) {
      dirPath = inputPath.slice(0, -1);
    } else {
      const lastSlash = inputPath.lastIndexOf('/');
      if (lastSlash >= 0) {
        dirPath = inputPath.substring(0, lastSlash);
        prefix = inputPath.substring(lastSlash + 1);
      }
    }

    if (dirPath === '') dirPath = '/';

    try {
      const result = await window.electronAPI.getFileList(this.currentSession.id, dirPath);
      
      if (result.success) {
        const directories = result.files
          .filter(file => file.type === 'd' && file.name.startsWith(prefix))
          .map(file => file.name)
          .sort();

        if (directories.length === 1) {
          // 只有一个匹配，自动完成
          const completedPath = dirPath === '/' ? 
            `/${directories[0]}` : 
            `${dirPath}/${directories[0]}`;
          this.currentPathElement.value = completedPath + '/';
        } else if (directories.length > 1) {
          // 多个匹配，显示提示
          this.showNotification(`可能的路径: ${directories.join(', ')}`, 'info');
        }
      }
    } catch (error) {
      // 静默失败，不影响用户体验
    }
  }

  navigateHistory(direction) {
    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.pathHistory.length) {
      this.historyIndex = this.pathHistory.length - 1;
    }

    this.currentPathElement.value = this.pathHistory[this.historyIndex];
  }

  addToHistory(path) {
    // 避免重复添加相同路径
    if (this.pathHistory[this.pathHistory.length - 1] !== path) {
      this.pathHistory.push(path);
      // 限制历史记录数量
      if (this.pathHistory.length > 50) {
        this.pathHistory.shift();
      }
    }
    this.historyIndex = this.pathHistory.length - 1;
  }

  isValidFileName(name) {
    // 检查文件名是否包含非法字符
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return false;
    }
    
    // 检查是否为空或只包含空格
    if (!name.trim()) {
      return false;
    }
    
    // 检查长度限制
    if (name.length > 255) {
      return false;
    }
    
    // 检查是否为保留名称（Windows）
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(name.toUpperCase())) {
      return false;
    }
    
    return true;
  }

  selectFileByName(fileName) {
    const fileItems = this.fileList.querySelectorAll('.file-item');
    for (const item of fileItems) {
      const nameElement = item.querySelector('.file-name');
      if (nameElement && nameElement.textContent === fileName) {
        // 清除其他选中状态
        fileItems.forEach(fi => fi.classList.remove('selected'));
        // 选中当前文件
        item.classList.add('selected');
        // 滚动到视图
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }

  positionMenu(menu, x, y) {
    // 先添加到DOM以获取实际尺寸
    document.body.appendChild(menu);
    
    // 获取菜单的实际尺寸
    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width || 180; // 默认宽度
    const menuHeight = menuRect.height || 200; // 默认高度
    
    // 获取窗口尺寸和滚动位置
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    
    // 计算最佳位置
    let left = x;
    let top = y;
    
    // 检查右边界 - 优先显示在鼠标右侧，空间不足时显示在左侧
    if (left + menuWidth > windowWidth + scrollX) {
      left = windowWidth + scrollX - menuWidth - 10;
      // 如果左侧空间也不足，则贴左边缘
      if (left < scrollX + 10) {
        left = scrollX + 10;
      }
    }
    
    // 检查左边界
    if (left < scrollX + 10) {
      left = scrollX + 10;
    }
    
    // 检查下边界 - 优先显示在鼠标下方，空间不足时显示在上方
    if (top + menuHeight > windowHeight + scrollY) {
      // 尝试显示在鼠标上方
      if (y - menuHeight > scrollY + 10) {
        top = y - menuHeight;
      } else {
        // 上方空间也不足，则贴下边缘
        top = windowHeight + scrollY - menuHeight - 10;
      }
    }
    
    // 检查上边界
    if (top < scrollY + 10) {
      top = scrollY + 10;
    }
    
    // 确保菜单不会超出窗口边界
    left = Math.max(scrollX + 5, Math.min(left, windowWidth + scrollX - menuWidth - 5));
    top = Math.max(scrollY + 5, Math.min(top, windowHeight + scrollY - menuHeight - 5));
    
    // 设置最终位置
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible'; // 显示菜单
    
    // 添加最大高度以防止菜单过长
    const maxHeight = windowHeight - 40;
    if (menuHeight > maxHeight) {
      menu.style.maxHeight = maxHeight + 'px';
      menu.style.overflowY = 'auto';
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

// 创建全局文件浏览器实例
window.fileExplorer = new FileExplorer();