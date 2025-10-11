const fs = require('fs');
const path = require('path');

// 模拟会话数据
const testSessions = [
    {
        id: 'session-1-' + Date.now(),
        name: '生产服务器',
        host: '192.168.1.100',
        port: 22,
        username: 'root',
        authType: 'password',
        group: 'production',
        description: '主要生产环境服务器',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'session-2-' + Date.now(),
        name: '开发服务器',
        host: '192.168.1.200',
        port: 22,
        username: 'developer',
        authType: 'key',
        keyPath: '~/.ssh/id_rsa',
        group: 'development',
        description: '开发测试环境',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'session-3-' + Date.now(),
        name: '测试服务器',
        host: '192.168.1.300',
        port: 2222,
        username: 'test',
        authType: 'password',
        group: 'testing',
        description: '自动化测试环境',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

// 会话文件路径
const sessionsPath = path.join(__dirname, 'data', 'sessions.json');

// 确保目录存在
const dataDir = path.dirname(sessionsPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log('测试多会话保存功能...');
console.log('会话文件路径:', sessionsPath);

// 读取现有会话
let existingSessions = [];
if (fs.existsSync(sessionsPath)) {
    try {
        const data = fs.readFileSync(sessionsPath, 'utf8');
        existingSessions = JSON.parse(data);
        console.log(`现有会话数量: ${existingSessions.length}`);
    } catch (error) {
        console.error('读取现有会话失败:', error);
    }
} else {
    console.log('会话文件不存在，将创建新文件');
}

// 合并会话
const allSessions = [...existingSessions, ...testSessions];

// 保存会话
try {
    fs.writeFileSync(sessionsPath, JSON.stringify(allSessions, null, 2));
    console.log(`✅ 成功保存 ${allSessions.length} 个会话到文件`);
    
    // 验证保存结果
    const verifyData = fs.readFileSync(sessionsPath, 'utf8');
    const verifySessions = JSON.parse(verifyData);
    console.log(`✅ 验证成功，文件中包含 ${verifySessions.length} 个会话`);
    
    // 显示所有会话
    console.log('\n📋 所有会话列表:');
    verifySessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.name} (${session.username}@${session.host}:${session.port})`);
        console.log(`   ID: ${session.id}`);
        console.log(`   分组: ${session.group || '默认'}`);
        console.log(`   描述: ${session.description || '无'}`);
        console.log('');
    });
    
} catch (error) {
    console.error('❌ 保存会话失败:', error);
}

console.log('\n🎯 测试完成！');
console.log('现在可以启动Electron应用 (npm start) 来查看多会话功能');