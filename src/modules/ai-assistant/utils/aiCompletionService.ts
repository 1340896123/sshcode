/**
 * AI Command Completion Service
 * Provides intelligent command suggestions using AI APIs
 */

import type { AIConfig, TestResult, CommandSuggestion } from '@/types/index.js';
import type { CompletionContext, CacheEntry, CacheStats, AppConfiguration } from '@/types/ai.js';

class AICompletionService {
  private config: AppConfiguration | null = null;
  private isInitialized: boolean = false;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Initialize the AI completion service
   */
  async initialize(): Promise<void> {
    try {
      if (window.electronAPI?.getConfig) {
        this.config = await window.electronAPI.getConfig();
        this.isInitialized = true;
        console.log('✅ AI completion service initialized');
      } else {
        console.warn('⚠️ Electron API not available');
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI completion service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Get AI command suggestions based on input
   */
  async getCommandSuggestions(
    input: string,
    context: CompletionContext = {}
  ): Promise<CommandSuggestion[]> {
    if (!this.isInitialized || !input || input.trim().length < 2) {
      return [];
    }

    const cacheKey = `${input.trim()}_${JSON.stringify(context)}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.suggestions;
      }
    }

    try {
      const suggestions = await this.fetchAISuggestions(input, context);

      // Cache the results
      this.cache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });

      return suggestions;
    } catch (error) {
      console.error('❌ Failed to get AI suggestions:', error);
      return this.getFallbackSuggestions(input);
    }
  }

  /**
   * Fetch suggestions from AI API
   */
  private async fetchAISuggestions(
    input: string,
    context: CompletionContext
  ): Promise<CommandSuggestion[]> {
    const aiConfig = this.config?.aiCompletion || {};

    if (!aiConfig.apiKey || !aiConfig.baseUrl) {
      return this.getFallbackSuggestions(input);
    }

    try {
      const prompt = this.buildPrompt(input, context);

      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.customModel || aiConfig.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的Linux命令行助手。请根据用户的输入提供准确的命令建议。

规则：
1. 只提供Linux/Unix命令建议
2. 建议应该实用且安全
3. 为每个建议提供简短的中文描述
4. 按相关性和安全性排序
5. 考虑命令的安全性和实用性
6. 提供的命令应该是完整且可直接执行的

返回格式为JSON数组：
[
  {"command": "命令", "description": "中文描述", "confidence": 0.9, "category": "类别"}
]`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI API');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('❌ AI API request failed:', error);
      return this.getFallbackSuggestions(input);
    }
  }

  /**
   * Build prompt for AI API
   */
  private buildPrompt(input: string, context: CompletionContext): string {
    const contextInfo = context.currentDirectory ? `当前目录: ${context.currentDirectory}` : '';
    const historyInfo =
      context.recentCommands && context.recentCommands.length > 0
        ? `最近执行的命令: ${context.recentCommands.slice(-3).join(', ')}`
        : '';

    return `请为以下输入提供Linux命令建议：

输入: "${input}"
${contextInfo}
${historyInfo}

请提供5-8个最相关和实用的命令建议。`;
  }

  /**
   * Parse AI response and format suggestions
   */
  private parseAIResponse(content: string): CommandSuggestion[] {
    try {
      // Try to parse as JSON first
      if (content.trim().startsWith('[')) {
        const suggestions = JSON.parse(content);
        return suggestions.map(
          (s: {
            command: string;
            description: string;
            confidence?: number;
            category?: string;
          }) => ({
            command: s.command,
            description: s.description,
            confidence: s.confidence || 0.7,
            type: 'ai' as const,
            category: s.category || 'general'
          })
        );
      }

      // Parse text response
      const lines = content.split('\n').filter(line => line.trim());
      const suggestions: CommandSuggestion[] = [];

      for (const line of lines) {
        // Try to extract command and description
        const match = line.match(/^(.+?)\s*[-:]\s*(.+)$/);
        if (match) {
          const command = match[1].trim();
          const description = match[2].trim();

          if (command && !suggestions.find(s => s.command === command)) {
            suggestions.push({
              command,
              description,
              confidence: 0.75,
              type: 'ai',
              category: this.guessCategory(command)
            });
          }
        }
      }

      return suggestions.slice(0, 8);
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return this.getFallbackSuggestions(content);
    }
  }

  /**
   * Guess command category based on command content
   */
  private guessCategory(command: string): CommandSuggestion['category'] {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('git')) return 'git';
    if (
      lowerCommand.includes('npm') ||
      lowerCommand.includes('yarn') ||
      lowerCommand.includes('pip')
    )
      return 'package';
    if (lowerCommand.includes('systemctl') || lowerCommand.includes('service')) return 'service';
    if (lowerCommand.includes('docker') || lowerCommand.includes('kubectl')) return 'container';
    if (
      ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'find'].some(cmd => lowerCommand.includes(cmd))
    )
      return 'file';
    if (['ps', 'top', 'htop', 'kill', 'killall'].some(cmd => lowerCommand.includes(cmd)))
      return 'process';
    if (['ping', 'curl', 'wget', 'ssh', 'scp'].some(cmd => lowerCommand.includes(cmd)))
      return 'network';

    return 'general';
  }

  /**
   * Get fallback suggestions when AI is not available
   */
  private getFallbackSuggestions(input: string): CommandSuggestion[] {
    const lowerInput = input.toLowerCase();
    const fallbackSuggestions: CommandSuggestion[] = [];

    // Common command patterns
    if (lowerInput.includes('list') || lowerInput.includes('ls')) {
      fallbackSuggestions.push(
        {
          command: 'ls -la',
          description: '显示所有文件包括隐藏文件',
          confidence: 0.9,
          type: 'ai',
          category: 'file'
        },
        {
          command: 'ls -lh',
          description: '以人类可读格式显示文件大小',
          confidence: 0.8,
          type: 'ai',
          category: 'file'
        },
        {
          command: 'tree',
          description: '以树形结构显示目录',
          confidence: 0.7,
          type: 'ai',
          category: 'file'
        }
      );
    }

    if (lowerInput.includes('install')) {
      fallbackSuggestions.push(
        {
          command: 'sudo apt install',
          description: '安装软件包 (Ubuntu/Debian)',
          confidence: 0.9,
          type: 'ai',
          category: 'package'
        },
        {
          command: 'sudo yum install',
          description: '安装软件包 (RHEL/CentOS)',
          confidence: 0.8,
          type: 'ai',
          category: 'package'
        },
        {
          command: 'npm install',
          description: '安装Node.js包',
          confidence: 0.7,
          type: 'ai',
          category: 'package'
        }
      );
    }

    if (lowerInput.includes('start') || lowerInput.includes('run')) {
      fallbackSuggestions.push(
        {
          command: 'systemctl start',
          description: '启动系统服务',
          confidence: 0.9,
          type: 'ai',
          category: 'service'
        },
        {
          command: 'service start',
          description: '启动服务',
          confidence: 0.7,
          type: 'ai',
          category: 'service'
        },
        {
          command: 'npm start',
          description: '启动Node.js应用',
          confidence: 0.8,
          type: 'ai',
          category: 'package'
        }
      );
    }

    if (lowerInput.includes('check') || lowerInput.includes('status')) {
      fallbackSuggestions.push(
        {
          command: 'systemctl status',
          description: '检查服务状态',
          confidence: 0.9,
          type: 'ai',
          category: 'service'
        },
        {
          command: 'ps aux | grep',
          description: '查找运行中的进程',
          confidence: 0.8,
          type: 'ai',
          category: 'process'
        },
        {
          command: 'netstat -tlnp',
          description: '检查监听的端口',
          confidence: 0.7,
          type: 'ai',
          category: 'network'
        }
      );
    }

    // Add generic help suggestion
    if (fallbackSuggestions.length === 0) {
      fallbackSuggestions.push(
        {
          command: `${input} --help`,
          description: '显示命令帮助信息',
          confidence: 0.6,
          type: 'ai',
          category: 'help'
        },
        {
          command: `man ${input}`,
          description: '查看命令手册',
          confidence: 0.6,
          type: 'ai',
          category: 'help'
        }
      );
    }

    return fallbackSuggestions.slice(0, 5);
  }

  /**
   * Get context-aware suggestions based on current state
   */
  async getContextualSuggestions(context: CompletionContext = {}): Promise<CommandSuggestion[]> {
    const suggestions: CommandSuggestion[] = [];

    // Directory-based suggestions
    if (context.currentDirectory) {
      if (context.currentDirectory === '/') {
        suggestions.push({
          command: 'ls /home',
          description: '查看用户目录',
          confidence: 0.8,
          type: 'ai',
          category: 'file'
        });
      }

      if (context.currentDirectory.includes('git')) {
        suggestions.push({
          command: 'git status',
          description: '检查Git仓库状态',
          confidence: 0.9,
          type: 'ai',
          category: 'git'
        });
      }
    }

    // Recent command-based suggestions
    if (context.recentCommands && context.recentCommands.length > 0) {
      const lastCommand = context.recentCommands[context.recentCommands.length - 1];

      if (lastCommand.includes('mkdir')) {
        suggestions.push({
          command: 'cd',
          description: '进入新创建的目录',
          confidence: 0.8,
          type: 'ai',
          category: 'file'
        });
      }

      if (lastCommand.includes('git clone')) {
        suggestions.push({
          command: 'cd',
          description: '进入克隆的仓库目录',
          confidence: 0.9,
          type: 'ai',
          category: 'git'
        });
      }
    }

    return suggestions;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const now = Date.now();
    let validEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.cacheTimeout) {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      cacheSize: this.cache.size
    };
  }

  /**
   * Test AI completion functionality
   */
  async testConnection(): Promise<TestResult> {
    try {
      const suggestions = await this.getCommandSuggestions('ls');
      return {
        success: true,
        data: suggestions,
        suggestions,
        message: `获取到 ${suggestions.length} 个建议`
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        message: 'AI补全功能测试失败'
      };
    }
  }
}

// Create singleton instance
const aiCompletionService = new AICompletionService();

export default aiCompletionService;
