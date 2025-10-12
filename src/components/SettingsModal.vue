<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>设置</h2>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>
          
          <!-- 标签页导航 -->
          <div class="tabs-navigation">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="['tab-button', { active: activeTab === tab.id }]"
              @click="activeTab = tab.id"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              {{ tab.name }}
            </button>
          </div>

          <div class="modal-body">
            <!-- AI聊天设置 -->
            <div v-if="activeTab === 'ai-chat'" class="tab-content">
              <div class="settings-section">
                <h3>聊天配置</h3>
                <div class="setting-item">
                  <label>AI 提供商</label>
                  <select v-model="settings.aiChat.provider" class="setting-select" @change="updateAIChatDefaults">
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="local">Local</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>API Key</label>
                  <div class="input-with-toggle">
                    <input
                      v-model="settings.aiChat.apiKey"
                      :type="showApiKey ? 'text' : 'password'"
                      class="setting-input"
                      placeholder="请输入API密钥"
                    />
                    <button type="button" class="toggle-btn" @click="showApiKey = !showApiKey">
                      {{ showApiKey ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>Base URL</label>
                  <input
                    v-model="settings.aiChat.baseUrl"
                    type="url"
                    class="setting-input"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div class="setting-item">
                  <label>模型名称</label>
                  <div class="model-input-group">
                    <input
                      v-model="settings.aiChat.customModel"
                      type="text"
                      class="setting-input"
                      placeholder="自定义模型名称或选择预设"
                    />
                    <select v-model="settings.aiChat.model" class="setting-select model-select" @change="syncCustomModel">
                      <option value="">自定义模型</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    </select>
                  </div>
                </div>
                <div class="setting-item">
                  <label>最大令牌数</label>
                  <input
                    v-model="settings.aiChat.maxTokens"
                    type="number"
                    class="setting-input"
                    min="100"
                    max="8000"
                  />
                </div>
                <div class="setting-item">
                  <label>温度 (0-2)</label>
                  <input
                    v-model="settings.aiChat.temperature"
                    type="range"
                    class="setting-range"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                  <span class="range-value">{{ settings.aiChat.temperature }}</span>
                </div>
              </div>

              <div class="settings-section">
                <h3>聊天行为</h3>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.aiChat.systemPromptEnabled"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    启用系统提示词
                  </label>
                </div>
                <div v-if="settings.aiChat.systemPromptEnabled" class="setting-item">
                  <label>系统提示词</label>
                  <textarea
                    v-model="settings.aiChat.systemPrompt"
                    class="setting-textarea"
                    rows="4"
                    placeholder="输入系统提示词..."
                  ></textarea>
                </div>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.aiChat.saveHistory"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    保存聊天历史
                  </label>
                </div>
                <div class="setting-item">
                  <label>历史记录保留天数</label>
                  <input
                    v-model="settings.aiChat.historyRetentionDays"
                    type="number"
                    class="setting-input"
                    min="1"
                    max="365"
                  />
                </div>
              </div>
            </div>

            <!-- AI补全设置 -->
            <div v-if="activeTab === 'ai-completion'" class="tab-content">
              <div class="settings-section">
                <h3>代码补全配置</h3>
                <div class="setting-item">
                  <label>补全提供商</label>
                  <select v-model="settings.aiCompletion.provider" class="setting-select" @change="updateAICompletionDefaults">
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="github">GitHub Copilot</option>
                    <option value="local">Local</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>API Key</label>
                  <div class="input-with-toggle">
                    <input
                      v-model="settings.aiCompletion.apiKey"
                      :type="showCompletionApiKey ? 'text' : 'password'"
                      class="setting-input"
                      placeholder="请输入API密钥"
                    />
                    <button type="button" class="toggle-btn" @click="showCompletionApiKey = !showCompletionApiKey">
                      {{ showCompletionApiKey ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>Base URL</label>
                  <input
                    v-model="settings.aiCompletion.baseUrl"
                    type="url"
                    class="setting-input"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div class="setting-item">
                  <label>补全模型</label>
                  <div class="model-input-group">
                    <input
                      v-model="settings.aiCompletion.customModel"
                      type="text"
                      class="setting-input"
                      placeholder="自定义模型名称或选择预设"
                    />
                    <select v-model="settings.aiCompletion.model" class="setting-select model-select" @change="syncCompletionCustomModel">
                      <option value="">自定义模型</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="text-davinci-003">Text Davinci 003</option>
                      <option value="code-davinci-002">Code Davinci 002</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <h3>补全行为</h3>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.aiCompletion.autoTrigger"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    自动触发补全
                  </label>
                </div>
                <div class="setting-item">
                  <label>触发延迟 (毫秒)</label>
                  <input
                    v-model="settings.aiCompletion.triggerDelay"
                    type="number"
                    class="setting-input"
                    min="100"
                    max="2000"
                  />
                </div>
                <div class="setting-item">
                  <label>最大补全数量</label>
                  <input
                    v-model="settings.aiCompletion.maxSuggestions"
                    type="number"
                    class="setting-input"
                    min="1"
                    max="10"
                  />
                </div>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.aiCompletion.acceptOnTab"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    Tab键接受补全
                  </label>
                </div>
              </div>
            </div>

            <!-- 终端设置 -->
            <div v-if="activeTab === 'terminal'" class="tab-content">
              <div class="settings-section">
                <h3>外观设置</h3>
                <div class="setting-item">
                  <label>字体</label>
                  <select v-model="settings.terminal.font" class="setting-select">
                    <option value="Consolas">Consolas</option>
                    <option value="Monaco">Monaco</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Fira Code">Fira Code</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>字体大小</label>
                  <input
                    v-model="settings.terminal.fontSize"
                    type="number"
                    class="setting-input"
                    min="8"
                    max="32"
                  />
                </div>
                <div class="setting-item">
                  <label>行高</label>
                  <input
                    v-model="settings.terminal.lineHeight"
                    type="number"
                    class="setting-input"
                    min="1.0"
                    max="2.0"
                    step="0.1"
                  />
                </div>
              </div>

              <div class="settings-section">
                <h3>行为设置</h3>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.terminal.bell"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    启用铃声
                  </label>
                </div>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.terminal.cursorBlink"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    光标闪烁
                  </label>
                </div>
                <div class="setting-item">
                  <label>光标样式</label>
                  <select v-model="settings.terminal.cursorStyle" class="setting-select">
                    <option value="block">块状</option>
                    <option value="underline">下划线</option>
                    <option value="bar">竖线</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>滚动缓冲区大小</label>
                  <input
                    v-model="settings.terminal.scrollback"
                    type="number"
                    class="setting-input"
                    min="100"
                    max="10000"
                  />
                </div>
              </div>

              <div class="settings-section">
                <h3>快捷键</h3>
                <div class="setting-item">
                  <label>复制快捷键</label>
                  <select v-model="settings.terminal.copyShortcut" class="setting-select">
                    <option value="ctrl-c">Ctrl+C</option>
                    <option value="ctrl-shift-c">Ctrl+Shift+C</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>粘贴快捷键</label>
                  <select v-model="settings.terminal.pasteShortcut" class="setting-select">
                    <option value="ctrl-v">Ctrl+V</option>
                    <option value="ctrl-shift-v">Ctrl+Shift+V</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 常规设置 -->
            <div v-if="activeTab === 'general'" class="tab-content">
              <div class="settings-section">
                <h3>界面设置</h3>
                <div class="setting-item">
                  <label>主题</label>
                  <select v-model="settings.general.theme" class="setting-select">
                    <option value="dark">深色</option>
                    <option value="light">浅色</option>
                    <option value="auto">跟随系统</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>语言</label>
                  <select v-model="settings.general.language" class="setting-select">
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>界面缩放</label>
                  <select v-model="settings.general.zoom" class="setting-select">
                    <option value="0.8">80%</option>
                    <option value="1">100%</option>
                    <option value="1.2">120%</option>
                    <option value="1.5">150%</option>
                  </select>
                </div>
              </div>

              <div class="settings-section">
                <h3>连接设置</h3>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.general.autoSaveSessions"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    自动保存连接
                  </label>
                </div>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.general.reconnectOnStart"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    启动时自动重连
                  </label>
                </div>
                <div class="setting-item">
                  <label>连接超时 (秒)</label>
                  <input
                    v-model="settings.general.connectionTimeout"
                    type="number"
                    class="setting-input"
                    min="5"
                    max="60"
                  />
                </div>
              </div>

              <div class="settings-section">
                <h3>安全设置</h3>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.security.encryptPasswords"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    加密保存密码
                  </label>
                </div>
                <div class="setting-item">
                  <label>会话超时 (分钟)</label>
                  <input
                    v-model="settings.security.sessionTimeout"
                    type="number"
                    class="setting-input"
                    min="5"
                    max="120"
                  />
                </div>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.security.confirmDangerousCommands"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    危险命令确认
                  </label>
                </div>
              </div>

              <div class="settings-section">
                <h3>通知设置</h3>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.general.enableNotifications"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    启用通知
                  </label>
                </div>
                <div class="setting-item">
                  <label>
                    <input
                      v-model="settings.general.soundEnabled"
                      type="checkbox"
                      class="setting-checkbox"
                    />
                    启用声音
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="secondary-btn" @click="resetSettings">
              重置
            </button>
            <button class="primary-btn" @click="saveSettings">
              保存设置
            </button>
            <button class="secondary-btn" @click="$emit('close')">
              取消
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { reactive, ref } from 'vue'

export default {
  name: 'SettingsModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'show-notification'],
  setup(props, { emit }) {
    const activeTab = ref('ai-chat')
    
    const tabs = [
      { id: 'ai-chat', name: 'AI聊天', icon: '💬' },
      { id: 'ai-completion', name: 'AI补全', icon: '🔧' },
      { id: 'terminal', name: '终端', icon: '🖥️' },
      { id: 'general', name: '常规', icon: '⚙️' }
    ]

    const defaultSettings = {
      aiChat: {
        provider: 'openai',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        customModel: '',
        maxTokens: 2000,
        temperature: 0.7,
        systemPromptEnabled: false,
        systemPrompt: '你是一个专业的编程助手，请帮助用户解决编程问题。',
        saveHistory: true,
        historyRetentionDays: 30
      },
      aiCompletion: {
        provider: 'openai',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        customModel: '',
        autoTrigger: true,
        triggerDelay: 500,
        maxSuggestions: 5,
        acceptOnTab: true
      },
      terminal: {
        font: 'Consolas',
        fontSize: 14,
        lineHeight: 1.2,
        bell: false,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        copyShortcut: 'ctrl-c',
        pasteShortcut: 'ctrl-v'
      },
      general: {
        language: 'zh-CN',
        theme: 'dark',
        zoom: 1,
        autoSaveSessions: true,
        reconnectOnStart: false,
        connectionTimeout: 30,
        enableNotifications: true,
        soundEnabled: true
      },
      security: {
        encryptPasswords: false,
        sessionTimeout: 30,
        confirmDangerousCommands: true
      }
    }

    const showApiKey = ref(false)
    const showCompletionApiKey = ref(false)
    
    const settings = reactive({ ...defaultSettings })

    // 提供商默认配置
    const providerDefaults = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-sonnet'
      },
      local: {
        baseUrl: 'http://localhost:11434',
        model: 'llama2'
      },
      github: {
        baseUrl: 'https://api.githubcopilot.com',
        model: 'gpt-4o-copilot'
      },
      custom: {
        baseUrl: '',
        model: ''
      }
    }

    // 存储不同提供商的配置缓存
    const providerConfigCache = ref({
      aiChat: {},
      aiCompletion: {}
    })

    // GPT池 - 保存所有提供商的配置信息
    const providerPool = ref({
      aiChat: {},
      aiCompletion: {}
    })

    // 更新GPT池中的提供商配置
    const updateProviderPool = (type, provider, config) => {
      if (!providerPool.value[type]) {
        providerPool.value[type] = {}
      }
      
      // 深拷贝配置，避免引用问题
      const configCopy = JSON.parse(JSON.stringify(config))
      providerPool.value[type][provider] = {
        ...configCopy,
        lastUpdated: new Date().toISOString()
      }
      
      console.log(`GPT池更新: ${type}.${provider}`, configCopy)
    }

    // 从GPT池中获取提供商配置
    const getProviderFromPool = (type, provider) => {
      const poolConfig = providerPool.value[type]?.[provider]
      if (poolConfig) {
        console.log(`从GPT池获取配置: ${type}.${provider}`, poolConfig)
        return poolConfig
      }
      return null
    }

    const updateAIChatDefaults = async () => {
      const provider = settings.aiChat.provider
      console.log(`AI聊天提供商切换到: ${provider}`)
      
      try {
        // 优先从GPT池中获取该提供商的配置
        const poolConfig = getProviderFromPool('aiChat', provider)
        if (poolConfig) {
          settings.aiChat.baseUrl = poolConfig.baseUrl
          settings.aiChat.model = poolConfig.model
          settings.aiChat.customModel = poolConfig.customModel || ''
          settings.aiChat.apiKey = poolConfig.apiKey || ''
          settings.aiChat.maxTokens = poolConfig.maxTokens || settings.aiChat.maxTokens
          settings.aiChat.temperature = poolConfig.temperature || settings.aiChat.temperature
          
          console.log(`从GPT池加载AI聊天提供商配置: ${provider}`, poolConfig)
          return
        }
        
        // 如果GPT池中没有，尝试从缓存中获取该提供商的配置
        if (providerConfigCache.value.aiChat[provider]) {
          const cachedConfig = providerConfigCache.value.aiChat[provider]
          settings.aiChat.baseUrl = cachedConfig.baseUrl
          settings.aiChat.model = cachedConfig.model
          settings.aiChat.customModel = cachedConfig.customModel || ''
          settings.aiChat.apiKey = cachedConfig.apiKey || ''
          settings.aiChat.maxTokens = cachedConfig.maxTokens || settings.aiChat.maxTokens
          settings.aiChat.temperature = cachedConfig.temperature || settings.aiChat.temperature
          
          console.log(`从缓存加载AI聊天提供商配置: ${provider}`, cachedConfig)
          return
        }
        
        // 如果都没有，使用默认配置
        if (providerDefaults[provider]) {
          settings.aiChat.baseUrl = providerDefaults[provider].baseUrl
          settings.aiChat.model = providerDefaults[provider].model
          settings.aiChat.customModel = ''
          
          // 对于自定义提供商，清空API密钥以避免混淆
          if (provider === 'custom') {
            settings.aiChat.apiKey = ''
          }
          
          console.log(`使用默认AI聊天提供商配置: ${provider}`, {
            baseUrl: settings.aiChat.baseUrl,
            model: settings.aiChat.model
          })
        } else {
          // 处理未知的提供商
          console.warn(`未知的AI聊天提供商: ${provider}`)
          settings.aiChat.baseUrl = ''
          settings.aiChat.model = ''
          settings.aiChat.customModel = ''
          settings.aiChat.apiKey = ''
        }
      } catch (error) {
        console.error('加载AI聊天提供商配置失败:', error)
        // 发生错误时使用默认配置作为回退
        if (providerDefaults[provider]) {
          settings.aiChat.baseUrl = providerDefaults[provider].baseUrl
          settings.aiChat.model = providerDefaults[provider].model
          settings.aiChat.customModel = ''
        }
      }
    }

    const updateAICompletionDefaults = async () => {
      const provider = settings.aiCompletion.provider
      console.log(`AI补全提供商切换到: ${provider}`)
      
      try {
        // 优先从GPT池中获取该提供商的配置
        const poolConfig = getProviderFromPool('aiCompletion', provider)
        if (poolConfig) {
          settings.aiCompletion.baseUrl = poolConfig.baseUrl
          settings.aiCompletion.model = poolConfig.model
          settings.aiCompletion.customModel = poolConfig.customModel || ''
          settings.aiCompletion.apiKey = poolConfig.apiKey || ''
          settings.aiCompletion.autoTrigger = poolConfig.autoTrigger !== undefined ? poolConfig.autoTrigger : settings.aiCompletion.autoTrigger
          settings.aiCompletion.triggerDelay = poolConfig.triggerDelay || settings.aiCompletion.triggerDelay
          settings.aiCompletion.maxSuggestions = poolConfig.maxSuggestions || settings.aiCompletion.maxSuggestions
          
          console.log(`从GPT池加载AI补全提供商配置: ${provider}`, poolConfig)
          return
        }
        
        // 如果GPT池中没有，尝试从缓存中获取该提供商的配置
        if (providerConfigCache.value.aiCompletion[provider]) {
          const cachedConfig = providerConfigCache.value.aiCompletion[provider]
          settings.aiCompletion.baseUrl = cachedConfig.baseUrl
          settings.aiCompletion.model = cachedConfig.model
          settings.aiCompletion.customModel = cachedConfig.customModel || ''
          settings.aiCompletion.apiKey = cachedConfig.apiKey || ''
          settings.aiCompletion.autoTrigger = cachedConfig.autoTrigger !== undefined ? cachedConfig.autoTrigger : settings.aiCompletion.autoTrigger
          settings.aiCompletion.triggerDelay = cachedConfig.triggerDelay || settings.aiCompletion.triggerDelay
          settings.aiCompletion.maxSuggestions = cachedConfig.maxSuggestions || settings.aiCompletion.maxSuggestions
          
          console.log(`从缓存加载AI补全提供商配置: ${provider}`, cachedConfig)
          return
        }
        
        // 如果缓存中没有，尝试从配置文件中加载
        if (window.electronAPI) {
          const savedSettings = await window.electronAPI.getConfig()
          if (savedSettings && savedSettings.aiCompletion && savedSettings.aiCompletion.provider === provider) {
            const providerConfig = savedSettings.aiCompletion
            settings.aiCompletion.baseUrl = providerConfig.baseUrl || providerDefaults[provider]?.baseUrl || ''
            settings.aiCompletion.model = providerConfig.model || providerDefaults[provider]?.model || ''
            settings.aiCompletion.customModel = providerConfig.customModel || ''
            settings.aiCompletion.apiKey = providerConfig.apiKey || ''
            settings.aiCompletion.autoTrigger = providerConfig.autoTrigger !== undefined ? providerConfig.autoTrigger : settings.aiCompletion.autoTrigger
            settings.aiCompletion.triggerDelay = providerConfig.triggerDelay || settings.aiCompletion.triggerDelay
            settings.aiCompletion.maxSuggestions = providerConfig.maxSuggestions || settings.aiCompletion.maxSuggestions
            
            // 缓存配置以备后用
            providerConfigCache.value.aiCompletion[provider] = {
              baseUrl: settings.aiCompletion.baseUrl,
              model: settings.aiCompletion.model,
              customModel: settings.aiCompletion.customModel,
              apiKey: settings.aiCompletion.apiKey,
              autoTrigger: settings.aiCompletion.autoTrigger,
              triggerDelay: settings.aiCompletion.triggerDelay,
              maxSuggestions: settings.aiCompletion.maxSuggestions
            }
            
            console.log(`从配置文件加载AI补全提供商配置: ${provider}`, providerConfig)
            return
          }
        }
        
        // 如果都没有，使用默认配置
        if (providerDefaults[provider]) {
          settings.aiCompletion.baseUrl = providerDefaults[provider].baseUrl
          settings.aiCompletion.model = providerDefaults[provider].model
          settings.aiCompletion.customModel = ''
          
          // 对于自定义提供商，清空API密钥以避免混淆
          if (provider === 'custom') {
            settings.aiCompletion.apiKey = ''
          }
          
          console.log(`使用默认AI补全提供商配置: ${provider}`, {
            baseUrl: settings.aiCompletion.baseUrl,
            model: settings.aiCompletion.model
          })
        } else {
          // 处理未知的提供商
          console.warn(`未知的AI补全提供商: ${provider}`)
          settings.aiCompletion.baseUrl = ''
          settings.aiCompletion.model = ''
          settings.aiCompletion.customModel = ''
          settings.aiCompletion.apiKey = ''
        }
      } catch (error) {
        console.error('加载AI补全提供商配置失败:', error)
        // 发生错误时使用默认配置作为回退
        if (providerDefaults[provider]) {
          settings.aiCompletion.baseUrl = providerDefaults[provider].baseUrl
          settings.aiCompletion.model = providerDefaults[provider].model
          settings.aiCompletion.customModel = ''
        }
      }
    }

    const syncCustomModel = () => {
      if (settings.aiChat.model) {
        settings.aiChat.customModel = settings.aiChat.model
      }
    }

    const syncCompletionCustomModel = () => {
      if (settings.aiCompletion.model) {
        settings.aiCompletion.customModel = settings.aiCompletion.model
      }
    }

    const loadSettings = async () => {
      try {
        console.log('开始加载设置...')
        
        if (window.electronAPI) {
          console.log('检测到 Electron 环境，使用 electronAPI 加载配置')
          const savedSettings = await window.electronAPI.getConfig()
          console.log('获取到的保存设置:', savedSettings)
          
          if (savedSettings) {
            await applySettings(savedSettings)
          } else {
            console.log('未找到保存的设置，使用默认设置')
            await tryLoadFromLocalStorage()
          }
        } else {
          console.warn('未检测到 electronAPI，尝试从 localStorage 加载配置')
          await tryLoadFromLocalStorage()
        }
      } catch (error) {
        console.error('加载设置失败:', error)
        // 发出通知给用户
        emit('show-notification', '加载设置失败，使用默认配置', 'warning')
        
        // 最后的 fallback：使用默认设置
        Object.assign(settings, defaultSettings)
      }
    }

    const tryLoadFromLocalStorage = async () => {
      try {
        const localSettings = localStorage.getItem('sshcode-settings')
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings)
          console.log('从 localStorage 加载设置成功:', parsedSettings)
          await applySettings(parsedSettings)
        } else {
          console.log('localStorage 中也没有设置，使用默认设置')
          Object.assign(settings, defaultSettings)
        }
      } catch (error) {
        console.error('从 localStorage 加载设置失败:', error)
        Object.assign(settings, defaultSettings)
      }
    }

    const applySettings = async (savedSettings) => {
      const lastSavedProviders = savedSettings.lastSavedProviders
      
      const processedSettings = {
        ...defaultSettings,
        aiChat: {
          ...defaultSettings.aiChat,
          ...(savedSettings.aiChat || {}),
          customModel: savedSettings.aiChat?.customModel || '',
          systemPromptEnabled: savedSettings.aiChat?.systemPromptEnabled ?? false,
          systemPrompt: savedSettings.aiChat?.systemPrompt || defaultSettings.aiChat.systemPrompt,
          saveHistory: savedSettings.aiChat?.saveHistory ?? true,
          historyRetentionDays: savedSettings.aiChat?.historyRetentionDays || 30
        },
        aiCompletion: {
          ...defaultSettings.aiCompletion,
          ...(savedSettings.aiCompletion || {}),
          customModel: savedSettings.aiCompletion?.customModel || ''
        },
        terminal: {
          ...defaultSettings.terminal,
          ...(savedSettings.terminal || {})
        },
        general: {
          ...defaultSettings.general,
          ...(savedSettings.general || {})
        },
        security: {
          ...defaultSettings.security,
          ...(savedSettings.security || {})
        },
        lastSavedProviders: lastSavedProviders
      }
      
      console.log('处理后的设置:', processedSettings)
      Object.assign(settings, processedSettings)
      console.log('设置已应用到响应式对象')
      
      // 加载GPT池配置
      if (savedSettings.providerPool) {
        providerPool.value = savedSettings.providerPool
        console.log('GPT池配置加载完成:', providerPool.value)
      } else {
        console.log('未找到GPT池配置，使用默认空池')
      }
      
      if (lastSavedProviders) {
        console.log('检测到最后一次保存的供应商信息:', lastSavedProviders)
        await restoreLastSavedProviders(lastSavedProviders, savedSettings)
      } else {
        console.log('未找到最后一次保存的供应商信息')
      }
      
      initializeProviderCache(savedSettings)
      
      console.log('配置加载成功:', processedSettings)
      console.log('当前设置状态:', settings)
    }

    const initializeProviderCache = (savedSettings) => {
      // 为AI聊天提供商初始化缓存
      if (savedSettings.aiChat) {
        const currentProvider = savedSettings.aiChat.provider
        if (currentProvider) {
          providerConfigCache.value.aiChat[currentProvider] = {
            baseUrl: savedSettings.aiChat.baseUrl || providerDefaults[currentProvider]?.baseUrl || '',
            model: savedSettings.aiChat.model || providerDefaults[currentProvider]?.model || '',
            customModel: savedSettings.aiChat.customModel || '',
            apiKey: savedSettings.aiChat.apiKey || '',
            maxTokens: savedSettings.aiChat.maxTokens || defaultSettings.aiChat.maxTokens,
            temperature: savedSettings.aiChat.temperature || defaultSettings.aiChat.temperature
          }
        }
      }
      
      // 为AI补全提供商初始化缓存
      if (savedSettings.aiCompletion) {
        const currentProvider = savedSettings.aiCompletion.provider
        if (currentProvider) {
          providerConfigCache.value.aiCompletion[currentProvider] = {
            baseUrl: savedSettings.aiCompletion.baseUrl || providerDefaults[currentProvider]?.baseUrl || '',
            model: savedSettings.aiCompletion.model || providerDefaults[currentProvider]?.model || '',
            customModel: savedSettings.aiCompletion.customModel || '',
            apiKey: savedSettings.aiCompletion.apiKey || '',
            autoTrigger: savedSettings.aiCompletion.autoTrigger !== undefined ? savedSettings.aiCompletion.autoTrigger : defaultSettings.aiCompletion.autoTrigger,
            triggerDelay: savedSettings.aiCompletion.triggerDelay || defaultSettings.aiCompletion.triggerDelay,
            maxSuggestions: savedSettings.aiCompletion.maxSuggestions || defaultSettings.aiCompletion.maxSuggestions
          }
        }
      }
      
      console.log('提供商配置缓存初始化完成:', providerConfigCache.value)
    }

    const saveSettings = async () => {
      try {
        // 更新GPT池 - 保存当前提供商配置到池中
        updateProviderPool('aiChat', settings.aiChat.provider, settings.aiChat)
        updateProviderPool('aiCompletion', settings.aiCompletion.provider, settings.aiCompletion)
        
        // 记录最后一次保存的供应商信息
        const lastSavedProviders = {
          aiChat: settings.aiChat.provider,
          aiCompletion: settings.aiCompletion.provider,
          timestamp: new Date().toISOString()
        }
        
        // 创建一个可序列化的设置对象副本
        const serializableSettings = JSON.parse(JSON.stringify(settings))
        
        // 确保GPT池数据正确序列化
        const serializedProviderPool = JSON.parse(JSON.stringify(providerPool.value))
        
        // 将供应商信息和GPT池添加到设置中
        serializableSettings.lastSavedProviders = lastSavedProviders
        serializableSettings.providerPool = serializedProviderPool
        
        console.log('准备保存的设置:', {
          lastSavedProviders,
          providerPool: serializedProviderPool
        })
        
        if (window.electronAPI) {
          await window.electronAPI.saveConfig(serializableSettings)
          emit('show-notification', '设置已保存', 'success')
        } else {
          localStorage.setItem('sshcode-settings', JSON.stringify(serializableSettings))
          emit('show-notification', '设置已保存（本地存储）', 'success')
        }
        emit('close')
      } catch (error) {
        console.error('保存设置失败:', error)
        emit('show-notification', `保存设置失败: ${error.message}`, 'error')
      }
    }

    const restoreLastSavedProviders = async (lastSavedProviders, savedSettings) => {
      try {
        // 恢复AI聊天提供商配置
        if (lastSavedProviders.aiChat && lastSavedProviders.aiChat !== settings.aiChat.provider) {
          console.log(`恢复AI聊天提供商: ${lastSavedProviders.aiChat}`)
          settings.aiChat.provider = lastSavedProviders.aiChat
          await updateAIChatDefaults()
        }
        
        // 恢复AI补全提供商配置
        if (lastSavedProviders.aiCompletion && lastSavedProviders.aiCompletion !== settings.aiCompletion.provider) {
          console.log(`恢复AI补全提供商: ${lastSavedProviders.aiCompletion}`)
          settings.aiCompletion.provider = lastSavedProviders.aiCompletion
          await updateAICompletionDefaults()
        }
        
        console.log('供应商配置恢复完成')
      } catch (error) {
        console.error('恢复供应商配置失败:', error)
      }
    }

    const resetSettings = () => {
      Object.assign(settings, defaultSettings)
      emit('show-notification', '设置已重置', 'info')
    }

    // 组件挂载时加载设置
    loadSettings()

    return {
      activeTab,
      tabs,
      settings,
      showApiKey,
      showCompletionApiKey,
      saveSettings,
      resetSettings,
      updateAIChatDefaults,
      updateAICompletionDefaults,
      syncCustomModel,
      syncCompletionCustomModel
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index(modal);
  padding: spacing(lg);
}

.modal-content {
  background: color(surface);
  border-radius: border-radius(lg);
  box-shadow: shadow(xl);
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid color(border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: spacing(lg);
  border-bottom: 1px solid color(border);
}

.modal-header h2 {
  margin: 0;
  font-size: font-size(xl);
  color: color(text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: color(text-muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: border-radius(full);
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.modal-body {
  flex: 1;
  padding: spacing(lg);
  overflow-y: auto;
}

.settings-section {
  margin-bottom: spacing(xl);
}

.settings-section h3 {
  margin: 0 0 spacing(md) 0;
  font-size: font-size(lg);
  color: color(text-primary);
  border-bottom: 1px solid color(border);
  padding-bottom: spacing(sm);
}

.setting-item {
  margin-bottom: spacing(md);
}

.setting-item label {
  display: block;
  margin-bottom: spacing(xs);
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-secondary);
}

.setting-input,
.setting-select {
  @include input-base;
  max-width: 300px;
}

.setting-checkbox {
  margin-right: spacing(xs);
}

.setting-textarea {
  @include input-base;
  min-width: 300px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.setting-range {
  width: 200px;
  margin-right: spacing(sm);
}

.range-value {
  font-size: font-size(sm);
  color: color(text-secondary);
  min-width: 30px;
  display: inline-block;
}

/* 标签页样式 */
.tabs-navigation {
  display: flex;
  border-bottom: 1px solid color(border);
  background: color(bg-secondary);
  padding: 0 spacing(lg);
}

.tab-button {
  background: none;
  border: none;
  padding: spacing(md) spacing(lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: spacing(xs);
  font-size: font-size(sm);
  color: color(text-muted);
  border-bottom: 2px solid transparent;
  transition: all transition(fast) ease;
  position: relative;

  &:hover {
    color: color(text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  &.active {
    color: color(primary);
    border-bottom-color: color(primary);
    background: rgba(color(primary), 0.1);
  }
}

.tab-icon {
  font-size: font-size(md);
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 设置项增强样式 */
.setting-item {
  display: flex;
  flex-direction: column;
  gap: spacing(xs);

  &:has(.setting-range) {
    flex-direction: row;
    align-items: center;
  }

  &:has(.setting-checkbox) {
    flex-direction: row;
    align-items: center;
    gap: spacing(sm);
  }
}

.setting-item:has(.setting-checkbox) label {
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: spacing(sm);
  cursor: pointer;
}

/* 输入框增强样式 */
.input-with-toggle {
  display: flex;
  gap: spacing(xs);
  align-items: center;
  max-width: 400px;
}

.input-with-toggle .setting-input {
  flex: 1;
}

.toggle-btn {
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  padding: spacing(sm);
  cursor: pointer;
  font-size: font-size(sm);
  transition: all transition(fast) ease;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: color(bg-tertiary);
    border-color: color(primary);
  }
}

.model-input-group {
  display: flex;
  flex-direction: column;
  gap: spacing(sm);
  max-width: 400px;
}

.model-select {
  margin-top: spacing(xs);
}

/* 响应式表单布局 */
@media (min-width: 768px) {
  .model-input-group {
    flex-direction: row;
    align-items: center;
    gap: spacing(sm);
  }

  .model-select {
    margin-top: 0;
    min-width: 200px;
  }
}

/* 表单验证样式 */
.setting-input:invalid {
  border-color: color(error);
}

.setting-input:focus {
  outline: none;
  border-color: color(primary);
  box-shadow: 0 0 0 2px rgba(color(primary), 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-content {
    max-width: 95%;
    margin: spacing(md);
  }

  .tabs-navigation {
    padding: 0 spacing(md);
    overflow-x: auto;
  }

  .tab-button {
    padding: spacing(sm) spacing(md);
    font-size: font-size(xs);
    white-space: nowrap;
  }

  .setting-input,
  .setting-select,
  .setting-textarea {
    max-width: 100%;
  }

  .modal-footer {
    flex-direction: column-reverse;
    gap: spacing(sm);

    button {
      width: 100%;
    }
  }
}

.modal-footer {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  padding: spacing(lg);
  border-top: 1px solid color(border);
}

.primary-btn {
  @include button-base;
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
  }
}

.secondary-btn {
  @include button-base;
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  transition: all 0.3s ease;
  transform: scale(0.9);
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>
