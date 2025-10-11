// 标签页管理器
class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.tabsList = document.getElementById('tabs-list');
        this.tabsContent = document.getElementById('tabs-content');
        
        this.init();
    }

    init() {
        // 绑定新建标签页按钮
        document.getElementById('btn-new-tab').addEventListener('click', () => {
            this.createNewTab();
        });

        // 创建第一个默认标签页
        this.createNewTab();
    }

    createNewTab(sessionData = null) {
        const tabId = `tab-${++this.tabCounter}`;
        const tab = {
            id: tabId,
            sessionId: sessionData?.id || null,
            sessionName: sessionData?.name || '未连接',
            isConnected: false,
            connectionConfig: sessionData || null
        };

        this.tabs.set(tabId, tab);
        this.createTabElement(tab);
        this.createTabContent(tab);
        this.switchToTab(tabId);

        return tabId;
    }

    createTabElement(tab) {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab-item';
        tabElement.dataset.tabId = tab.id;
        tabElement.innerHTML = `
            <div class="tab-content">
                <span class="tab-title">${tab.sessionName}</span>
                <span class="tab-status ${tab.isConnected ? 'connected' : 'disconnected'}"></span>
            </div>
            <button class="tab-close" title="关闭标签页">×</button>
        `;

        // 绑定点击事件
        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchToTab(tab.id);
            }
        });

        // 绑定关闭事件
        tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });

        this.tabsList.appendChild(tabElement);
    }

    createTabContent(tab) {
        const contentElement = document.createElement('div');
        contentElement.className = 'tab-content-panel';
        contentElement.dataset.tabId = tab.id;
        contentElement.style.display = 'none';
        
        contentElement.innerHTML = `
            <!-- 左侧文件目录 -->
            <section class="file-explorer" data-tab-id="${tab.id}">
                <div class="explorer-header">
                    <h3>文件目录</h3>
                    <div class="explorer-controls">
                        <button class="btn btn-small btn-new-file" data-tab-id="${tab.id}" title="新建文件 (Ctrl+Shift+N)">📄 新建</button>
                        <button class="btn btn-small btn-new-dir" data-tab-id="${tab.id}" title="新建目录 (Ctrl+Shift+D)">📁 新建</button>
                        <button class="btn btn-small btn-refresh-files" data-tab-id="${tab.id}">刷新</button>
                        <button class="btn btn-small btn-upload" data-tab-id="${tab.id}">上传</button>
                    </div>
                </div>
                <div class="breadcrumb">
                    <input type="text" class="path-input current-path" data-tab-id="${tab.id}" value="/" placeholder="输入路径..." title="支持Tab自动完成，Ctrl+↑/↓浏览历史" />
                    <button class="btn btn-small btn-navigate" data-tab-id="${tab.id}" title="前往指定路径 (Enter)">前往</button>
                </div>
                <div class="file-list" data-tab-id="${tab.id}">
                    <div class="empty-state">请先连接SSH服务器</div>
                </div>
            </section>

            <!-- 中间终端区域 -->
            <section class="terminal-section" data-tab-id="${tab.id}">
                <div class="terminal-header">
                    <h3>终端</h3>
                    <div class="terminal-controls">
                        <button class="btn btn-small btn-clear-terminal" data-tab-id="${tab.id}">清空</button>
                        <button class="btn btn-small btn-copy-output" data-tab-id="${tab.id}">复制</button>
                    </div>
                </div>
                <div class="terminal" data-tab-id="${tab.id}">
                    <div class="terminal-output" data-tab-id="${tab.id}"></div>
                    <div class="terminal-input-line">
                        <span class="terminal-prompt" data-tab-id="${tab.id}">$ </span>
                        <input type="text" class="terminal-input" data-tab-id="${tab.id}" placeholder="输入命令..." disabled>
                    </div>
                </div>
            </section>

            <!-- 右侧AI聊天区域 -->
            <section class="ai-chat" data-tab-id="${tab.id}">
                <div class="chat-header">
                    <h3>AI助手</h3>
                    <div class="chat-controls">
                        <button class="btn btn-small btn-clear-chat" data-tab-id="${tab.id}">清空</button>
                        <button class="btn btn-small btn-ai-settings" data-tab-id="${tab.id}">设置</button>
                    </div>
                </div>
                <div class="chat-messages" data-tab-id="${tab.id}">
                    <div class="chat-message ai-message">
                        <div class="message-content">
                            您好！我是AI助手，可以帮助您执行命令和管理文件。请告诉我您需要什么帮助？
                        </div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <textarea class="chat-input" data-tab-id="${tab.id}" placeholder="输入消息..." rows="3"></textarea>
                    <button class="btn btn-primary btn-send-message" data-tab-id="${tab.id}">发送</button>
                </div>
            </section>
        `;

        this.tabsContent.appendChild(contentElement);
    }

    switchToTab(tabId) {
        if (!this.tabs.has(tabId)) return;

        // 更新标签页状态
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab-id="${tabId}"]`).classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        document.querySelector(`.tab-content-panel[data-tab-id="${tabId}"]`).style.display = 'flex';

        this.activeTabId = tabId;

        // 触发标签页切换事件
        this.onTabSwitch(tabId);
    }

    closeTab(tabId) {
        if (!this.tabs.has(tabId)) return;

        // 如果只有一个标签页，不允许关闭
        if (this.tabs.size === 1) {
            this.showNotification('至少需要保留一个标签页', 'warning');
            return;
        }

        const tab = this.tabs.get(tabId);
        
        // 如果有连接，断开它
        if (tab.isConnected && tab.sessionId) {
            window.electronAPI.sshDisconnect(tab.sessionId);
        }

        // 移除DOM元素
        const tabElement = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
        const contentElement = document.querySelector(`.tab-content-panel[data-tab-id="${tabId}"]`);
        
        if (tabElement) tabElement.remove();
        if (contentElement) contentElement.remove();

        // 从Map中移除
        this.tabs.delete(tabId);

        // 如果关闭的是当前活动标签页，切换到其他标签页
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchToTab(remainingTabs[0]);
            }
        }
    }

    updateTabConnection(tabId, isConnected, sessionData = null) {
        if (!this.tabs.has(tabId)) return;

        const tab = this.tabs.get(tabId);
        tab.isConnected = isConnected;
        
        if (sessionData) {
            tab.sessionId = sessionData.id;
            tab.sessionName = sessionData.name;
            tab.connectionConfig = sessionData;
        }

        // 更新标签页UI
        const tabElement = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
        if (tabElement) {
            const titleElement = tabElement.querySelector('.tab-title');
            const statusElement = tabElement.querySelector('.tab-status');
            
            titleElement.textContent = tab.sessionName;
            statusElement.className = `tab-status ${isConnected ? 'connected' : 'disconnected'}`;
        }

        // 更新终端输入状态
        const terminalInput = document.querySelector(`.terminal-input[data-tab-id="${tabId}"]`);
        if (terminalInput) {
            terminalInput.disabled = !isConnected;
        }

        // 更新文件列表状态
        const fileList = document.querySelector(`.file-list[data-tab-id="${tabId}"]`);
        if (fileList && !isConnected) {
            fileList.innerHTML = '<div class="empty-state">请先连接SSH服务器</div>';
        }
    }

    getActiveTab() {
        return this.tabs.get(this.activeTabId);
    }

    getActiveTabId() {
        return this.activeTabId;
    }

    onTabSwitch(tabId) {
        // 通知其他模块标签页已切换
        window.dispatchEvent(new CustomEvent('tabSwitch', { 
            detail: { tabId, tab: this.tabs.get(tabId) } 
        }));
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

    // 为会话连接创建或切换到标签页
    createOrSwitchToSessionTab(sessionData) {
        // 查找是否已有该会话的标签页
        let targetTabId = null;
        for (const [tabId, tab] of this.tabs) {
            if (tab.sessionId === sessionData.id) {
                targetTabId = tabId;
                break;
            }
        }

        if (targetTabId) {
            // 切换到已存在的标签页
            this.switchToTab(targetTabId);
        } else {
            // 创建新标签页
            targetTabId = this.createNewTab(sessionData);
        }

        return targetTabId;
    }
}

// 导出标签页管理器
window.tabManager = new TabManager();