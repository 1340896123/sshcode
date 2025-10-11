// 响应式布局管理器
class ResponsiveLayoutManager {
    constructor() {
        this.isResizing = false;
        this.currentResizeElement = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.activeTabId = null;
        
        this.init();
    }

    init() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // 监听标签页切换事件
        window.addEventListener('tabSwitch', (e) => {
            this.activeTabId = e.detail.tabId;
            this.addResizeHandlesToTab(e.detail.tabId);
        });

        // 初始化当前标签页
        this.activeTabId = window.tabManager?.getActiveTabId();
        if (this.activeTabId) {
            this.addResizeHandlesToTab(this.activeTabId);
        }

        // 加载保存的布局设置
        this.loadLayoutSettings();
    }

    // 为指定标签页添加调整手柄
    addResizeHandlesToTab(tabId) {
        const fileExplorer = document.querySelector(`.file-explorer[data-tab-id="${tabId}"]`);
        const aiChat = document.querySelector(`.ai-chat[data-tab-id="${tabId}"]`);

        if (fileExplorer && !fileExplorer.querySelector('.resize-handle-right')) {
            this.addFileExplorerResizeHandle(fileExplorer, tabId);
        }

        if (aiChat && !aiChat.querySelector('.resize-handle-left')) {
            this.addAiChatResizeHandle(aiChat, tabId);
        }
    }

    // 为文件浏览器添加调整手柄
    addFileExplorerResizeHandle(fileExplorer, tabId) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle resize-handle-right';
        resizeHandle.dataset.tabId = tabId;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            this.startResize(e, 'file-explorer', fileExplorer, resizeHandle);
        });

        // 触摸事件支持
        resizeHandle.addEventListener('touchstart', (e) => {
            this.startResize(e, 'file-explorer', fileExplorer, resizeHandle);
        }, { passive: false });

        fileExplorer.appendChild(resizeHandle);
    }

    // 为AI聊天添加调整手柄
    addAiChatResizeHandle(aiChat, tabId) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle resize-handle-left';
        resizeHandle.dataset.tabId = tabId;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            this.startResize(e, 'ai-chat', aiChat, resizeHandle);
        });

        // 触摸事件支持
        resizeHandle.addEventListener('touchstart', (e) => {
            this.startResize(e, 'ai-chat', aiChat, resizeHandle);
        }, { passive: false });

        aiChat.appendChild(resizeHandle);
    }

    // 开始调整大小
    startResize(e, type, element, handle) {
        e.preventDefault();
        e.stopPropagation();

        this.isResizing = true;
        this.currentResizeElement = element;
        this.currentResizeType = type;
        
        const touch = e.touches ? e.touches[0] : e;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        
        const rect = element.getBoundingClientRect();
        this.startWidth = rect.width;
        this.startHeight = rect.height;

        // 添加调整状态样式
        document.body.classList.add('resizing');
        handle.classList.add('active');

        // 绑定移动和结束事件
        const moveHandler = (e) => this.handleResize(e);
        const endHandler = (e) => this.endResize(e, moveHandler, endHandler);

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', endHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('touchend', endHandler);
    }

    // 处理调整大小
    handleResize(e) {
        if (!this.isResizing) return;

        e.preventDefault();
        
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;

        const isMobile = window.innerWidth <= 800;
        
        if (isMobile) {
            // 移动端垂直调整
            const newHeight = Math.max(150, this.startHeight + deltaY);
            this.currentResizeElement.style.height = newHeight + 'px';
        } else {
            // 桌面端水平调整
            let newWidth;
            
            if (this.currentResizeType === 'file-explorer') {
                newWidth = Math.max(
                    parseInt(getComputedStyle(document.documentElement).getPropertyValue('--min-file-explorer-width')),
                    Math.min(
                        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-file-explorer-width')),
                        this.startWidth + deltaX
                    )
                );
            } else {
                newWidth = Math.max(
                    parseInt(getComputedStyle(document.documentElement).getPropertyValue('--min-ai-chat-width')),
                    Math.min(
                        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-ai-chat-width')),
                        this.startWidth - deltaX
                    )
                );
            }
            
            this.currentResizeElement.style.width = newWidth + 'px';
        }
    }

    // 结束调整大小
    endResize(e, moveHandler, endHandler) {
        if (!this.isResizing) return;

        this.isResizing = false;
        
        // 移除事件监听器
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);

        // 移除调整状态样式
        document.body.classList.remove('resizing');
        
        const handle = this.currentResizeElement.querySelector('.resize-handle');
        if (handle) {
            handle.classList.remove('active');
        }

        // 保存布局设置
        this.saveLayoutSettings();

        // 触发布局调整事件
        window.dispatchEvent(new CustomEvent('layoutResize', {
            detail: {
                type: this.currentResizeType,
                element: this.currentResizeElement,
                width: this.currentResizeElement.offsetWidth,
                height: this.currentResizeElement.offsetHeight
            }
        }));

        this.currentResizeElement = null;
        this.currentResizeType = null;
    }

    // 处理窗口大小变化
    handleWindowResize() {
        // 根据窗口大小自动调整布局
        const windowWidth = window.innerWidth;
        const root = document.documentElement;

        // 重置为默认响应式值
        if (windowWidth > 1600) {
            root.style.setProperty('--file-explorer-width', '250px');
            root.style.setProperty('--ai-chat-width', '350px');
            root.style.setProperty('--min-file-explorer-width', '180px');
            root.style.setProperty('--min-ai-chat-width', '280px');
        } else if (windowWidth > 1400) {
            root.style.setProperty('--file-explorer-width', '240px');
            root.style.setProperty('--ai-chat-width', '340px');
            root.style.setProperty('--min-file-explorer-width', '160px');
            root.style.setProperty('--min-ai-chat-width', '260px');
        } else if (windowWidth > 1200) {
            root.style.setProperty('--file-explorer-width', '220px');
            root.style.setProperty('--ai-chat-width', '320px');
            root.style.setProperty('--min-file-explorer-width', '150px');
            root.style.setProperty('--min-ai-chat-width', '250px');
        } else if (windowWidth > 1000) {
            root.style.setProperty('--file-explorer-width', '200px');
            root.style.setProperty('--ai-chat-width', '300px');
            root.style.setProperty('--min-file-explorer-width', '140px');
            root.style.setProperty('--min-ai-chat-width', '240px');
        } else if (windowWidth > 900) {
            root.style.setProperty('--file-explorer-width', '180px');
            root.style.setProperty('--ai-chat-width', '280px');
            root.style.setProperty('--min-file-explorer-width', '130px');
            root.style.setProperty('--min-ai-chat-width', '230px');
        } else if (windowWidth > 800) {
            root.style.setProperty('--file-explorer-width', '160px');
            root.style.setProperty('--ai-chat-width', '260px');
            root.style.setProperty('--min-file-explorer-width', '120px');
            root.style.setProperty('--min-ai-chat-width', '220px');
        }

        // 应用保存的自定义设置（如果存在）
        this.applySavedLayoutSettings();

        // 确保容器宽度正确
        this.ensureContainerWidth();
    }

    // 确保容器宽度正确
    ensureContainerWidth() {
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.style.width = '100%';
        }

        // 确保标签页内容面板宽度正确
        const activeTabPanel = document.querySelector('.tab-content-panel[data-tab-id]:not([style*="display: none"])');
        if (activeTabPanel) {
            activeTabPanel.style.width = '100%';
        }
    }

    // 保存布局设置
    saveLayoutSettings() {
        const settings = {
            fileExplorerWidth: this.getElementWidth('.file-explorer'),
            aiChatWidth: this.getElementWidth('.ai-chat'),
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('sshcode-layout-settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('无法保存布局设置:', error);
        }
    }

    // 加载布局设置
    loadLayoutSettings() {
        try {
            const saved = localStorage.getItem('sshcode-layout-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                // 检查设置是否过期（7天）
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                if (settings.timestamp > weekAgo) {
                    this.savedSettings = settings;
                    this.applySavedLayoutSettings();
                }
            }
        } catch (error) {
            console.warn('无法加载布局设置:', error);
        }
    }

    // 应用保存的布局设置
    applySavedLayoutSettings() {
        if (!this.savedSettings) return;

        const windowWidth = window.innerWidth;
        
        // 只在合适的窗口尺寸下应用保存的设置
        if (windowWidth > 800) {
            if (this.savedSettings.fileExplorerWidth) {
                const minWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--min-file-explorer-width'));
                const maxWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-file-explorer-width'));
                const validWidth = Math.max(minWidth, Math.min(maxWidth, this.savedSettings.fileExplorerWidth));
                
                document.documentElement.style.setProperty('--file-explorer-width', validWidth + 'px');
                
                // 同时应用到所有文件浏览器元素
                document.querySelectorAll('.file-explorer').forEach(element => {
                    element.style.width = validWidth + 'px';
                });
            }

            if (this.savedSettings.aiChatWidth) {
                const minWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--min-ai-chat-width'));
                const maxWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-ai-chat-width'));
                const validWidth = Math.max(minWidth, Math.min(maxWidth, this.savedSettings.aiChatWidth));
                
                document.documentElement.style.setProperty('--ai-chat-width', validWidth + 'px');
                
                // 同时应用到所有AI聊天元素
                document.querySelectorAll('.ai-chat').forEach(element => {
                    element.style.width = validWidth + 'px';
                });
            }
        }
    }

    // 获取元素宽度
    getElementWidth(selector) {
        const element = document.querySelector(selector);
        return element ? element.offsetWidth : null;
    }

    // 重置布局为默认值
    resetToDefault() {
        localStorage.removeItem('sshcode-layout-settings');
        this.savedSettings = null;
        this.handleWindowResize();
        
        // 重置所有标签页的元素大小
        document.querySelectorAll('.file-explorer, .ai-chat').forEach(element => {
            element.style.width = '';
            element.style.height = '';
        });
    }

    // 获取当前布局信息
    getLayoutInfo() {
        return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            fileExplorerWidth: this.getElementWidth('.file-explorer'),
            aiChatWidth: this.getElementWidth('.ai-chat'),
            isMobile: window.innerWidth <= 800
        };
    }
}

// 创建响应式布局管理器实例
window.responsiveLayoutManager = new ResponsiveLayoutManager();
