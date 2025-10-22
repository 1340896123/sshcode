// 优化的本地命令数据库
// 将命令数据移到单独文件中，减少组件内存占用
export const LOCAL_COMMANDS = [
  // 文件操作
  { command: 'ls', description: 'List directory contents', type: 'local', category: 'file', priority: 10 },
  { command: 'ls -la', description: 'List all files including hidden ones', type: 'local', category: 'file', priority: 9 },
  { command: 'cd', description: 'Change directory', type: 'local', category: 'file', priority: 10 },
  { command: 'pwd', description: 'Print working directory', type: 'local', category: 'file', priority: 8 },
  { command: 'mkdir', description: 'Create directory', type: 'local', category: 'file', priority: 9 },
  { command: 'rm', description: 'Remove files or directories', type: 'local', category: 'file', priority: 9 },
  { command: 'rm -rf', description: 'Force remove directory and contents', type: 'local', category: 'file', priority: 8 },
  { command: 'cp', description: 'Copy files or directories', type: 'local', category: 'file', priority: 9 },
  { command: 'mv', description: 'Move/rename files or directories', type: 'local', category: 'file', priority: 9 },
  { command: 'touch', description: 'Create empty file or update timestamp', type: 'local', category: 'file', priority: 7 },
  { command: 'cat', description: 'Display file contents', type: 'local', category: 'file', priority: 8 },
  { command: 'less', description: 'View file contents page by page', type: 'local', category: 'file', priority: 8 },
  { command: 'head', description: 'Display first lines of file', type: 'local', category: 'file', priority: 7 },
  { command: 'tail', description: 'Display last lines of file', type: 'local', category: 'file', priority: 7 },
  { command: 'tail -f', description: 'Follow file content in real-time', type: 'local', category: 'file', priority: 9 },
  { command: 'find', description: 'Search for files', type: 'local', category: 'file', priority: 9 },
  { command: 'grep', description: 'Search text patterns', type: 'local', category: 'file', priority: 10 },
  { command: 'chmod', description: 'Change file permissions', type: 'local', category: 'file', priority: 8 },
  { command: 'chown', description: 'Change file owner', type: 'local', category: 'file', priority: 7 },

  // 系统信息
  { command: 'ps', description: 'Show running processes', type: 'local', category: 'system', priority: 9 },
  { command: 'ps aux', description: 'Show all running processes', type: 'local', category: 'system', priority: 9 },
  { command: 'top', description: 'Display system processes', type: 'local', category: 'system', priority: 9 },
  { command: 'htop', description: 'Interactive process viewer', type: 'local', category: 'system', priority: 8 },
  { command: 'kill', description: 'Terminate processes', type: 'local', category: 'system', priority: 8 },
  { command: 'df', description: 'Display disk usage', type: 'local', category: 'system', priority: 8 },
  { command: 'du', description: 'Display directory sizes', type: 'local', category: 'system', priority: 7 },
  { command: 'free', description: 'Display memory usage', type: 'local', category: 'system', priority: 8 },
  { command: 'uname', description: 'Display system information', type: 'local', category: 'system', priority: 7 },
  { command: 'sudo', description: 'Execute command as superuser', type: 'local', category: 'system', priority: 10 },

  // 网络工具
  { command: 'ping', description: 'Test network connectivity', type: 'local', category: 'network', priority: 9 },
  { command: 'curl', description: 'Transfer data from servers', type: 'local', category: 'network', priority: 10 },
  { command: 'wget', description: 'Download files from web', type: 'local', category: 'network', priority: 9 },
  { command: 'ssh', description: 'Connect to remote server', type: 'local', category: 'network', priority: 9 },
  { command: 'scp', description: 'Secure copy files remotely', type: 'local', category: 'network', priority: 8 },
  { command: 'netstat', description: 'Display network connections', type: 'local', category: 'network', priority: 8 },

  // Git 命令
  { command: 'git', description: 'Version control system', type: 'local', category: 'git', priority: 10 },
  { command: 'git status', description: 'Show working tree status', type: 'local', category: 'git', priority: 10 },
  { command: 'git add', description: 'Add files to staging area', type: 'local', category: 'git', priority: 9 },
  { command: 'git commit', description: 'Record changes to repository', type: 'local', category: 'git', priority: 9 },
  { command: 'git push', description: 'Push changes to remote repository', type: 'local', category: 'git', priority: 9 },
  { command: 'git pull', description: 'Fetch from and merge with remote repository', type: 'local', category: 'git', priority: 9 },
  { command: 'git branch', description: 'List, create, or delete branches', type: 'local', category: 'git', priority: 8 },
  { command: 'git checkout', description: 'Switch branches or restore working tree files', type: 'local', category: 'git', priority: 9 },
  { command: 'git log', description: 'Show commit logs', type: 'local', category: 'git', priority: 8 },
  { command: 'git diff', description: 'Show changes between commits', type: 'local', category: 'git', priority: 8 },

  // 包管理器
  { command: 'apt-get', description: 'Debian/Ubuntu package manager', type: 'local', category: 'package', priority: 8 },
  { command: 'apt-get update', description: 'Update package lists', type: 'local', category: 'package', priority: 9 },
  { command: 'apt-get install', description: 'Install packages', type: 'local', category: 'package', priority: 9 },
  { command: 'yum', description: 'RHEL/CentOS package manager', type: 'local', category: 'package', priority: 8 },
  { command: 'npm', description: 'Node.js package manager', type: 'local', category: 'package', priority: 9 },
  { command: 'npm install', description: 'Install npm packages', type: 'local', category: 'package', priority: 9 },
  { command: 'npm run', description: 'Run npm scripts', type: 'local', category: 'package', priority: 8 },
  { command: 'pip', description: 'Python package manager', type: 'local', category: 'package', priority: 9 },

  // 其他常用命令
  { command: 'clear', description: 'Clear terminal screen', type: 'local', category: 'utility', priority: 9 },
  { command: 'history', description: 'Display command history', type: 'local', category: 'utility', priority: 7 },
  { command: 'man', description: 'Display manual pages', type: 'local', category: 'utility', priority: 8 },
  { command: 'vim', description: 'Text editor', type: 'local', category: 'editor', priority: 8 },
  { command: 'vi', description: 'Text editor', type: 'local', category: 'editor', priority: 7 },
  { command: 'nano', description: 'Text editor', type: 'local', category: 'editor', priority: 8 },
  { command: 'exit', description: 'Exit shell', type: 'local', category: 'utility', priority: 8 }
];

// 优化的命令搜索算法
export class CommandSearchEngine {
  constructor() {
    this.indexedCommands = null;
    this.buildIndex();
  }

  buildIndex() {
    // 预构建索引以提高搜索性能
    this.indexedCommands = LOCAL_COMMANDS.map(cmd => ({
      ...cmd,
      keywords: cmd.command.toLowerCase().split(' '),
      descriptionLower: cmd.description.toLowerCase()
    }));
  }

  search(query, limit = 8) {
    if (!query || query.trim().length < 1) return [];

    const trimmedQuery = query.trim().toLowerCase();
    const queryWords = trimmedQuery.split(/\s+/);

    // 使用评分系统快速匹配
    const results = this.indexedCommands
      .map(cmd => this.calculateScore(cmd, trimmedQuery, queryWords))
      .filter(result => result.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.command);

    return results;
  }

  calculateScore(command, query, queryWords) {
    let score = 0;
    const commandText = command.command.toLowerCase();

    // 精确匹配
    if (commandText === query) {
      score = 1.0;
    }
    // 前缀匹配
    else if (commandText.startsWith(query)) {
      score = 0.9;
    }
    // 包含匹配
    else if (commandText.includes(query)) {
      score = 0.7;
    }
    // 单词匹配
    else {
      const matchedWords = queryWords.filter(word =>
        command.keywords.some(keyword => keyword.startsWith(word))
      );
      score = matchedWords.length / queryWords.length * 0.6;
    }

    // 优先级加权
    if (command.priority) {
      score = score * (0.8 + command.priority / 50);
    }

    return {
      command: {
        ...command,
        confidence: score
      },
      score
    };
  }
}

// 单例模式，避免重复创建
const commandSearchEngine = new CommandSearchEngine();

export { commandSearchEngine };