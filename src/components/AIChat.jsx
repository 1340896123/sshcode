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
    <section className="w-[var(--ai-chat-width)] min-w-[var(--min-ai-chat-width)] max-w-[var(--max-ai-chat-width)] bg-[#252526] border-l border-[#3e3e42] flex flex-col relative resize-x overflow-auto flex-shrink-0" data-tab-id={tabId}>
      <div className="flex justify-between items-center px-4 py-2.5 bg-[#2d2d30] border-b border-[#3e3e42]">
        <h3 className="text-sm text-[#cccccc]">AI助手</h3>
        <div className="flex gap-1.5">
          <button 
            className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px" 
            onClick={clearChat}
          >
            清空
          </button>
          <button 
            className="px-2 py-1 border-none rounded cursor-pointer text-[11px] font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px"
          >
            设置
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-4 flex flex-col ${
              message.type === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div 
              className={`max-w-[80%] p-3.75 rounded-xl text-sm leading-7 break-words ${
                message.type === 'user' 
                  ? 'bg-[#007acc] text-white rounded-br-md' 
                  : 'bg-[#3e3e42] text-[#d4d4d4] rounded-bl-md'
              }`}
            >
              {message.content.split('\n').map((line, index) => (
                <div key={index}>
                  {line}
                  {index < message.content.split('\n').length - 1 && <br />}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1">
              <button 
                className="px-2 py-1 border-none rounded cursor-pointer text-[10px] font-inherit transition-all duration-200 outline-none bg-[#3e3e42] text-[#d4d4d4] hover:bg-[#5a5a5a] hover:opacity-80 active:translate-y-px min-w-5" 
                onClick={() => copyMessage(message.content)}
                title="复制消息"
              >
                📋
              </button>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="mb-4 flex flex-col items-start">
            <div className="bg-[#3e3e42] text-[#d4d4d4] rounded-xl rounded-bl-md p-3.75 text-sm leading-7">
              <span>正在思考</span>
              <span className="inline-block w-1 h-1 bg-[#d4d4d4] rounded-full animate-pulse ml-1"></span>
              <span className="inline-block w-1 h-1 bg-[#d4d4d4] rounded-full animate-pulse ml-1" style={{animationDelay: '0.2s'}}></span>
              <span className="inline-block w-1 h-1 bg-[#d4d4d4] rounded-full animate-pulse ml-1" style={{animationDelay: '0.4s'}}></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-[#3e3e42] flex gap-2.5 items-end">
        <textarea
          className="flex-1 bg-[#3e3e42] border border-[#5a5a5a] text-[#d4d4d4] rounded px-3 py-2 font-inherit text-sm resize-none outline-none transition-colors duration-200 focus:border-[#007acc]"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? "输入消息..." : "请先连接SSH服务器"}
          rows={3}
          disabled={!isConnected || isLoading}
        />
        <button 
          className="px-3 py-1.5 border-none rounded cursor-pointer text-xs font-inherit transition-all duration-200 outline-none bg-[#007acc] text-white hover:bg-[#005a9e] hover:opacity-80 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed" 
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
