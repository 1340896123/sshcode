// 主渲染进程脚本
document.addEventListener('DOMContentLoaded', () => {
    // 初始化Electron API
    const { ipcRenderer } = require('electron');
    window.ipcRenderer = ipcRenderer;

    // 会话管理相关
    const sessionModal = document.getElementById('session-modal');
    const sessionFormModal = document.getElementById('session-form-modal');
    const sessionForm = document.getElementById('session-form');

    // 打开会话管理
    document.getElementById('btn-sessions').addEventListener('click', () => {
        sessionModal.style.display = 'block';
    });

    // 新建会话
    document.getElementById('btn-add-session').addEventListener('click', () => {
        sessionModal.style.display = 'none';
        window.sessionManager.showSessionForm();
    });

    // 关闭模态框
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // 会话表单提交
    sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            id: document.getElementById('session-id').value,
            name: document.getElementById('session-name').value,
            host: document.getElementById('session-host').value,
            port: document.getElementById('session-port').value,
            username: document.getElementById('session-username').value,
            password: document.getElementById('session-password').value,
            authType: document.getElementById('session-auth-type').value,
            keyPath: document.getElementById('session-key-path').value,
            group: document.getElementById('session-group').value,
            description: document.getElementById('session-description').value
        };
        window.sessionManager.saveSession(formData);
    });

    // 取消会话编辑
    document.getElementById('btn-cancel-session').addEventListener('click', () => {
        window.sessionManager.hideSessionForm();
    });

    // 设置按钮由settings.js处理

    // 通知函数
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K 打开会话管理
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            sessionModal.style.display = 'block';
        }
        
        // Ctrl/Cmd + ` 聚焦终端
        if ((e.ctrlKey || e.metaKey) && e.key === '`') {
            e.preventDefault();
            const activeTabId = window.tabManager.getActiveTabId();
            const terminalInput = document.querySelector(`.terminal-input[data-tab-id="${activeTabId}"]`);
            if (terminalInput) terminalInput.focus();
        }
        
        // Ctrl/Cmd + / 聚焦AI聊天
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            const activeTabId = window.tabManager.getActiveTabId();
            const chatInput = document.querySelector(`.chat-input[data-tab-id="${activeTabId}"]`);
            if (chatInput) chatInput.focus();
        }
        
        // Ctrl/Cmd + T 新建标签页
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            window.tabManager.createNewTab();
        }
        
        // Ctrl/Cmd + W 关闭当前标签页
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            const activeTabId = window.tabManager.getActiveTabId();
            window.tabManager.closeTab(activeTabId);
        }
        
        // Ctrl/Cmd + Tab 切换到下一个标签页
        if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            const tabs = Array.from(window.tabManager.tabs.keys());
            const currentIndex = tabs.indexOf(window.tabManager.getActiveTabId());
            const nextIndex = (currentIndex + 1) % tabs.length;
            window.tabManager.switchToTab(tabs[nextIndex]);
        }
        
        // Ctrl/Cmd + Shift + Tab 切换到上一个标签页
        if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            const tabs = Array.from(window.tabManager.tabs.keys());
            const currentIndex = tabs.indexOf(window.tabManager.getActiveTabId());
            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            window.tabManager.switchToTab(tabs[prevIndex]);
        }
        
        // Escape 关闭所有模态框
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
        
        // Ctrl/Cmd + R 重置布局
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.shiftKey) {
            e.preventDefault();
            if (window.responsiveLayoutManager) {
                window.responsiveLayoutManager.resetToDefault();
                showNotification('布局已重置为默认值', 'success');
            }
        }
    });

    // 监听标签页切换事件
    window.addEventListener('tabSwitch', (e) => {
        const { tabId, tab } = e.detail;
        console.log(`切换到标签页: ${tabId}, 会话: ${tab.sessionName}`);
        
        // 更新连接状态显示
        const statusIndicator = document.getElementById('connection-status');
        if (tab.isConnected) {
            statusIndicator.textContent = `已连接 - ${tab.sessionName}`;
            statusIndicator.className = 'status-indicator connected';
        } else {
            statusIndicator.textContent = '未连接';
            statusIndicator.className = 'status-indicator';
        }
    });

    // 窗口大小调整处理
    window.addEventListener('resize', () => {
        // 响应式布局调整逻辑已移至 responsive-layout.js
    });

    // 应用启动完成
    console.log('SSH Remote App 已启动');
});