# AI模型分离配置功能

## 功能概述

为了优化性能和成本，现在支持为AI聊天和终端补全配置不同的AI模型：

- **💬 AI聊天配置** - 用于智能对话功能，推荐使用更强大的模型
- **⚡ 终端补全配置** - 用于命令补全功能，推荐使用更快速的模型

## 配置界面

### AI聊天配置
- **推荐模型**: GPT-4, Claude-3-Sonnet
- **最大Token**: 2000 (支持长对话)
- **Temperature**: 0.7 (创造性对话)
- **用途**: 智能问答、命令解释、系统分析

### 终端补全配置
- **推荐模型**: GPT-3.5-Turbo, Claude-3-Haiku
- **最大Token**: 1000 (快速响应)
- **Temperature**: 0.3 (准确性优先)
- **用途**: 命令补全、路径建议、参数推荐

## 快速配置功能

### 同步配置
勾选"同步聊天和补全配置"后，修改聊天配置时会自动同步到补全配置。

### 一键复制
- **📋 聊天配置 → 补全配置**: 将聊天配置复制到补全配置
- **📋 补全配置 → 聊天配置**: 将补全配置复制到聊天配置

## 推荐配置方案

### 经济型方案
- **聊天**: GPT-3.5-Turbo (成本低，速度快)
- **补全**: GPT-3.5-Turbo (同一模型，管理简单)

### 性能优先方案
- **聊天**: GPT-4 或 Claude-3-Sonnet (质量高)
- **补全**: GPT-3.5-Turbo (速度快，成本低)

### 本地部署方案
- **聊天**: Ollama + Llama2 (离线使用)
- **补全**: Ollama + Llama2 (同一模型)

## 配置示例

### OpenAI配置
```
聊天配置:
- Provider: OpenAI
- Base URL: https://api.openai.com/v1
- Model: gpt-4
- Max Tokens: 2000
- Temperature: 0.7

补全配置:
- Provider: OpenAI
- Base URL: https://api.openai.com/v1
- Model: gpt-3.5-turbo
- Max Tokens: 1000
- Temperature: 0.3
```

### Anthropic配置
```
聊天配置:
- Provider: Anthropic Claude
- Base URL: https://api.anthropic.com
- Model: claude-3-sonnet-20240229
- Max Tokens: 2000
- Temperature: 0.7

补全配置:
- Provider: Anthropic Claude
- Base URL: https://api.anthropic.com
- Model: claude-3-haiku-20240307
- Max Tokens: 1000
- Temperature: 0.3
```

## 优势

### 1. 成本优化
- 聊天功能使用高质量模型，获得更好的对话体验
- 补全功能使用快速模型，降低API调用成本

### 2. 性能优化
- 补全功能使用低延迟模型，响应更快
- 聊天功能使用高智能模型，理解更准确

### 3. 灵活配置
- 可根据需求选择不同的AI提供商
- 支持混合使用多个AI服务

### 4. 向后兼容
- 保留原有的`getAIConfig()`方法用于兼容
- 新增`getChatAIConfig()`和`getCompletionAIConfig()`方法

## 使用注意事项

### 1. API Key管理
- 两个配置可以使用相同的API Key
- 也可以为不同功能使用不同的API Key

### 2. 模型选择
- 确保选择的模型在对应API服务商中可用
- 补全功能建议选择响应速度快的模型

### 3. 配置测试
- 保存配置后建议使用"测试连接"按钮验证
- 分别测试聊天和补全配置

### 4. 错误处理
- 如果补全配置错误，会自动降级到传统补全
- 如果聊天配置错误，会提示配置AI信息

## 技术实现

### 配置结构
```json
{
  "ai": {
    "chat": {
      "provider": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "...",
      "model": "gpt-4",
      "maxTokens": 2000,
      "temperature": 0.7
    },
    "completion": {
      "provider": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "...",
      "model": "gpt-3.5-turbo",
      "maxTokens": 1000,
      "temperature": 0.3
    },
    "syncConfig": false
  }
}
```

### API调用
- AI聊天使用`window.settingsManager.getChatAIConfig()`
- 终端补全使用`window.settingsManager.getCompletionAIConfig()`
- 兼容性使用`window.settingsManager.getAIConfig()`

这个分离配置功能让用户可以根据不同场景选择最适合的AI模型，既保证了功能质量，又优化了使用成本。