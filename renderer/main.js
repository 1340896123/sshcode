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
            password: document.getElementById('session-password').value
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
            document.getElementById('terminal-input').focus();
        }
        
        // Ctrl/Cmd + / 聚焦AI聊天
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            document.getElementById('chat-input').focus();
        }
        
        // Escape 关闭所有模态框
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });

    // 窗口大小调整处理
    window.addEventListener('resize', () => {
        // 可以在这里添加响应式布局调整逻辑
    });

    // 应用启动完成
    console.log('SSH Remote App 已启动');
});