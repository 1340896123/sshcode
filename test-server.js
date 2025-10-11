const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const SESSIONS_FILE = path.join(__dirname, 'data', 'test-sessions.json');

// 中间件
app.use(cors());
app.use(express.json());

// 确保数据目录存在
const dataDir = path.dirname(SESSIONS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 读取会话
function readSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('读取会话失败:', error);
        return [];
    }
}

// 保存会话
function saveSessions(sessions) {
    try {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
        return true;
    } catch (error) {
        console.error('保存会话失败:', error);
        return false;
    }
}

// API路由

// 获取所有会话
app.get('/api/get-sessions', (req, res) => {
    console.log('获取会话列表');
    const sessions = readSessions();
    console.log(`返回 ${sessions.length} 个会话`);
    res.json(sessions);
});

// 保存会话
app.post('/api/save-session', (req, res) => {
    const sessionData = req.body;
    console.log('保存会话:', sessionData);
    
    if (!sessionData.id || !sessionData.name || !sessionData.host) {
        return res.status(400).json({ 
            success: false, 
            error: '缺少必要字段: id, name, host' 
        });
    }

    const sessions = readSessions();
    const existingIndex = sessions.findIndex(s => s.id === sessionData.id);
    
    if (existingIndex >= 0) {
        sessions[existingIndex] = sessionData;
        console.log('更新现有会话:', sessionData.id);
    } else {
        sessions.push(sessionData);
        console.log('添加新会话:', sessionData.id);
    }

    const success = saveSessions(sessions);
    
    if (success) {
        console.log(`保存成功，当前会话数量: ${sessions.length}`);
        res.json({ success: true });
    } else {
        res.status(500).json({ 
            success: false, 
            error: '保存到文件失败' 
        });
    }
});

// 删除会话
app.delete('/api/delete-session/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    console.log('删除会话:', sessionId);
    
    const sessions = readSessions();
    const initialLength = sessions.length;
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    
    if (filteredSessions.length === initialLength) {
        return res.status(404).json({ 
            success: false, 
            error: '会话不存在' 
        });
    }

    const success = saveSessions(filteredSessions);
    
    if (success) {
        console.log(`删除成功，剩余会话数量: ${filteredSessions.length}`);
        res.json({ success: true });
    } else {
        res.status(500).json({ 
            success: false, 
            error: '保存到文件失败' 
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`测试服务器运行在 http://localhost:${PORT}`);
    console.log(`会话文件路径: ${SESSIONS_FILE}`);
    console.log('请打开 test-multi-session.html 进行测试');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭测试服务器...');
    process.exit(0);
});