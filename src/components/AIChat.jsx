import React, { useState, useEffect, useRef } from 'react';

function AIChat({ tabId, isConnected, onShowNotification }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '您好！我是AI助手，可以帮助您执行命令和管理文件。请告诉我您需要什么帮助？'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || !isConnected) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 模拟AI响应
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let aiResponse = '';
      if (message.toLowerCase().includes('文件') || message.toLowerCase().includes('file')) {
        aiResponse = '我可以帮您管理文件。您可以：\n• 查看文件列表\n• 创建新文件或目录\n• 上传或下载文件\n• 修改文件权限\n\n请告诉我您想要执行什么操作？';
      } else if (message.toLowerCase().includes('命令') || message.toLowerCase().includes('command')) {
        aiResponse = '我可以帮您执行各种命令。常用的命令包括：\n• ls - 查看目录内容\n• cd - 切换目录\n• pwd - 显示当前路径\n• mkdir - 创建目录\n• rm - 删除文件或目录\n• cp - 复制文件\n• mv - 移动或重命名文件\n\n您想要执行什么命令？';
      } else if (message.toLowerCase().includes('帮助') || message.toLowerCase().includes('help')) {
        aiResponse = '我可以帮助您：\n\n📁 **文件管理**\n- 浏览、创建、删除文件和目录\n- 上传下载文件\n- 修改文件权限\n\n💻 **命令执行**\n- 执行各种Linux命令\n- 命令历史记录\n- 自动补全功能\n\n🔍 **系统信息**\n- 查看系统状态\n- 监控资源使用\n- 网络连接状态\n\n请告诉我您需要什么帮助！';
      } else {
        aiResponse = `我收到了您的消息："${message}"。\n\n这是一个模拟的AI响应。在实际应用中，这里会连接到真正的AI服务来为您提供帮助。\n\n您可以尝试询问关于文件管理、命令执行或系统操作的问题。`;
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      onShowNotification('发送消息失败', 'error');
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: '抱歉，发送消息时出现错误。请稍后重试。'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        type: 'ai',
        content: '聊天记录已清空。有什么可以帮助您的吗？'
      }
    ]);
    onShowNotification('聊天记录已清空', 'info');
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      onShowNotification('消息已复制到剪贴板', 'success');
    }).catch(() => {
      onShowNotification('复制失败', 'error');
    });
  };

  return (
    <section className="ai-chat" data-tab-id={tabId}>
      <div className="chat-header">
        <h3>AI助手</h3>
        <div className="chat-controls">
          <button className="btn btn-small btn-clear-chat" onClick={clearChat}>
            清空
          </button>
          <button className="btn btn-small btn-ai-settings">
            设置
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.type}-message`}>
            <div className="message-content">
              {message.content.split('\n').map((line, index) => (
                <div key={index}>
                  {line}
                  {index < message.content.split('\n').length - 1 && <br />}
                </div>
              ))}
            </div>
            <div className="message-actions">
              <button 
                className="btn btn-small btn-copy-message" 
                onClick={() => copyMessage(message.content)}
                title="复制消息"
              >
                📋
              </button>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message ai-message">
            <div className="message-content typing-indicator">
              <span>正在思考</span>
              <span className="dots">...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? "输入消息..." : "请先连接SSH服务器"}
          rows={3}
          disabled={!isConnected || isLoading}
        />
        <button 
          className="btn btn-primary btn-send-message" 
          onClick={sendMessage}
          disabled={!isConnected || isLoading || !input.trim()}
        >
          发送
        </button>
      </div>
    </section>
  );
}

export default AIChat;
