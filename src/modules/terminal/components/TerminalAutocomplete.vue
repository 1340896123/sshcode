<template>
  <div class="terminal-autocomplete" v-show="showSuggestions">
    <div
      v-for="(suggestion, index) in filteredSuggestions"
      :key="suggestion.command"
      :class="['suggestion-item', { active: index === selectedIndex }]"
      @click="selectSuggestion(suggestion)"
    >
      <span class="command">{{ suggestion.command }}</span>
      <span class="description" v-if="suggestion.description">{{ suggestion.description }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
  currentInput: {
    type: String,
    default: ''
  },
  isVisible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select', 'hide']);

// 常用Linux命令数据源
const commandDatabase = [
  // 文件操作
  { command: 'ls', description: 'List directory contents' },
  { command: 'ls -la', description: 'List all files including hidden ones' },
  { command: 'cd', description: 'Change directory' },
  { command: 'pwd', description: 'Print working directory' },
  { command: 'mkdir', description: 'Create directory' },
  { command: 'rm', description: 'Remove files or directories' },
  { command: 'rm -rf', description: 'Force remove directory and contents' },
  { command: 'cp', description: 'Copy files or directories' },
  { command: 'mv', description: 'Move/rename files or directories' },
  { command: 'touch', description: 'Create empty file or update timestamp' },
  { command: 'cat', description: 'Display file contents' },
  { command: 'less', description: 'View file contents page by page' },
  { command: 'head', description: 'Display first lines of file' },
  { command: 'tail', description: 'Display last lines of file' },
  { command: 'tail -f', description: 'Follow file content in real-time' },
  { command: 'find', description: 'Search for files' },
  { command: 'grep', description: 'Search text patterns' },
  { command: 'chmod', description: 'Change file permissions' },
  { command: 'chown', description: 'Change file owner' },
  { command: 'tar', description: 'Archive utility' },
  { command: 'zip', description: 'Compress files' },
  { command: 'unzip', description: 'Extract zip files' },

  // 系统信息
  { command: 'ps', description: 'Show running processes' },
  { command: 'ps aux', description: 'Show all running processes' },
  { command: 'top', description: 'Display system processes' },
  { command: 'htop', description: 'Interactive process viewer' },
  { command: 'kill', description: 'Terminate processes' },
  { command: 'killall', description: 'Kill processes by name' },
  { command: 'df', description: 'Display disk usage' },
  { command: 'du', description: 'Display directory sizes' },
  { command: 'free', description: 'Display memory usage' },
  { command: 'uname', description: 'Display system information' },
  { command: 'uname -a', description: 'Display all system information' },
  { command: 'uptime', description: 'Show system uptime' },
  { command: 'who', description: 'Show logged in users' },
  { command: 'w', description: 'Show who is logged in and what they are doing' },
  { command: 'id', description: 'Display user and group information' },
  { command: 'sudo', description: 'Execute command as superuser' },
  { command: 'su', description: 'Switch user' },

  // 网络工具
  { command: 'ping', description: 'Test network connectivity' },
  { command: 'curl', description: 'Transfer data from servers' },
  { command: 'wget', description: 'Download files from web' },
  { command: 'ssh', description: 'Connect to remote server' },
  { command: 'scp', description: 'Secure copy files remotely' },
  { command: 'rsync', description: 'Sync files remotely' },
  { command: 'netstat', description: 'Display network connections' },
  { command: 'ss', description: 'Socket statistics' },
  { command: 'ifconfig', description: 'Configure network interfaces' },
  { command: 'ip addr', description: 'Show IP addresses' },
  { command: 'nslookup', description: 'DNS lookup utility' },
  { command: 'dig', description: 'DNS lookup utility (detailed)' },

  // Git 命令
  { command: 'git', description: 'Version control system' },
  { command: 'git status', description: 'Show working tree status' },
  { command: 'git add', description: 'Add files to staging area' },
  { command: 'git commit', description: 'Record changes to repository' },
  { command: 'git push', description: 'Push changes to remote repository' },
  { command: 'git pull', description: 'Fetch from and merge with remote repository' },
  { command: 'git branch', description: 'List, create, or delete branches' },
  { command: 'git checkout', description: 'Switch branches or restore working tree files' },
  { command: 'git log', description: 'Show commit logs' },
  { command: 'git diff', description: 'Show changes between commits' },
  { command: 'git merge', description: 'Join branches together' },
  { command: 'git clone', description: 'Clone repository into new directory' },
  { command: 'git fetch', description: 'Download objects and refs from another repository' },
  { command: 'git reset', description: 'Reset current HEAD to specified state' },
  { command: 'git remote', description: 'Manage remote repositories' },
  { command: 'git stash', description: 'Stash changes in a dirty working directory' },

  // 包管理器
  { command: 'apt-get', description: 'Debian/Ubuntu package manager' },
  { command: 'apt-get update', description: 'Update package lists' },
  { command: 'apt-get install', description: 'Install packages' },
  { command: 'apt-get remove', description: 'Remove packages' },
  { command: 'apt-get upgrade', description: 'Upgrade installed packages' },
  { command: 'yum', description: 'RHEL/CentOS package manager' },
  { command: 'yum install', description: 'Install packages' },
  { command: 'yum update', description: 'Update packages' },
  { command: 'dnf', description: 'Modern RHEL package manager' },
  { command: 'npm', description: 'Node.js package manager' },
  { command: 'npm install', description: 'Install npm packages' },
  { command: 'npm run', description: 'Run npm scripts' },
  { command: 'pip', description: 'Python package manager' },
  { command: 'pip install', description: 'Install Python packages' },

  // 文本处理
  { command: 'echo', description: 'Display message' },
  { command: 'printf', description: 'Format and print data' },
  { command: 'sed', description: 'Stream editor for filtering and transforming text' },
  { command: 'awk', description: 'Pattern scanning and processing language' },
  { command: 'sort', description: 'Sort lines of text files' },
  { command: 'uniq', description: 'Remove duplicate lines' },
  { command: 'wc', description: 'Word count' },
  { command: 'tr', description: 'Translate or delete characters' },
  { command: 'cut', description: 'Remove sections from each line of files' },
  { command: 'paste', description: 'Merge lines of files' },
  { command: 'split', description: 'Split a file into pieces' },
  { command: 'join', description: 'Join lines of two files on a common field' },

  // 系统服务
  { command: 'systemctl', description: 'Control systemd services' },
  { command: 'systemctl start', description: 'Start a service' },
  { command: 'systemctl stop', description: 'Stop a service' },
  { command: 'systemctl restart', description: 'Restart a service' },
  { command: 'systemctl status', description: 'Show service status' },
  { command: 'systemctl enable', description: 'Enable service to start on boot' },
  { command: 'systemctl disable', description: 'Disable service' },
  { command: 'service', description: 'Run system services (legacy)' },
  { command: 'journalctl', description: 'Query systemd journal logs' },

  // 其他常用命令
  { command: 'clear', description: 'Clear terminal screen' },
  { command: 'history', description: 'Display command history' },
  { command: 'alias', description: 'Create command aliases' },
  { command: 'which', description: 'Locate a command' },
  { command: 'whereis', description: 'Locate binary, source, and manual page files' },
  { command: 'man', description: 'Display manual pages' },
  { command: 'info', description: 'Display documentation' },
  { command: 'help', description: 'Display help information' },
  { command: 'exit', description: 'Exit shell' },
  { command: 'logout', description: 'Exit login shell' },
  { command: 'reboot', description: 'Reboot system' },
  { command: 'shutdown', description: 'Shutdown system' },
  { command: 'poweroff', description: 'Power off system' },
  { command: 'sleep', description: 'Delay for specified time' },
  { command: 'watch', description: 'Execute command periodically' },
  { command: 'crontab', description: 'Schedule periodic tasks' },
  { command: 'screen', description: 'Terminal multiplexer' },
  { command: 'tmux', description: 'Terminal multiplexer' },
  { command: 'vim', description: 'Text editor' },
  { command: 'vi', description: 'Text editor' },
  { command: 'nano', description: 'Text editor' },
  { command: 'emacs', description: 'Text editor' },
  { command: 'code', description: 'Visual Studio Code' }
];

const showSuggestions = ref(false);
const selectedIndex = ref(0);
const filteredSuggestions = ref([]);

// 过滤匹配的命令
const filterSuggestions = input => {
  if (!input || input.trim().length < 1) {
    filteredSuggestions.value = [];
    return;
  }

  const trimmedInput = input.trim().toLowerCase();

  // 精确匹配优先
  const exactMatches = commandDatabase.filter(cmd =>
    cmd.command.toLowerCase().startsWith(trimmedInput)
  );

  // 模糊匹配（包含）
  const fuzzyMatches = commandDatabase.filter(
    cmd =>
      cmd.command.toLowerCase().includes(trimmedInput) &&
      !cmd.command.toLowerCase().startsWith(trimmedInput)
  );

  // 描述匹配
  const descriptionMatches = commandDatabase.filter(
    cmd =>
      cmd.description &&
      cmd.description.toLowerCase().includes(trimmedInput) &&
      !cmd.command.toLowerCase().includes(trimmedInput)
  );

  filteredSuggestions.value = [...exactMatches, ...fuzzyMatches, ...descriptionMatches].slice(
    0,
    10
  );
  selectedIndex.value = 0;
  showSuggestions.value = filteredSuggestions.value.length > 0;
};

// 监听输入变化
watch(
  () => props.currentInput,
  newInput => {
    if (props.isVisible) {
      filterSuggestions(newInput);
    } else {
      showSuggestions.value = false;
    }
  }
);

watch(
  () => props.isVisible,
  visible => {
    if (!visible) {
      showSuggestions.value = false;
    } else if (props.currentInput) {
      filterSuggestions(props.currentInput);
    }
  }
);

// 选择建议
const selectSuggestion = suggestion => {
  emit('select', suggestion.command);
  showSuggestions.value = false;
  selectedIndex.value = 0;
};

// 键盘导航
const handleKeyDown = event => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) {
    return false;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % filteredSuggestions.value.length;
      return true;

    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value =
        selectedIndex.value === 0 ? filteredSuggestions.value.length - 1 : selectedIndex.value - 1;
      return true;

    case 'Enter':
      event.preventDefault();
      if (selectedIndex.value >= 0 && selectedIndex.value < filteredSuggestions.value.length) {
        selectSuggestion(filteredSuggestions.value[selectedIndex.value]);
        return true;
      }
      break;

    case 'Escape':
      event.preventDefault();
      showSuggestions.value = false;
      selectedIndex.value = 0;
      return true;

    case 'Tab':
      event.preventDefault();
      // Tab键自动补全第一个匹配项
      if (filteredSuggestions.value.length > 0) {
        selectSuggestion(filteredSuggestions.value[0]);
        return true;
      }
      break;
  }

  return false;
};

// 暴露方法给父组件
defineExpose({
  handleKeyDown,
  showSuggestions,
  filteredSuggestions,
  selectedIndex
});
</script>

<style lang="scss" scoped>
.terminal-autocomplete {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--bg-secondary, #2a2a2a);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px 6px 0 0;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-tertiary, #1a1a1a);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color, #555);
    border-radius: 3px;

    &:hover {
      background: var(--text-secondary, #666);
    }
  }

  .suggestion-item {
    padding: spacing(sm) spacing(md);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: spacing(xs);
    transition: background-color 0.2s ease;
    border-bottom: 1px solid var(--border-color-light, #333);

    &:last-child {
      border-bottom: none;
    }

    &:hover,
    &.active {
      background: var(--bg-tertiary, #333);
    }

    &.active {
      background: var(--primary-color, #0066cc);
    }

    .command {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: font-size(sm);
      color: var(--text-primary, #fff);
      font-weight: 500;

      .active & {
        color: #fff;
      }
    }

    .description {
      font-size: font-size(xs);
      color: var(--text-secondary, #aaa);
      font-style: italic;

      .active & {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

// 深色主题变量
:root {
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #1a1a1a;
  --text-primary: #fff;
  --text-secondary: #aaa;
  --border-color: #444;
  --border-color-light: #333;
  --primary-color: #0066cc;
}
</style>
