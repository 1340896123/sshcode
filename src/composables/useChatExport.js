/**
 * 聊天导出工具
 */
export function useChatExport(messages, emit) {
  // 导出为文本文件
  const exportAsText = () => {
    if (!messages.value || messages.value.length === 0) {
      emit('show-notification', '没有可导出的对话内容', 'warning')
      return
    }

    const chatContent = messages.value.map(msg => {
      const time = new Date(msg.timestamp).toLocaleString('zh-CN')
      const role = msg.role === 'user' ? '用户' : 'AI助手'
      const content = msg.content.replace(/<[^>]*>/g, '') // 移除HTML标签
      
      return `[${time}] ${role}: ${content}`
    }).join('\n\n')

    downloadFile(chatContent, 'text/plain', `ai-chat-${getDateString()}.txt`)
    emit('show-notification', '对话已导出为文本文件', 'success')
  }

  // 导出为JSON文件
  const exportAsJSON = () => {
    if (!messages.value || messages.value.length === 0) {
      emit('show-notification', '没有可导出的对话内容', 'warning')
      return
    }

    const chatData = {
      exportTime: new Date().toISOString(),
      messageCount: messages.value.length,
      messages: messages.value.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content.replace(/<[^>]*>/g, ''),
        timestamp: msg.timestamp,
        actions: msg.actions
      }))
    }

    const jsonContent = JSON.stringify(chatData, null, 2)
    downloadFile(jsonContent, 'application/json', `ai-chat-${getDateString()}.json`)
    emit('show-notification', '对话已导出为JSON文件', 'success')
  }

  // 导出为Markdown文件
  const exportAsMarkdown = () => {
    if (!messages.value || messages.value.length === 0) {
      emit('show-notification', '没有可导出的对话内容', 'warning')
      return
    }

    let markdownContent = `# AI助手对话记录\n\n`
    markdownContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`
    markdownContent += `消息数量: ${messages.value.length}\n\n`
    markdownContent += `---\n\n`

    messages.value.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleString('zh-CN')
      const role = msg.role === 'user' ? '👤 用户' : '🤖 AI助手'
      
      markdownContent += `## ${role}\n\n`
      markdownContent += `**时间:** ${time}\n\n`
      markdownContent += `${msg.content}\n\n`
      
      if (msg.actions && msg.actions.length > 0) {
        markdownContent += `**可用操作:**\n`
        msg.actions.forEach(action => {
          markdownContent += `- ${action.label}\n`
        })
        markdownContent += '\n'
      }
      
      markdownContent += `---\n\n`
    })

    downloadFile(markdownContent, 'text/markdown', `ai-chat-${getDateString()}.md`)
    emit('show-notification', '对话已导出为Markdown文件', 'success')
  }

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!messages.value || messages.value.length === 0) {
      emit('show-notification', '没有可复制的内容', 'warning')
      return
    }

    try {
      const chatContent = messages.value.map(msg => {
        const time = new Date(msg.timestamp).toLocaleString('zh-CN')
        const role = msg.role === 'user' ? '用户' : 'AI助手'
        const content = msg.content.replace(/<[^>]*>/g, '')
        
        return `[${time}] ${role}: ${content}`
      }).join('\n\n')

      await navigator.clipboard.writeText(chatContent)
      emit('show-notification', '对话已复制到剪贴板', 'success')
    } catch (error) {
      console.error('复制到剪贴板失败:', error)
      emit('show-notification', '复制失败，请手动选择内容复制', 'error')
    }
  }

  // 通用导出方法
  const exportChat = (format = 'text') => {
    switch (format.toLowerCase()) {
      case 'json':
        exportAsJSON()
        break
      case 'markdown':
      case 'md':
        exportAsMarkdown()
        break
      case 'text':
      case 'txt':
      default:
        exportAsText()
        break
    }
  }

  // 下载文件的通用方法
  const downloadFile = (content, mimeType, filename) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  // 获取日期字符串
  const getDateString = () => {
    return new Date().toISOString().split('T')[0]
  }

  // 获取导出统计信息
  const getExportStats = () => {
    if (!messages.value || messages.value.length === 0) {
      return null
    }

    const userMessages = messages.value.filter(msg => msg.role === 'user')
    const aiMessages = messages.value.filter(msg => msg.role === 'assistant')
    
    return {
      totalMessages: messages.value.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      firstMessageTime: messages.value[0]?.timestamp,
      lastMessageTime: messages.value[messages.value.length - 1]?.timestamp,
      totalCharacters: messages.value.reduce((sum, msg) => sum + msg.content.length, 0)
    }
  }

  return {
    exportChat,
    exportAsText,
    exportAsJSON,
    exportAsMarkdown,
    copyToClipboard,
    getExportStats
  }
}
