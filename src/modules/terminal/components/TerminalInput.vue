<template>
  <!-- eslint-disable vue/no- -->
  <div class="terminal-input-overlay" :class="{ visible: isVisible }">
    <!-- 自动补全建议 -->
    <div class="autocomplete-container" v-show="showAutocomplete">
      <div class="autocomplete-header">
        <span class="autocomplete-title">命令补全</span>
        <span class="autocomplete-hint">Tab 或 ↑↓ 选择</span>
      </div>
      <div
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion.command"
        :class="getSuggestionItemClass(suggestion, index)"
        @click="selectSuggestion(suggestion)"
      >
        <div class="suggestion-content">
          <span class="suggestion-icon">
            {{ getSuggestionIcon(suggestion) }}
          </span>
          <div class="suggestion-text">
            <!-- eslint-disable-next-line vue/no- -->
            <span class="command" v-html="highlightMatch(suggestion.command)"></span>
            <span class="description" v-if="suggestion.description">{{
              suggestion.description
            }}</span>
          </div>
        </div>
        <div class="suggestion-meta" v-if="suggestion.confidence">
          <span class="confidence">{{ Math.round(suggestion.confidence * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- 输入框容器 -->
    <div class="input-container">
      <div class="prompt">{{ prompt }}</div>
      <div class="input-wrapper">
        <input
          ref="inputRef"
          v-model="currentInput"
          type="text"
          class="terminal-input"
          :placeholder="placeholder"
          @keydown="handleKeyDown"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          spellcheck="false"
          autocomplete="off"
        />

        <!-- AI 加载指示器 -->
        <div class="ai-indicator" v-show="isAILoading">
          <div class="ai-spinner"></div>
          <span>AI思考中...</span>
        </div>

        <!-- 输入模式指示器 -->
        <div class="mode-indicator" v-if="mode">
          <span class="mode-badge" :class="mode">{{ modeText }}</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="input-controls">
        <button
          class="control-btn"
          @click="executeCommand"
          :disabled="!currentInput.trim() || isExecuting"
          title="执行命令 (Enter)"
        >
          <span v-if="!isExecuting">▶</span>
          <span v-else class="loading">⟳</span>
        </button>
        <button class="control-btn" @click="clearInput" title="清空输入 (Esc)">✕</button>
        <button
          class="control-btn ai-toggle"
          @click="toggleAICompletion"
          :class="{ active: aiEnabled }"
          :title="aiEnabled ? '禁用AI补全' : '启用AI补全'"
        >
          🤖
        </button>
      </div>
    </div>

    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import aiCompletionService from '../../ai-assistant/utils/aiCompletionService';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  connectionId: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    default: '$'
  },
  placeholder: {
    type: String,
    default: '输入命令或使用 AI 补全...'
  }
});

const emit = defineEmits(['execute-command', 'hide-input', 'show-notification']);

// 基础状态
const inputRef = ref(null);
const currentInput = ref('');
const isVisible = ref(false);
const isExecuting = ref(false);

// 自动补全状态
const showAutocomplete = ref(false);
const selectedIndex = ref(0);
const filteredSuggestions = ref([]);

// AI 补全状态
const aiEnabled = ref(true);
const isAILoading = ref(false);
const aiSuggestions = ref([]);
const aiServiceReady = ref(false);

// 传统补全状态
const traditionalCompletionActive = ref(false);

// 历史记录状态 (已禁用)
const commandHistory = ref([]);
const showHistory = ref(false);
const historyIndex = ref(-1);

// 输入模式
const mode = ref(''); // 'ai', 'normal', ''

// 本地命令数据库 (复用 TerminalInputBox 的数据)
const localCommands = [
  // 文件操作
  {
    command: 'ls',
    description: 'List directory contents',
    type: 'local',
    category: 'file',
    priority: 10
  },
  {
    command: 'ls -la',
    description: 'List all files including hidden ones',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'ls -lh',
    description: 'Display file sizes in human readable format',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'ls -lt',
    description: 'List files sorted by modification time',
    type: 'local',
    category: 'file',
    priority: 7
  },
  { command: 'cd', description: 'Change directory', type: 'local', category: 'file', priority: 10 },
  {
    command: 'pwd',
    description: 'Print working directory',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'mkdir',
    description: 'Create directory',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'mkdir -p',
    description: 'Create directory with parents',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'rm',
    description: 'Remove files or directories',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'rm -rf',
    description: 'Force remove directory and contents',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'cp',
    description: 'Copy files or directories',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'cp -r',
    description: 'Copy directories recursively',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'mv',
    description: 'Move/rename files or directories',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'touch',
    description: 'Create empty file or update timestamp',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'cat',
    description: 'Display file contents',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'cat -n',
    description: 'Display file contents with line numbers',
    type: 'local',
    category: 'file',
    priority: 6
  },
  {
    command: 'less',
    description: 'View file contents page by page',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'more',
    description: 'View file contents page by page (simple)',
    type: 'local',
    category: 'file',
    priority: 6
  },
  {
    command: 'head',
    description: 'Display first lines of file',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'head -n',
    description: 'Display first N lines of file',
    type: 'local',
    category: 'file',
    priority: 6
  },
  {
    command: 'tail',
    description: 'Display last lines of file',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'tail -f',
    description: 'Follow file content in real-time',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'tail -n',
    description: 'Display last N lines of file',
    type: 'local',
    category: 'file',
    priority: 6
  },
  {
    command: 'find',
    description: 'Search for files',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'find . -name',
    description: 'Find files by name',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'find . -type f',
    description: 'Find files only',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'find . -type d',
    description: 'Find directories only',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'grep',
    description: 'Search text patterns',
    type: 'local',
    category: 'file',
    priority: 10
  },
  {
    command: 'grep -r',
    description: 'Search recursively in directories',
    type: 'local',
    category: 'file',
    priority: 9
  },
  {
    command: 'grep -i',
    description: 'Search case-insensitively',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'chmod',
    description: 'Change file permissions',
    type: 'local',
    category: 'file',
    priority: 8
  },
  {
    command: 'chmod +x',
    description: 'Make file executable',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'chown',
    description: 'Change file owner',
    type: 'local',
    category: 'file',
    priority: 7
  },
  {
    command: 'tree',
    description: 'Display directory structure in tree format',
    type: 'local',
    category: 'file',
    priority: 8
  },
  { command: 'ln', description: 'Create links', type: 'local', category: 'file', priority: 6 },
  {
    command: 'ln -s',
    description: 'Create symbolic links',
    type: 'local',
    category: 'file',
    priority: 7
  },
  { command: 'wc', description: 'Word count', type: 'local', category: 'file', priority: 6 },
  {
    command: 'sort',
    description: 'Sort lines of text files',
    type: 'local',
    category: 'file',
    priority: 6
  },
  {
    command: 'uniq',
    description: 'Remove duplicate lines',
    type: 'local',
    category: 'file',
    priority: 6
  },

  // 系统信息
  {
    command: 'ps',
    description: 'Show running processes',
    type: 'local',
    category: 'system',
    priority: 9
  },
  {
    command: 'ps aux',
    description: 'Show all running processes',
    type: 'local',
    category: 'system',
    priority: 9
  },
  {
    command: 'ps -ef',
    description: 'Show all processes in full format',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'top',
    description: 'Display system processes',
    type: 'local',
    category: 'system',
    priority: 9
  },
  {
    command: 'htop',
    description: 'Interactive process viewer',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'kill',
    description: 'Terminate processes',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'kill -9',
    description: 'Force terminate processes',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'killall',
    description: 'Kill processes by name',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'df',
    description: 'Display disk usage',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'df -h',
    description: 'Display disk usage in human readable format',
    type: 'local',
    category: 'system',
    priority: 9
  },
  {
    command: 'du',
    description: 'Display directory sizes',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'du -h',
    description: 'Display directory sizes in human readable format',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'du -sh',
    description: 'Display directory summary size',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'free',
    description: 'Display memory usage',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'free -h',
    description: 'Display memory usage in human readable format',
    type: 'local',
    category: 'system',
    priority: 9
  },
  {
    command: 'uname',
    description: 'Display system information',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'uname -a',
    description: 'Display all system information',
    type: 'local',
    category: 'system',
    priority: 8
  },
  {
    command: 'sudo',
    description: 'Execute command as superuser',
    type: 'local',
    category: 'system',
    priority: 10
  },
  {
    command: 'whoami',
    description: 'Display current user',
    type: 'local',
    category: 'system',
    priority: 6
  },
  {
    command: 'id',
    description: 'Display user and group information',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'uptime',
    description: 'Show system uptime',
    type: 'local',
    category: 'system',
    priority: 6
  },
  {
    command: 'w',
    description: 'Show who is logged in and what they are doing',
    type: 'local',
    category: 'system',
    priority: 6
  },
  {
    command: 'lscpu',
    description: 'Display CPU information',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'lsblk',
    description: 'List block devices',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'lsusb',
    description: 'List USB devices',
    type: 'local',
    category: 'system',
    priority: 6
  },
  {
    command: 'lspci',
    description: 'List PCI devices',
    type: 'local',
    category: 'system',
    priority: 6
  },

  // 网络工具
  {
    command: 'ping',
    description: 'Test network connectivity',
    type: 'local',
    category: 'network',
    priority: 9
  },
  {
    command: 'ping -c',
    description: 'Send specific number of packets',
    type: 'local',
    category: 'network',
    priority: 8
  },
  {
    command: 'curl',
    description: 'Transfer data from servers',
    type: 'local',
    category: 'network',
    priority: 10
  },
  {
    command: 'curl -O',
    description: 'Download files from URL',
    type: 'local',
    category: 'network',
    priority: 8
  },
  {
    command: 'wget',
    description: 'Download files from web',
    type: 'local',
    category: 'network',
    priority: 9
  },
  {
    command: 'ssh',
    description: 'Connect to remote server',
    type: 'local',
    category: 'network',
    priority: 9
  },
  {
    command: 'scp',
    description: 'Secure copy files remotely',
    type: 'local',
    category: 'network',
    priority: 8
  },
  {
    command: 'rsync',
    description: 'Sync files remotely',
    type: 'local',
    category: 'network',
    priority: 8
  },
  {
    command: 'netstat',
    description: 'Display network connections',
    type: 'local',
    category: 'network',
    priority: 8
  },
  {
    command: 'netstat -tlnp',
    description: 'Show listening ports with processes',
    type: 'local',
    category: 'network',
    priority: 9
  },
  {
    command: 'ss',
    description: 'Socket statistics',
    type: 'local',
    category: 'network',
    priority: 7
  },
  {
    command: 'ip addr',
    description: 'Show IP addresses',
    type: 'local',
    category: 'network',
    priority: 9
  },
  {
    command: 'ip a',
    description: 'Show IP addresses (short)',
    type: 'local',
    category: 'network',
    priority: 8
  },
  {
    command: 'ifconfig',
    description: 'Configure network interfaces',
    type: 'local',
    category: 'network',
    priority: 7
  },
  {
    command: 'nslookup',
    description: 'DNS lookup utility',
    type: 'local',
    category: 'network',
    priority: 6
  },
  {
    command: 'dig',
    description: 'DNS lookup utility (detailed)',
    type: 'local',
    category: 'network',
    priority: 7
  },
  {
    command: 'host',
    description: 'DNS lookup utility',
    type: 'local',
    category: 'network',
    priority: 6
  },
  {
    command: 'traceroute',
    description: 'Trace network path',
    type: 'local',
    category: 'network',
    priority: 7
  },
  {
    command: 'telnet',
    description: 'Network protocol for remote connection',
    type: 'local',
    category: 'network',
    priority: 5
  },

  // Git 命令
  {
    command: 'git',
    description: 'Version control system',
    type: 'local',
    category: 'git',
    priority: 10
  },
  {
    command: 'git status',
    description: 'Show working tree status',
    type: 'local',
    category: 'git',
    priority: 10
  },
  {
    command: 'git add',
    description: 'Add files to staging area',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git add .',
    description: 'Add all files to staging area',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git commit',
    description: 'Record changes to repository',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git commit -m',
    description: 'Commit with message',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git commit -am',
    description: 'Add and commit with message',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git push',
    description: 'Push changes to remote repository',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git push origin',
    description: 'Push to origin branch',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git pull',
    description: 'Fetch from and merge with remote repository',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git fetch',
    description: 'Download objects and refs from repository',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git branch',
    description: 'List, create, or delete branches',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git branch -a',
    description: 'List all branches',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git checkout',
    description: 'Switch branches or restore working tree files',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git checkout -b',
    description: 'Create and switch to new branch',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git merge',
    description: 'Join branches together',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git log',
    description: 'Show commit logs',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git log --oneline',
    description: 'Show compact commit logs',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git diff',
    description: 'Show changes between commits',
    type: 'local',
    category: 'git',
    priority: 8
  },
  {
    command: 'git diff --staged',
    description: 'Show staged changes',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git clone',
    description: 'Clone a repository',
    type: 'local',
    category: 'git',
    priority: 9
  },
  {
    command: 'git init',
    description: 'Initialize repository',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git remote',
    description: 'Manage remote repositories',
    type: 'local',
    category: 'git',
    priority: 6
  },
  {
    command: 'git stash',
    description: 'Stash changes in a dirty working directory',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git reset',
    description: 'Reset current HEAD to specified state',
    type: 'local',
    category: 'git',
    priority: 7
  },
  {
    command: 'git revert',
    description: 'Revert commits',
    type: 'local',
    category: 'git',
    priority: 6
  },

  // 包管理器
  {
    command: 'apt-get',
    description: 'Debian/Ubuntu package manager',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'apt-get update',
    description: 'Update package lists',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'apt-get upgrade',
    description: 'Upgrade installed packages',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'apt-get install',
    description: 'Install packages',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'apt-get remove',
    description: 'Remove packages',
    type: 'local',
    category: 'package',
    priority: 7
  },
  {
    command: 'apt-cache search',
    description: 'Search packages',
    type: 'local',
    category: 'package',
    priority: 7
  },
  {
    command: 'apt',
    description: 'Modern Debian/Ubuntu package manager',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'apt install',
    description: 'Install packages (modern)',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'apt search',
    description: 'Search packages (modern)',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'yum',
    description: 'RHEL/CentOS package manager',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'yum install',
    description: 'Install packages with yum',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'yum update',
    description: 'Update packages with yum',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'dnf',
    description: 'Modern RHEL package manager',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'dnf install',
    description: 'Install packages with dnf',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'npm',
    description: 'Node.js package manager',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'npm install',
    description: 'Install npm packages',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'npm install -g',
    description: 'Install npm packages globally',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'npm run',
    description: 'Run npm scripts',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'npm start',
    description: 'Start npm application',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'npm build',
    description: 'Build npm application',
    type: 'local',
    category: 'package',
    priority: 7
  },
  {
    command: 'yarn',
    description: 'Alternative Node.js package manager',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'yarn install',
    description: 'Install yarn packages',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'yarn add',
    description: 'Add yarn packages',
    type: 'local',
    category: 'package',
    priority: 7
  },
  {
    command: 'pip',
    description: 'Python package manager',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'pip install',
    description: 'Install Python packages',
    type: 'local',
    category: 'package',
    priority: 9
  },
  {
    command: 'pip3',
    description: 'Python 3 package manager',
    type: 'local',
    category: 'package',
    priority: 8
  },
  {
    command: 'pip3 install',
    description: 'Install Python 3 packages',
    type: 'local',
    category: 'package',
    priority: 8
  },

  // 系统服务
  {
    command: 'systemctl',
    description: 'Control systemd services',
    type: 'local',
    category: 'service',
    priority: 9
  },
  {
    command: 'systemctl start',
    description: 'Start a service',
    type: 'local',
    category: 'service',
    priority: 9
  },
  {
    command: 'systemctl stop',
    description: 'Stop a service',
    type: 'local',
    category: 'service',
    priority: 9
  },
  {
    command: 'systemctl restart',
    description: 'Restart a service',
    type: 'local',
    category: 'service',
    priority: 9
  },
  {
    command: 'systemctl status',
    description: 'Show service status',
    type: 'local',
    category: 'service',
    priority: 10
  },
  {
    command: 'systemctl enable',
    description: 'Enable service to start on boot',
    type: 'local',
    category: 'service',
    priority: 8
  },
  {
    command: 'systemctl disable',
    description: 'Disable service',
    type: 'local',
    category: 'service',
    priority: 8
  },
  {
    command: 'systemctl list-units',
    description: 'List all services',
    type: 'local',
    category: 'service',
    priority: 7
  },
  {
    command: 'service',
    description: 'Run system services (legacy)',
    type: 'local',
    category: 'service',
    priority: 7
  },
  {
    command: 'journalctl',
    description: 'Query systemd journal logs',
    type: 'local',
    category: 'service',
    priority: 8
  },
  {
    command: 'journalctl -f',
    description: 'Follow journal logs in real-time',
    type: 'local',
    category: 'service',
    priority: 7
  },

  // 文本处理
  {
    command: 'echo',
    description: 'Display a line of text',
    type: 'local',
    category: 'text',
    priority: 8
  },
  {
    command: 'printf',
    description: 'Format and print data',
    type: 'local',
    category: 'text',
    priority: 6
  },
  {
    command: 'sed',
    description: 'Stream editor for filtering and transforming text',
    type: 'local',
    category: 'text',
    priority: 7
  },
  {
    command: 'awk',
    description: 'Pattern scanning and processing language',
    type: 'local',
    category: 'text',
    priority: 7
  },
  {
    command: 'cut',
    description: 'Remove sections from each line of files',
    type: 'local',
    category: 'text',
    priority: 6
  },
  {
    command: 'tr',
    description: 'Translate or delete characters',
    type: 'local',
    category: 'text',
    priority: 6
  },
  {
    command: 'paste',
    description: 'Merge lines of files',
    type: 'local',
    category: 'text',
    priority: 5
  },
  {
    command: 'split',
    description: 'Split a file into pieces',
    type: 'local',
    category: 'text',
    priority: 5
  },

  // 压缩和解压
  {
    command: 'tar',
    description: 'Archive utility',
    type: 'local',
    category: 'archive',
    priority: 8
  },
  {
    command: 'tar -czf',
    description: 'Create gzipped tar archive',
    type: 'local',
    category: 'archive',
    priority: 8
  },
  {
    command: 'tar -xzf',
    description: 'Extract gzipped tar archive',
    type: 'local',
    category: 'archive',
    priority: 8
  },
  {
    command: 'zip',
    description: 'Compress files',
    type: 'local',
    category: 'archive',
    priority: 7
  },
  {
    command: 'unzip',
    description: 'Extract zip files',
    type: 'local',
    category: 'archive',
    priority: 7
  },
  {
    command: 'gzip',
    description: 'Compress files',
    type: 'local',
    category: 'archive',
    priority: 6
  },
  {
    command: 'gunzip',
    description: 'Decompress files',
    type: 'local',
    category: 'archive',
    priority: 6
  },

  // 其他常用命令
  {
    command: 'clear',
    description: 'Clear terminal screen',
    type: 'local',
    category: 'utility',
    priority: 9
  },
  {
    command: 'history',
    description: 'Display command history',
    type: 'local',
    category: 'utility',
    priority: 7
  },
  {
    command: 'man',
    description: 'Display manual pages',
    type: 'local',
    category: 'utility',
    priority: 8
  },
  {
    command: 'which',
    description: 'Locate a command',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'whereis',
    description: 'Locate the binary, source, and manual page files for a command',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'type',
    description: 'Display information about command type',
    type: 'local',
    category: 'utility',
    priority: 5
  },
  {
    command: 'alias',
    description: 'Create command aliases',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'unalias',
    description: 'Remove command aliases',
    type: 'local',
    category: 'utility',
    priority: 5
  },
  {
    command: 'date',
    description: 'Display or set the system date and time',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'cal',
    description: 'Display calendar',
    type: 'local',
    category: 'utility',
    priority: 5
  },
  { command: 'exit', description: 'Exit shell', type: 'local', category: 'utility', priority: 8 },
  {
    command: 'logout',
    description: 'Log out from current session',
    type: 'local',
    category: 'utility',
    priority: 7
  },
  {
    command: 'reboot',
    description: 'Reboot the system',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'shutdown',
    description: 'Shutdown the system',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'poweroff',
    description: 'Power off system',
    type: 'local',
    category: 'system',
    priority: 7
  },
  {
    command: 'sleep',
    description: 'Delay for specified time',
    type: 'local',
    category: 'utility',
    priority: 5
  },
  {
    command: 'watch',
    description: 'Execute command periodically',
    type: 'local',
    category: 'utility',
    priority: 7
  },
  {
    command: 'crontab',
    description: 'Schedule periodic tasks',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'screen',
    description: 'Terminal multiplexer',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'tmux',
    description: 'Terminal multiplexer',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  { command: 'vim', description: 'Text editor', type: 'local', category: 'editor', priority: 8 },
  { command: 'vi', description: 'Text editor', type: 'local', category: 'editor', priority: 7 },
  { command: 'nano', description: 'Text editor', type: 'local', category: 'editor', priority: 8 },
  { command: 'emacs', description: 'Text editor', type: 'local', category: 'editor', priority: 6 },
  {
    command: 'code',
    description: 'Visual Studio Code',
    type: 'local',
    category: 'editor',
    priority: 7
  },
  {
    command: 'nohup',
    description: 'Run command immune to hangups',
    type: 'local',
    category: 'utility',
    priority: 6
  },
  {
    command: 'bg',
    description: 'Run jobs in background',
    type: 'local',
    category: 'utility',
    priority: 5
  },
  {
    command: 'fg',
    description: 'Run jobs in foreground',
    type: 'local',
    category: 'utility',
    priority: 5
  },
  {
    command: 'jobs',
    description: 'Display active jobs',
    type: 'local',
    category: 'utility',
    priority: 6
  }
];

// 计算属性
const modeText = computed(() => {
  switch (mode.value) {
    case 'ai':
      return 'AI';
    case 'normal':
      return '普通';
    default:
      return '';
  }
});

// 方法
const show = () => {
  isVisible.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const hide = () => {
  isVisible.value = false;
  showAutocomplete.value = false;
  showHistory.value = false;
  currentInput.value = '';
  emit('hide-input');
};

const focus = () => {
  inputRef.value?.focus();
};

// 过滤建议
const filterSuggestions = async input => {
  if (!input || input.trim().length < 1) {
    filteredSuggestions.value = [];
    showAutocomplete.value = false;
    traditionalCompletionActive.value = false;
    return;
  }

  const trimmedInput = input.trim().toLowerCase();

  // 传统补全：本地命令匹配 (立即显示)
  const localMatches = localCommands
    .map(cmd => {
      const command = cmd.command.toLowerCase();
      let score = 0;
      let matchType = 'none';

      // 精确匹配整个命令
      if (command === trimmedInput) {
        score = 1.0;
        matchType = 'exact';
      }
      // 命令开头匹配
      else if (command.startsWith(trimmedInput)) {
        score = 0.95;
        matchType = 'prefix';
      }
      // 包含匹配
      else if (command.includes(trimmedInput)) {
        score = 0.7;
        matchType = 'contains';
      }
      // 模糊匹配
      else {
        score = calculateFuzzyScore(trimmedInput, command);
        matchType = score > 0.3 ? 'fuzzy' : 'none';
      }

      // 根据优先级调整分数
      if (cmd.priority) {
        score = score * (0.8 + cmd.priority / 50);
      }

      return {
        ...cmd,
        confidence: score,
        matchType,
        type: 'traditional' // 标记为传统补全
      };
    })
    .filter(cmd => cmd.confidence > 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  // 立即显示传统补全结果
  filteredSuggestions.value = localMatches;
  selectedIndex.value = 0;
  showAutocomplete.value = localMatches.length > 0;
  traditionalCompletionActive.value = true;

  // AI 建议获取 (异步，在后台进行)
  if (aiEnabled.value && aiServiceReady.value && trimmedInput.length > 2) {
    getAISuggestions(trimmedInput).then(aiMatches => {
      // 如果仍有输入且AI服务可用，合并AI建议
      if (currentInput.value.trim() === trimmedInput && aiMatches.length > 0) {
        const allSuggestions = [...localMatches, ...aiMatches]
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 8);

        filteredSuggestions.value = allSuggestions;
        traditionalCompletionActive.value = false;
      }
    }).catch(error => {
      console.warn('AI建议获取失败，继续使用传统补全:', error);
      // 保持传统补全显示
    });
  }
};

// 计算模糊匹配分数
const calculateFuzzyScore = (input, command) => {
  if (input.length === 0 || command.length === 0) return 0;

  let inputIndex = 0;
  let commandIndex = 0;
  let matches = 0;

  while (inputIndex < input.length && commandIndex < command.length) {
    if (input[inputIndex] === command[commandIndex]) {
      matches++;
      inputIndex++;
    }
    commandIndex++;
  }

  const matchRatio = matches / input.length;
  const lengthPenalty = Math.min(1, input.length / command.length);

  return matchRatio * lengthPenalty * 0.6;
};

// AI 补全建议获取
const getAISuggestions = async input => {
  if (!aiEnabled.value || !aiServiceReady.value) return [];

  try {
    isAILoading.value = true;

    // 构建上下文信息
    const context = {
      currentDirectory: '', // 可以从父组件传入当前目录
      recentCommands: [], // 历史记录已禁用
      connectionId: props.connectionId
    };

    // 调用AI补全服务
    const suggestions = await aiCompletionService.getCommandSuggestions(input, context);

    return suggestions.map(suggestion => ({
      ...suggestion,
      type: 'ai'
    }));
  } catch (error) {
    console.warn('获取AI建议失败，继续使用传统补全:', error);
    return [];
  } finally {
    isAILoading.value = false;
  }
};

// 选择建议
const selectSuggestion = suggestion => {
  currentInput.value = suggestion.command;
  showAutocomplete.value = false;
  selectedIndex.value = 0;
  focus();
};


// 执行命令
const executeCommand = async () => {
  const command = currentInput.value.trim();
  if (!command) return;

  isExecuting.value = true;

  // 发送执行事件
  emit('execute-command', command);

  // 清空输入
  currentInput.value = '';
  showAutocomplete.value = false;
  showHistory.value = false;
  historyIndex.value = -1;

  isExecuting.value = false;
  focus();
};

// 清空输入
const clearInput = () => {
  currentInput.value = '';
  showAutocomplete.value = false;
  showHistory.value = false;
  historyIndex.value = -1;
  focus();
};

// 切换AI补全
const toggleAICompletion = () => {
  aiEnabled.value = !aiEnabled.value;
  emit('show-notification', {
    type: 'info',
    message: aiEnabled.value ? 'AI补全已启用' : 'AI补全已禁用'
  });

  // 重新过滤建议
  if (currentInput.value) {
    filterSuggestions(currentInput.value);
  }
};


// 工具方法
const getSuggestionItemClass = (suggestion, index) => {
  return [
    'suggestion-item',
    {
      active: index === selectedIndex.value,
      'ai-suggestion': suggestion.type === 'ai',
      'traditional-suggestion': suggestion.type === 'traditional',
      'local-suggestion': suggestion.type === 'local'
    }
  ];
};

const getSuggestionIcon = suggestion => {
  if (suggestion.type === 'ai') return '🤖';
  if (suggestion.type === 'traditional') return '⚡';
  if (suggestion.category === 'git') return '📦';
  if (suggestion.category === 'network') return '🌐';
  if (suggestion.category === 'system') return '⚙️';
  if (suggestion.category === 'file') return '📁';
  if (suggestion.category === 'package') return '📦';
  if (suggestion.category === 'service') return '🔧';
  if (suggestion.category === 'editor') return '📝';
  return '📋';
};

const highlightMatch = command => {
  if (!currentInput.value.trim()) return command;

  const regex = new RegExp(`(${currentInput.value.trim()})`, 'gi');
  return command.replace(regex, '<mark>$1</mark>');
};

// 事件处理
const handleInput = event => {
  if (event.target.value) {
    filterSuggestions(event.target.value);
  } else {
    showAutocomplete.value = false;
    traditionalCompletionActive.value = false;
  }
};

const handleKeyDown = async event => {
  const key = event.key;

  // 自动补全导航
  if (showAutocomplete.value && filteredSuggestions.value.length > 0) {
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex.value = (selectedIndex.value + 1) % filteredSuggestions.value.length;
        return;

      case 'ArrowUp':
        event.preventDefault();
        selectedIndex.value =
          selectedIndex.value === 0
            ? filteredSuggestions.value.length - 1
            : selectedIndex.value - 1;
        return;

      case 'Tab':
        event.preventDefault();
        if (filteredSuggestions.value.length > 0) {
          selectSuggestion(filteredSuggestions.value[selectedIndex.value]);
        }
        return;

      case 'Enter':
        event.preventDefault();
        selectSuggestion(filteredSuggestions.value[selectedIndex.value]);
        return;

      case 'Escape':
        event.preventDefault();
        showAutocomplete.value = false;
        selectedIndex.value = 0;
        return;
    }
  }

  
  // 普通按键处理
  switch (key) {
    case 'Enter':
      event.preventDefault();
      if (!event.shiftKey) {
        executeCommand();
      }
      break;

    case 'Escape':
      event.preventDefault();
      if (showAutocomplete.value) {
        showAutocomplete.value = false;
        selectedIndex.value = 0;
        traditionalCompletionActive.value = false;
      } else {
        hide();
      }
      break;

    case 'Tab':
      if (!showAutocomplete.value) {
        event.preventDefault();
        // 手动触发自动补全
        if (currentInput.value) {
          filterSuggestions(currentInput.value);
        }
      }
      break;

    case 'F1':
      event.preventDefault();
      mode.value = mode.value === 'ai' ? '' : 'ai';
      break;

    case 'F2':
      event.preventDefault();
      toggleAICompletion();
      break;
  }
};

const handleFocus = () => {
  mode.value = aiEnabled.value ? 'ai' : 'normal';
};

const handleBlur = () => {
  // 延迟隐藏，允许点击建议项
  setTimeout(() => {
    if (document.activeElement !== inputRef.value) {
      showAutocomplete.value = false;
      traditionalCompletionActive.value = false;
      mode.value = '';
    }
  }, 200);
};

// 组件挂载时初始化AI服务
onMounted(async () => {
  try {
    await aiCompletionService.initialize();
    aiServiceReady.value = true;
    console.log('✅ AI补全服务已就绪');
  } catch (error) {
    console.warn('AI completion service initialization failed:', error);
    aiServiceReady.value = false;
    console.log('ℹ️ 将使用传统补全功能');
  }
});

// 监听器
watch(
  () => props.isVisible,
  visible => {
    isVisible.value = visible;
    if (visible) {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);

// 暴露方法
defineExpose({
  show,
  hide,
  focus,
  clear: clearInput,
  getContextualSuggestions: () =>
    aiCompletionService.getContextualSuggestions({
      currentDirectory: '',
      recentCommands: [],
      connectionId: props.connectionId
    })
});
</script>

<style lang="scss" scoped>
.terminal-input-overlay {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  z-index: 10000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;

  &.visible {
    opacity: 1;
    visibility: visible;
  }
}

// 自动补全容器
.autocomplete-container {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 8px 8px 0 0;
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  margin-bottom: 2px;
  max-height: 240px;
  overflow-y: auto;

  .autocomplete-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid #444;

    .autocomplete-title {
      color: #74c0fc;
      font-size: 12px;
      font-weight: 600;
    }

    .autocomplete-hint {
      color: #868e96;
      font-size: 11px;
    }
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover,
    &.active {
      background: rgba(116, 192, 252, 0.1);
    }

    &.ai-suggestion {
      border-left: 3px solid #0066cc;
    }

    &.local-suggestion {
      border-left: 3px solid #51cf66;
    }

    &.traditional-suggestion {
      border-left: 3px solid #ffd43b;
    }

    .suggestion-content {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;

      .suggestion-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      .suggestion-text {
        flex: 1;

        .command {
          display: block;
          color: #fff;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 2px;

          :deep(mark) {
            background: rgba(116, 192, 252, 0.3);
            color: #74c0fc;
            padding: 1px 2px;
            border-radius: 2px;
          }
        }

        .description {
          display: block;
          color: #868e96;
          font-size: 11px;
          line-height: 1.3;
        }
      }
    }

    .suggestion-meta {
      .confidence {
        background: rgba(116, 192, 252, 0.2);
        color: #74c0fc;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
    }
  }
}


// 输入容器
.input-container {
  display: flex;
  align-items: center;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

  .prompt {
    color: #74c0fc;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    font-weight: bold;
    margin-right: 12px;
    white-space: nowrap;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;

    .terminal-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #fff;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      outline: none;
      padding: 8px 0;

      &::placeholder {
        color: #868e96;
      }
    }

    .ai-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 12px;
      color: #74c0fc;
      font-size: 12px;

      .ai-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(116, 192, 252, 0.3);
        border-top: 2px solid #74c0fc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    .mode-indicator {
      margin-left: 12px;

      .mode-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        text-transform: uppercase;

        &.ai {
          background: rgba(116, 192, 252, 0.2);
          color: #74c0fc;
        }

        &.normal {
          background: rgba(81, 207, 102, 0.2);
          color: #51cf66;
        }
      }
    }
  }

  .input-controls {
    display: flex;
    gap: 8px;
    margin-left: 12px;

    .control-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.ai-toggle {
        &.active {
          background: rgba(116, 192, 252, 0.3);
          color: #74c0fc;
        }
      }

      .loading {
        animation: spin 1s linear infinite;
      }
    }
  }
}

// 动画
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 自定义滚动条
.autocomplete-container {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;

    &:hover {
      background: #777;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .terminal-input-overlay {
    width: 95%;
    bottom: 10px;
  }

  .input-container {
    padding: 10px;

    .prompt {
      font-size: 12px;
      margin-right: 8px;
    }

    .terminal-input {
      font-size: 12px;
    }

    .input-controls {
      gap: 6px;

      .control-btn {
        width: 28px;
        height: 28px;
        font-size: 11px;
      }
    }
  }

  .suggestion-item {
    padding: 8px 10px;
  }
}
</style>
