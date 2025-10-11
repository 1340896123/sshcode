class FileExplorer {
  constructor() {
    this.fileList = document.getElementById('file-list');
    this.currentPathElement = document.getElementById('current-path');
    this.currentPath = '/';
    this.currentSession = null;
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

    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
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
      // 下载文件
      this.downloadFile(file);
    }
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
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    menu.style.backgroundColor = '#2d2d30';
    menu.style.border = '1px solid #3e3e42';
    menu.style.borderRadius = '4px';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '150px';

    const menuItems = [];

    if (file.type === 'd') {
      menuItems.push(
        { text: '打开', action: () => this.handleFileDoubleClick(file) },
        { text: '新建文件', action: () => this.createFile(file) },
        { text: '新建目录', action: () => this.createDirectory(file) }
      );
    } else {
      menuItems.push(
        { text: '下载', action: () => this.downloadFile(file) },
        { text: '编辑', action: () => this.editFile(file) },
        { text: '删除', action: () => this.deleteFile(file) }
      );
    }

    menuItems.push(
      { text: '重命名', action: () => this.renameFile(file) },
      { text: '属性', action: () => this.showFileProperties(file) }
    );

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.textContent = item.text;
      menuItem.style.padding = '8px 15px';
      menuItem.style.cursor = 'pointer';
      menuItem.style.fontSize = '13px';
      menuItem.style.color = '#d4d4d4';
      
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
    });

    document.body.appendChild(menu);

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
    this.currentPathElement.textContent = path;
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
    // TODO: 实现文件下载功能
    this.showNotification('文件下载功能开发中...', 'info');
  }

  async uploadFile() {
    // TODO: 实现文件上传功能
    this.showNotification('文件上传功能开发中...', 'info');
  }

  async createFile(parentDir) {
    const fileName = prompt('请输入文件名:');
    if (!fileName) return;

    try {
      const command = `touch "${this.currentPath === '/' ? '' : this.currentPath}/${fileName}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification('文件创建成功', 'success');
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

    try {
      const command = `mkdir "${this.currentPath === '/' ? '' : this.currentPath}/${dirName}"`;
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        await this.refresh();
        this.showNotification('目录创建成功', 'success');
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