/**
 * 消息格式化工具
 */
export function useMessageFormatter() {
  // 格式化时间
  const formatTime = timestamp => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化消息内容
  const formatMessage = content => {
    return (
      content
        // 代码块格式化
        .replace(/```([^`]+)```/g, '<pre class="code-block">$1</pre>')
        // 行内代码格式化
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        // 粗体格式化
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // 斜体格式化
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // 换行格式化
        .replace(/\n/g, '<br>')
        // 链接格式化
        .replace(
          /(https?:\/\/[^\s]+)/g,
          '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        // 高亮关键词
        .replace(/\b(error|warning|success|info)\b/gi, '<span class="highlight-$1">$1</span>')
    );
  };

  // 验证消息内容
  const validateMessage = content => {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // 检查内容长度
    if (content.length > 10000) {
      return false;
    }

    // 检查是否包含恶意内容
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    return !maliciousPatterns.some(pattern => pattern.test(content));
  };

  // 截断长消息
  const truncateMessage = (content, maxLength = 500) => {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  };

  // 提取消息中的命令
  const extractCommands = content => {
    const commands = [];

    // 提取代码块中的命令
    const codeBlockRegex = /```(?:bash|shell)?\s*([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const command = match[1].trim();
      if (command && !commands.includes(command)) {
        commands.push(command);
      }
    }

    // 提取行内代码中的命令
    const inlineCodeRegex = /`([^`]+)`/g;
    while ((match = inlineCodeRegex.exec(content)) !== null) {
      const code = match[1].trim();
      // 只包含简单的命令，排除说明文字
      if (
        code.includes(' ') &&
        !code.includes('示例') &&
        !code.includes('说明') &&
        !code.includes('例如') &&
        !commands.includes(code)
      ) {
        commands.push(code);
      }
    }

    return commands;
  };

  return {
    formatTime,
    formatMessage,
    validateMessage,
    truncateMessage,
    extractCommands
  };
}
