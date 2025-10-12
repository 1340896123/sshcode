# AI配置修复说明

## 修改概述

本次修复主要解决了 `src/utils/aiService.js` 中AI配置获取的问题，移除了硬编码的默认配置，并实现了引导用户设置配置的机制。

## 主要修改

### 1. 移除默认配置 (src/utils/aiService.js)

**移除的内容:**
```javascript
// 默认AI配置
const DEFAULT_AI_CONFIG = {
  provider: 'custom',
  baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
  apiKey: '6d5b19eba3494d30ab20bc5749ef7e75.HPYVMdF5RSfW61YX',
  model: 'glm-4.5',
  maxTokens: 8000,
  temperature: 0.7
}
```

**原因:** 
- 包含硬编码的API密钥，存在安全风险
- 用户无法自定义AI服务提供商
- 违反了配置应该由用户控制的原则

### 2. 重写 getAIConfig() 函数

**新的逻辑:**
```javascript
export async function getAIConfig() {
  try {
    // 尝试从electron API获取配置
    if (window.electronAPI?.getConfig) {
      const config = await window.electronAPI.getConfig()
      if (config.aiChat && isConfigValid(config.aiChat)) {
        return config.aiChat
      }
    }
    
    // 尝试从本地存储获取配置
    const localConfig = localStorage.getItem('ai-config')
    if (localConfig) {
      const parsedConfig = JSON.parse(localConfig)
      if (isConfigValid(parsedConfig)) {
        return parsedConfig
      }
    }
    
    // 如果没有有效配置，抛出错误引导用户设置
    throw new Error('AI_CONFIG_NOT_SET')
    
  } catch (error) {
    if (error.message === 'AI_CONFIG_NOT_SET') {
      // 触发配置设置引导
      triggerConfigSetup()
      throw error
    }
    console.error('获取AI配置失败:', error)
    throw new Error('AI配置获取失败，请检查设置')
  }
}
```

**改进点:**
- 移除了对默认配置的依赖
- 添加了配置有效性验证
- 实现了配置缺失时的引导机制
- 提供了清晰的错误处理

### 3. 新增配置验证函数

```javascript
function isConfigValid(config) {
  return config && 
         config.baseUrl && 
         config.apiKey && 
         config.model &&
         config.baseUrl.trim() !== '' &&
         config.apiKey.trim() !== '' &&
         config.model.trim() !== ''
}
```

### 4. 新增配置引导机制

```javascript
function triggerConfigSetup() {
  // 触发全局事件，通知组件显示设置引导
  window.dispatchEvent(new CustomEvent('ai-config-required', {
    detail: {
      message: '请先配置AI服务设置才能使用AI助手功能'
    }
  }))
}
```

### 5. 更新 useAIChat 组合式函数 (src/composables/useAIChat.js)

**修改的错误处理逻辑:**
```javascript
catch (error) {
  console.error('AI API调用失败:', error)
  
  // 检查是否是配置未设置的错误
  if (error.message === 'AI_CONFIG_NOT_SET') {
    addMessage('assistant', '⚠️ **AI服务未配置**\n\n请先设置AI服务配置才能使用AI助手功能。\n\n点击右上角设置按钮进行配置。')
    emit('show-notification', '请先配置AI服务设置', 'error')
    // 触发设置面板显示
    emit('show-settings')
  } else {
    // 其他错误的降级处理
    const fallbackResponse = generateAIResponse(message)
    addMessage('assistant', fallbackResponse.content, fallbackResponse.actions)
    emit('show-notification', 'AI服务暂时不可用，使用本地响应', 'warning')
  }
}
```

### 6. 更新 AIAssistant 组件 (src/components/AIAssistant.vue)

**新增功能:**
- 添加 `show-settings` 事件到 emits
- 监听 `ai-config-required` 事件
- 自动触发设置面板显示

## 用户体验改进

### 1. 配置缺失时的处理流程

1. 用户尝试使用AI助手
2. 系统检测到配置缺失
3. 显示友好的错误消息
4. 自动打开设置面板
5. 引导用户完成配置

### 2. 错误消息优化

- **配置未设置**: "⚠️ AI服务未配置\n\n请先设置AI服务配置才能使用AI助手功能。\n\n点击右上角设置按钮进行配置。"
- **通知提示**: "请先配置AI服务设置"

## 安全性改进

1. **移除硬编码密钥**: 不再在代码中包含默认API密钥
2. **配置验证**: 确保配置完整性
3. **错误处理**: 避免敏感信息泄露

## 测试验证

创建了 `test-ai-config.html` 测试文件，包含以下测试功能：

1. **配置获取测试**: 验证配置获取逻辑
2. **配置设置测试**: 测试配置保存和验证
3. **配置验证测试**: 测试配置有效性检查
4. **AI服务调用模拟**: 模拟配置缺失场景

## 兼容性

- 保持与现有 Electron API 的兼容性
- 保持与本地存储的兼容性
- 不影响现有的 `validateAIConfig` 和 `testAIConnection` 函数

## 使用指南

### 用户配置AI服务的步骤：

1. 点击AI助手中的设置按钮
2. 在设置面板中配置以下信息：
   - API基础URL (如: `https://api.openai.com/v1`)
   - API密钥
   - 模型名称 (如: `gpt-3.5-turbo`)
   - 最大令牌数 (可选)
   - 温度值 (可选)
3. 保存配置
4. 重新使用AI助手

### 开发者集成：

```javascript
import { getAIConfig } from '@/utils/aiService'

try {
  const config = await getAIConfig()
  // 使用配置调用AI服务
} catch (error) {
  if (error.message === 'AI_CONFIG_NOT_SET') {
    // 引导用户配置
  }
}
```

## 总结

本次修复彻底解决了AI配置的安全问题，提升了用户体验，并建立了完善的配置管理机制。用户现在可以安全地使用自定义的AI服务配置，系统会在配置缺失时提供清晰的引导。
