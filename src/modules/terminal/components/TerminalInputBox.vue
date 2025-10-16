<template>
  <!-- eslint-disable vue/no- -->
  <div class="terminal-input-box" :class="{ focused: isFocused }">
    <!-- 输入框容器 -->
    <div class="input-container">
      <!-- 提示符 -->
      <div class="prompt-symbol">$</div>

      <!-- 主输入框 -->
      <textarea
        ref="commandInput"
        v-model="currentCommand"
        class="command-input"
        :placeholder="placeholder"
        @keydown="handleKeyDown"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        autocomplete="off"
        spellcheck="false"
        rows="1"
        :style="{ height: textareaHeight + 'px' }"
      ></textarea>

      <!-- 发送按钮 -->
      <button
        class="send-button"
        @click="executeCommand"
        :disabled="!currentCommand.trim()"
        title="执行命令 (Enter)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>

    <!-- 自动补全建议 -->
    <div
      v-show="showSuggestions && suggestions.length > 0"
      class="suggestions-dropdown"
      :style="suggestionsDropdownStyle"
    >
      <div class="suggestions-header">
        <span class="suggestions-title">{{ suggestionsTitle }}</span>
        <span class="suggestions-count">{{ suggestions.length }} 个建议</span>
      </div>

      <div
        v-for="(suggestion, index) in suggestions"
        :key="`${suggestion.command}-${index}`"
        :class="getSuggestionItemClass(suggestion, index)"
        @click="applySuggestion(suggestion)"
        @mouseenter="selectedSuggestionIndex = index"
      >
        <div class="suggestion-content">
          <span class="suggestion-icon">
            {{ getSuggestionIcon(suggestion) }}
          </span>
          <div class="suggestion-text">
            <!-- eslint-disable-next-line vue/no- -->
            <span class="command" ="highlightMatch(suggestion.command)"></span>
            <span class="description" v-if="suggestion.description">{{
              suggestion.description
            }}</span>
            <span class="category-badge" v-if="suggestion.category">{{
              getCategoryLabel(suggestion.category)
            }}</span>
          </div>
        </div>
        <div class="suggestion-meta">
          <span class="confidence" v-if="suggestion.confidence"
            >{{ Math.round(suggestion.confidence * 100) }}%</span
          >
          <span class="match-type" v-if="suggestion.matchType">{{
            getMatchTypeLabel(suggestion.matchType)
          }}</span>
        </div>
      </div>
    </div>

    <!-- AI状态指示器 -->
    <div class="ai-status" v-if="showAIStatus">
      <div class="ai-loading" v-if="isAILoading">
        <div class="ai-spinner"></div>
        <span>AI思考中...</span>
      </div>
      <div class="ai-enabled" v-else-if="aiEnabled">
        <span class="ai-indicator active"></span>
        <span>AI补全已启用</span>
      </div>
      <div class="ai-disabled" v-else>
        <span class="ai-indicator"></span>
        <span>AI补全已禁用</span>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div class="shortcuts-hint" v-if="showHints">
      <span class="hint-item">Tab 补全</span>
      <span class="hint-item">↑↓ 选择</span>
      <span class="hint-item">Esc 取消</span>
      <span class="hint-item">Ctrl+Space 显示建议</span>
      <span class="hint-item">F4 切换AI</span>
      <span class="hint-item">Shift+Enter 换行</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import aiCompletionService from '../../ai-assistant/utils/aiCompletionService.js';

// Props
const props = defineProps({
  connectionId: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: '输入命令...'
  },
  showHints: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['execute-command', 'show-notification']);

// 组件状态
const commandInput = ref(null);
const currentCommand = ref('');
const isFocused = ref(false);
const isComposing = ref(false);
const commandHistory = ref([]);
const historyIndex = ref(-1);
const textareaHeight = ref(32); // 初始高度
const minHeight = 32;
const maxHeight = 120;

// 补全相关状态
const showSuggestions = ref(false);
const suggestions = ref([]);
const selectedSuggestionIndex = ref(0);
const aiEnabled = ref(true);
const isAILoading = ref(false);
const showAIStatus = ref(false);
const suggestionsTitle = ref('命令补全');
const debounceTimer = ref(null);

// 计算属性
const suggestionsDropdownStyle = computed(() => ({
  maxHeight: suggestions.value.length > 6 ? '240px' : 'auto',
  overflowY: suggestions.value.length > 6 ? 'auto' : 'visible'
}));

// 增强的本地命令数据库，包含更多实用命令和分类
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

// 智能补全方法
const filterSuggestions = async input => {
  console.log(`🔍 [TerminalInputBox] 开始过滤建议，输入: "${input}"`);

  if (!input || input.trim().length < 1) {
    suggestions.value = [];
    showSuggestions.value = false;
    console.log(`📝 [TerminalInputBox] 输入为空，隐藏建议`);
    return;
  }

  const trimmedInput = input.trim().toLowerCase();
  console.log(`📝 [TerminalInputBox] 处理输入: "${trimmedInput}"`);

  // 增强的本地命令匹配算法
  const localMatches = localCommands
    .map(cmd => {
      const command = cmd.command.toLowerCase();
      const inputWords = trimmedInput.split(/\s+/);
      const commandWords = command.split(/\s+/);

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
      // 单词开头匹配
      else if (inputWords.every(word => commandWords.some(cmdWord => cmdWord.startsWith(word)))) {
        score = 0.85;
        matchType = 'word-prefix';
      }
      // 包含匹配
      else if (command.includes(trimmedInput)) {
        score = 0.7;
        matchType = 'contains';
      }
      // 模糊匹配 - 基于字符序列
      else {
        score = calculateFuzzyScore(trimmedInput, command);
        matchType = score > 0.3 ? 'fuzzy' : 'none';
      }

      // 根据优先级调整分数
      if (cmd.priority) {
        score = score * (0.8 + cmd.priority / 50);
      }

      // 根据使用频率调整（如果有历史记录）
      const usageBonus = getUsageBonus(cmd.command);
      score = Math.min(1.0, score + usageBonus);

      return {
        ...cmd,
        confidence: score,
        matchType,
        originalCommand: cmd.command
      };
    })
    .filter(cmd => cmd.confidence > 0.3) // 过滤低分匹配
    .sort((a, b) => {
      // 首先按置信度排序
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // 然后按优先级排序
      if (b.priority !== a.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      // 最后按命令长度排序（短的优先）
      return a.command.length - b.command.length;
    });

  console.log(`📋 [TerminalInputBox] 本地匹配结果: ${localMatches.length} 个`);

  // AI 建议获取
  let aiMatches = [];
  if (aiEnabled.value && trimmedInput.length > 1) {
    try {
      isAILoading.value = true;
      showAIStatus.value = true;
      console.log(`🤖 [TerminalInputBox] 开始获取AI建议...`);

      const context = {
        currentDirectory: '', // 可以从父组件传递
        recentCommands: commandHistory.value.slice(-5),
        connectionId: props.connectionId,
        inputType: detectInputType(trimmedInput)
      };

      aiMatches = await aiCompletionService.getCommandSuggestions(trimmedInput, context);
      aiMatches = aiMatches.map(suggestion => ({
        ...suggestion,
        type: 'ai',
        confidence: suggestion.confidence || 0.7
      }));

      console.log(`🤖 [TerminalInputBox] AI建议获取完成: ${aiMatches.length} 个`);
    } catch (error) {
      console.error('❌ [TerminalInputBox] 获取AI建议失败:', error);
    } finally {
      isAILoading.value = false;
    }
  }

  // 智能合并和去重
  const mergedSuggestions = mergeSuggestions(localMatches, aiMatches);

  // 限制建议数量并保持多样性
  const finalSuggestions = ensureDiversity(mergedSuggestions, 8);

  suggestions.value = finalSuggestions;
  selectedSuggestionIndex.value = 0;
  showSuggestions.value = finalSuggestions.length > 0;

  console.log(
    `✅ [TerminalInputBox] 建议处理完成: ${finalSuggestions.length} 个，显示: ${showSuggestions.value}`
  );

  // 更新标题
  const aiCount = finalSuggestions.filter(s => s.type === 'ai').length;
  if (aiCount > 0) {
    suggestionsTitle.value = `🤖 AI + 本地补全 (${aiCount}个AI建议)`;
  } else {
    suggestionsTitle.value = '📋 本地补全';
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

  // 基于匹配字符数的比例计算分数
  const matchRatio = matches / input.length;
  const lengthPenalty = Math.min(1, input.length / command.length);

  return matchRatio * lengthPenalty * 0.6;
};

// 获取使用频率奖励
const getUsageBonus = command => {
  const recentCommands = commandHistory.value.slice(-20);
  const usageCount = recentCommands.filter(
    cmd => cmd.startsWith(command) || command.startsWith(cmd)
  ).length;

  return Math.min(0.2, usageCount * 0.02);
};

// 检测输入类型
const detectInputType = input => {
  if (input.includes('git')) return 'git';
  if (input.includes('npm') || input.includes('yarn') || input.includes('pip')) return 'package';
  if (input.includes('systemctl') || input.includes('service')) return 'service';
  if (['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv'].some(cmd => input.includes(cmd)))
    return 'file';
  if (['ping', 'curl', 'wget', 'ssh', 'scp'].some(cmd => input.includes(cmd))) return 'network';
  return 'general';
};

// 智能合并建议
const mergeSuggestions = (localMatches, aiMatches) => {
  const merged = [...localMatches];

  // 添加AI建议，避免重复
  aiMatches.forEach(aiSuggestion => {
    const duplicate = merged.find(
      local => local.command.toLowerCase() === aiSuggestion.command.toLowerCase()
    );

    if (duplicate) {
      // 如果有重复，提升置信度并标记为混合建议
      duplicate.confidence = Math.max(duplicate.confidence, aiSuggestion.confidence);
      duplicate.type = 'hybrid';
      duplicate.originalType = duplicate.originalType || 'local';
    } else {
      merged.push(aiSuggestion);
    }
  });

  return merged;
};

// 确保建议多样性
const ensureDiversity = (suggestions, maxCount) => {
  if (suggestions.length <= maxCount) return suggestions;

  const diverse = [];
  const usedCategories = new Set();

  // 首先添加不同类别的最高分建议
  for (const suggestion of suggestions) {
    if (diverse.length >= maxCount) break;

    const category = suggestion.category || 'general';
    if (!usedCategories.has(category) || diverse.length < maxCount / 2) {
      diverse.push(suggestion);
      usedCategories.add(category);
    }
  }

  // 如果还有空间，添加剩余的最高分建议
  if (diverse.length < maxCount) {
    const remaining = suggestions.filter(s => !diverse.includes(s));
    diverse.push(...remaining.slice(0, maxCount - diverse.length));
  }

  return diverse;
};

// 应用建议
const applySuggestion = suggestion => {
  console.log(`🎯 [TerminalInputBox] 应用建议: "${suggestion.command}"`);
  currentCommand.value = suggestion.command;
  showSuggestions.value = false;
  commandInput.value?.focus();
};

// 高亮匹配文本
const highlightMatch = command => {
  if (!currentCommand.value.trim()) return command;

  const regex = new RegExp(`(${currentCommand.value.trim()})`, 'gi');
  return command.replace(regex, '<mark>$1</mark>');
};

// 导航建议
const navigateSuggestions = direction => {
  if (!showSuggestions.value || suggestions.value.length === 0) return;

  if (direction === 'down') {
    selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % suggestions.value.length;
  } else if (direction === 'up') {
    selectedSuggestionIndex.value =
      selectedSuggestionIndex.value === 0
        ? suggestions.value.length - 1
        : selectedSuggestionIndex.value - 1;
  }
};

// 隐藏建议
const hideSuggestions = () => {
  showSuggestions.value = false;
  selectedSuggestionIndex.value = 0;
};

// 切换AI
const toggleAI = () => {
  aiEnabled.value = !aiEnabled.value;
  showAIStatus.value = true;
  setTimeout(() => {
    showAIStatus.value = false;
  }, 2000);

  emit('show-notification', {
    type: 'info',
    message: aiEnabled.value ? 'AI补全已启用' : 'AI补全已禁用'
  });

  // 重新过滤建议
  if (currentCommand.value) {
    filterSuggestions(currentCommand.value);
  }
};

// 执行命令
const executeCommand = () => {
  const command = currentCommand.value.trim();
  if (!command) return;

  console.log(`🚀 [TerminalInputBox] 执行命令: "${command}"`);

  // 添加到历史记录
  if (!commandHistory.value.includes(command)) {
    commandHistory.value.push(command);
    // 限制历史记录数量
    if (commandHistory.value.length > 100) {
      commandHistory.value = commandHistory.value.slice(-100);
    }
  }

  historyIndex.value = -1;

  // 发送命令到父组件
  emit('execute-command', command);

  // 清空输入框
  currentCommand.value = '';
  hideSuggestions();
};

// 键盘事件处理
const handleKeyDown = event => {
  console.log(
    `⌨️ [TerminalInputBox] 键盘事件: ${event.key}, Ctrl: ${event.ctrlKey}, Alt: ${event.altKey}, Shift: ${event.shiftKey}`
  );

  // 处理组合键
  if (event.ctrlKey || event.altKey) {
    switch (event.key) {
      case ' ':
        // Ctrl+Space 显示/隐藏补全
        event.preventDefault();
        if (showSuggestions.value) {
          hideSuggestions();
        } else {
          filterSuggestions(currentCommand.value);
        }
        break;

      case 'ArrowUp':
        // Ctrl+↑ 浏览历史
        event.preventDefault();
        navigateHistory('up');
        break;

      case 'ArrowDown':
        // Ctrl+↓ 浏览历史
        event.preventDefault();
        navigateHistory('down');
        break;
    }
    return;
  }

  switch (event.key) {
    case 'Enter':
      // Shift+Enter 允许换行，普通Enter执行命令
      if (event.shiftKey) {
        // 允许换行，不阻止默认行为
        return;
      } else {
        event.preventDefault();
        if (showSuggestions.value && suggestions.value.length > 0) {
          applySuggestion(suggestions.value[selectedSuggestionIndex.value]);
        } else {
          executeCommand();
        }
      }
      break;

    case 'Tab':
      event.preventDefault();
      if (showSuggestions.value && suggestions.value.length > 0) {
        applySuggestion(suggestions.value[selectedSuggestionIndex.value]);
      } else {
        filterSuggestions(currentCommand.value);
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (showSuggestions.value) {
        navigateSuggestions('up');
      } else {
        navigateHistory('up');
      }
      break;

    case 'ArrowDown':
      event.preventDefault();
      if (showSuggestions.value) {
        navigateSuggestions('down');
      } else {
        navigateHistory('down');
      }
      break;

    case 'Escape':
      event.preventDefault();
      hideSuggestions();
      break;

    case 'F4':
      event.preventDefault();
      toggleAI();
      break;

    case 'l':
      if (event.ctrlKey) {
        event.preventDefault();
        // Ctrl+L 清空输入
        currentCommand.value = '';
        hideSuggestions();
      }
      break;
  }
};

// 自动调整textarea高度
const adjustTextareaHeight = () => {
  nextTick(() => {
    if (commandInput.value) {
      // 重置高度以获取正确的scrollHeight
      commandInput.value.style.height = 'auto';

      // 计算新高度
      const scrollHeight = commandInput.value.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));

      // 设置高度
      textareaHeight.value = newHeight;
      commandInput.value.style.height = newHeight + 'px';
    }
  });
};

// 输入事件处理
const handleInput = () => {
  if (isComposing.value) return;

  // 自动调整高度
  adjustTextareaHeight();

  // 清除之前的定时器
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }

  // 设置新的定时器，延迟触发补全
  debounceTimer.value = setTimeout(() => {
    filterSuggestions(currentCommand.value);
  }, 300);
};

// 焦点事件处理
const handleFocus = () => {
  isFocused.value = true;
  // 如果有输入内容，显示建议
  if (currentCommand.value.trim()) {
    filterSuggestions(currentCommand.value);
  }
};

const handleBlur = () => {
  isFocused.value = false;
  // 延迟隐藏建议，以便点击建议项目
  setTimeout(() => {
    hideSuggestions();
  }, 200);
};

// 输入法事件处理
const handleCompositionStart = () => {
  isComposing.value = true;
};

const handleCompositionEnd = () => {
  isComposing.value = false;
  handleInput();
};

// 历史记录导航
const navigateHistory = direction => {
  if (commandHistory.value.length === 0) return;

  if (direction === 'up') {
    if (historyIndex.value === -1) {
      // 开始浏览历史，保存当前输入
      historyIndex.value = commandHistory.value.length - 1;
    } else if (historyIndex.value > 0) {
      historyIndex.value--;
    } else {
      return; // 已经是最早的历史记录
    }
  } else if (direction === 'down') {
    if (historyIndex.value === -1) return;

    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++;
    } else {
      // 回到当前输入
      historyIndex.value = -1;
      currentCommand.value = '';
      return;
    }
  }

  if (historyIndex.value >= 0 && historyIndex.value < commandHistory.value.length) {
    currentCommand.value = commandHistory.value[historyIndex.value];
  }
};

// 点击外部隐藏建议
const handleClickOutside = event => {
  if (!event.target.closest('.terminal-input-box')) {
    hideSuggestions();
  }
};

// 工具方法
const getSuggestionItemClass = (suggestion, index) => {
  return [
    'suggestion-item',
    {
      active: index === selectedSuggestionIndex.value,
      'ai-suggestion': suggestion.type === 'ai',
      'local-suggestion': suggestion.type === 'local',
      'hybrid-suggestion': suggestion.type === 'hybrid'
    }
  ];
};

const getSuggestionIcon = suggestion => {
  if (suggestion.type === 'ai') return '🤖';
  if (suggestion.type === 'hybrid') return '🔄';
  if (suggestion.category === 'git') return '📦';
  if (suggestion.category === 'network') return '🌐';
  if (suggestion.category === 'system') return '⚙️';
  if (suggestion.category === 'file') return '📁';
  if (suggestion.category === 'package') return '📦';
  if (suggestion.category === 'service') return '🔧';
  if (suggestion.category === 'editor') return '📝';
  return '📋';
};

const getCategoryLabel = category => {
  const labels = {
    file: '文件',
    system: '系统',
    network: '网络',
    git: 'Git',
    package: '包管理',
    service: '服务',
    text: '文本',
    archive: '压缩',
    editor: '编辑器',
    utility: '工具'
  };
  return labels[category] || category;
};

const getMatchTypeLabel = matchType => {
  const labels = {
    exact: '精确',
    prefix: '前缀',
    'word-prefix': '单词',
    contains: '包含',
    fuzzy: '模糊'
  };
  return labels[matchType] || '';
};

// 初始化
onMounted(async () => {
  console.log('✅ [TerminalInputBox] 组件初始化');

  // 初始化AI服务
  try {
    await aiCompletionService.initialize();
    console.log('✅ [TerminalInputBox] AI completion service initialized');
  } catch (error) {
    console.warn('⚠️ [TerminalInputBox] AI completion service initialization failed:', error);
    aiEnabled.value = false;
  }

  // 添加全局点击事件监听
  document.addEventListener('click', handleClickOutside);

  // 聚焦输入框
  nextTick(() => {
    commandInput.value?.focus();
  });
});

// 清理
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
});

// 暴露方法给父组件
defineExpose({
  focus: () => commandInput.value?.focus(),
  clear: () => {
    currentCommand.value = '';
    hideSuggestions();
  },
  executeCommand
});
</script>

<style lang="scss" scoped>
.terminal-input-box {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;

  &.focused {
    .input-container {
      border-color: #74c0fc;
      box-shadow: 0 0 0 2px rgba(116, 192, 252, 0.2);
    }
  }
}

.input-container {
  display: flex;
  align-items: center;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 4px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #666;
    background: #2d2d2d;
  }
}

.prompt-symbol {
  color: #74c0fc;
  font-weight: bold;
  font-size: 14px;
  padding: 0 8px;
  user-select: none;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  padding: 8px 4px;
  line-height: 1.4;
  resize: none;
  min-height: 32px;
  max-height: 120px;
  overflow-y: auto;

  &::placeholder {
    color: #868e96;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // 滚动条样式
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 2px;

    &:hover {
      background: #777;
    }
  }
}

.send-button {
  background: #74c0fc;
  border: none;
  border-radius: 6px;
  color: #000;
  padding: 8px 12px;
  margin: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: #91a7ff;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #555;
    color: #868e96;
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.suggestions-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid #555;
  border-radius: 8px;
  margin-bottom: 4px;
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;

  .suggestions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid #444;

    .suggestions-title {
      color: #74c0fc;
      font-size: 12px;
      font-weight: 600;
    }

    .suggestions-count {
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

    &.hybrid-suggestion {
      border-left: 3px solid #ff6b35;
      background: linear-gradient(90deg, rgba(255, 107, 53, 0.05) 0%, transparent 100%);
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

        .category-badge {
          display: inline-block;
          background: rgba(116, 192, 252, 0.15);
          color: #74c0fc;
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 8px;
          margin-top: 2px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
        margin-bottom: 2px;
        display: block;
      }

      .match-type {
        background: rgba(255, 255, 255, 0.1);
        color: #868e96;
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 6px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
  }
}

.ai-status {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 10px;
  backdrop-filter: blur(10px);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  animation: fadeIn 0.3s ease;

  .ai-loading {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #74c0fc;

    .ai-spinner {
      width: 10px;
      height: 10px;
      border: 2px solid rgba(116, 192, 252, 0.3);
      border-top: 2px solid #74c0fc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .ai-enabled {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #51cf66;

    .ai-indicator.active {
      background: #51cf66;
      box-shadow: 0 0 4px #51cf66;
    }
  }

  .ai-disabled {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #868e96;

    .ai-indicator {
      background: #868e96;
    }
  }

  .ai-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}

.shortcuts-hint {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-size: 11px;
  color: #868e96;
  flex-wrap: wrap;

  .hint-item {
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: '•';
      color: #74c0fc;
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

// 滚动条样式
.suggestions-dropdown::-webkit-scrollbar {
  width: 6px;
}

.suggestions-dropdown::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.suggestions-dropdown::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;

  &:hover {
    background: #777;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .terminal-input-box {
    margin: 0 8px;
  }

  .input-container {
    padding: 3px;
  }

  .prompt-symbol {
    padding: 0 6px;
    font-size: 13px;
  }

  .command-input {
    font-size: 13px;
    padding: 6px 3px;
  }

  .send-button {
    padding: 6px 8px;
    margin: 3px;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  .suggestions-dropdown {
    .suggestion-item {
      padding: 8px 10px;

      .suggestion-text {
        .command {
          font-size: 12px;
        }

        .description {
          font-size: 10px;
        }
      }
    }
  }

  .shortcuts-hint {
    gap: 8px;
    font-size: 10px;
    padding: 6px 8px;

    .hint-item {
      white-space: nowrap;
    }
  }

  .ai-status {
    top: -35px;
    padding: 4px 8px;
    font-size: 11px;
  }
}
</style>
