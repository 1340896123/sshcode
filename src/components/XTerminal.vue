<template>
  <div class="xterm-terminal">
    <div
      ref="terminalContainer"
      class="terminal-container"
      :style="{ height: containerHeight }"
      @contextmenu.prevent="handleContextMenu"
    ></div>

    <!-- 可拖动分割条 -->
    <ResizeHandle
      direction="horizontal"
      :min-size="60"
      :max-size="200"
      :initial-size="inputHeight"
      title="拖动调整终端和输入框大小"
      @resize="handleResize"
      @resize-start="handleResizeStart"
      @resize-end="handleResizeEnd"
    />
    <!-- 独立终端输入框 -->
    <div class="terminal-input-wrapper" :style="{ height: inputHeight + 'px' }">
      <TerminalInputBox
        :connection-id="connectionId"
        @execute-command="handleInputCommand"
        @show-notification="handleNotification"
      />
    </div>
  </div>
</template>

<script>
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import {
  handleAITerminalData,
  completeAllAICommands,
} from "../utils/aiCommandExecutor.js";
import aiCompletionService from "../utils/aiCompletionService.js";
import TerminalInputBox from "./TerminalInputBox.vue";
import TerminalInput from "./TerminalInput.vue";
import ResizeHandle from "./ui/ResizeHandle.vue";
export default {
  name: "XTerminal",
  components: {
    TerminalInput,
    TerminalInputBox,
    ResizeHandle,
  },
  props: {
    connectionId: {
      type: String,
      required: true,
    },
    connection: {
      type: Object,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    height: {
      type: String,
      default: "400px",
    },
    fontSize: {
      type: Number,
      default: 14,
    },
    fontFamily: {
      type: String,
      default: 'Consolas, Monaco, "Courier New", monospace',
    },
  },
  emits: [
    "data",
    "resize",
    "focus",
    "blur",
    "contextmenu",
    "show-notification",
  ],
  setup(props, { emit }) {
    const terminalContainer = ref(null);
    let terminal = null;
    let fitAddon = null;
    let webLinksAddon = null;
    const isConnected = ref(false);
    const containerHeight = ref(props.height);
    const inputHeight = ref(80); // 输入框初始高度
    const isResizing = ref(false);
    const startY = ref(0);
    const startInputHeight = ref(0);

    // 智能补全相关状态
    const showSuggestions = ref(false);
    const suggestions = ref([]);
    const selectedSuggestionIndex = ref(0);
    const currentInput = ref("");
    const aiEnabled = ref(true);
    const isAILoading = ref(false);
    const showAIStatus = ref(false);
    const suggestionsTitle = ref("命令补全");
    const commandHistory = ref([]);
    const historyIndex = ref(-1);

    // 本地命令数据库
    const localCommands = [
      // 文件操作
      { command: "ls", description: "List directory contents", type: "local" },
      {
        command: "ls -la",
        description: "List all files including hidden ones",
        type: "local",
      },
      { command: "cd", description: "Change directory", type: "local" },
      { command: "pwd", description: "Print working directory", type: "local" },
      { command: "mkdir", description: "Create directory", type: "local" },
      {
        command: "rm",
        description: "Remove files or directories",
        type: "local",
      },
      {
        command: "rm -rf",
        description: "Force remove directory and contents",
        type: "local",
      },
      {
        command: "cp",
        description: "Copy files or directories",
        type: "local",
      },
      {
        command: "mv",
        description: "Move/rename files or directories",
        type: "local",
      },
      {
        command: "touch",
        description: "Create empty file or update timestamp",
        type: "local",
      },
      { command: "cat", description: "Display file contents", type: "local" },
      {
        command: "less",
        description: "View file contents page by page",
        type: "local",
      },
      {
        command: "head",
        description: "Display first lines of file",
        type: "local",
      },
      {
        command: "tail",
        description: "Display last lines of file",
        type: "local",
      },
      {
        command: "tail -f",
        description: "Follow file content in real-time",
        type: "local",
      },
      { command: "find", description: "Search for files", type: "local" },
      { command: "grep", description: "Search text patterns", type: "local" },
      {
        command: "chmod",
        description: "Change file permissions",
        type: "local",
      },
      { command: "chown", description: "Change file owner", type: "local" },

      // 系统信息
      { command: "ps", description: "Show running processes", type: "local" },
      {
        command: "ps aux",
        description: "Show all running processes",
        type: "local",
      },
      {
        command: "top",
        description: "Display system processes",
        type: "local",
      },
      {
        command: "htop",
        description: "Interactive process viewer",
        type: "local",
      },
      { command: "kill", description: "Terminate processes", type: "local" },
      { command: "df", description: "Display disk usage", type: "local" },
      { command: "du", description: "Display directory sizes", type: "local" },
      { command: "free", description: "Display memory usage", type: "local" },
      {
        command: "uname",
        description: "Display system information",
        type: "local",
      },
      {
        command: "sudo",
        description: "Execute command as superuser",
        type: "local",
      },

      // 网络工具
      {
        command: "ping",
        description: "Test network connectivity",
        type: "local",
      },
      {
        command: "curl",
        description: "Transfer data from servers",
        type: "local",
      },
      {
        command: "wget",
        description: "Download files from web",
        type: "local",
      },
      {
        command: "ssh",
        description: "Connect to remote server",
        type: "local",
      },
      {
        command: "scp",
        description: "Secure copy files remotely",
        type: "local",
      },
      {
        command: "netstat",
        description: "Display network connections",
        type: "local",
      },

      // Git 命令
      { command: "git", description: "Version control system", type: "local" },
      {
        command: "git status",
        description: "Show working tree status",
        type: "local",
      },
      {
        command: "git add",
        description: "Add files to staging area",
        type: "local",
      },
      {
        command: "git commit",
        description: "Record changes to repository",
        type: "local",
      },
      {
        command: "git push",
        description: "Push changes to remote repository",
        type: "local",
      },
      {
        command: "git pull",
        description: "Fetch from and merge with remote repository",
        type: "local",
      },
      {
        command: "git branch",
        description: "List, create, or delete branches",
        type: "local",
      },
      {
        command: "git checkout",
        description: "Switch branches or restore working tree files",
        type: "local",
      },
      { command: "git log", description: "Show commit logs", type: "local" },
      {
        command: "git diff",
        description: "Show changes between commits",
        type: "local",
      },

      // 包管理器
      {
        command: "apt-get",
        description: "Debian/Ubuntu package manager",
        type: "local",
      },
      {
        command: "apt-get update",
        description: "Update package lists",
        type: "local",
      },
      {
        command: "apt-get install",
        description: "Install packages",
        type: "local",
      },
      {
        command: "yum",
        description: "RHEL/CentOS package manager",
        type: "local",
      },
      { command: "npm", description: "Node.js package manager", type: "local" },
      {
        command: "npm install",
        description: "Install npm packages",
        type: "local",
      },
      { command: "npm run", description: "Run npm scripts", type: "local" },
      { command: "pip", description: "Python package manager", type: "local" },

      // 其他常用命令
      { command: "clear", description: "Clear terminal screen", type: "local" },
      {
        command: "history",
        description: "Display command history",
        type: "local",
      },
      { command: "man", description: "Display manual pages", type: "local" },
      { command: "vim", description: "Text editor", type: "local" },
      { command: "vi", description: "Text editor", type: "local" },
      { command: "nano", description: "Text editor", type: "local" },
      { command: "exit", description: "Exit shell", type: "local" },
    ];

    // 智能补全方法
    const filterSuggestions = async (input) => {
      console.log(`🔍 [XTerminal] 开始过滤建议，输入: "${input}"`);

      if (!input || input.trim().length < 1) {
        suggestions.value = [];
        showSuggestions.value = false;
        console.log(`📝 [XTerminal] 输入为空，隐藏建议`);
        return;
      }

      const trimmedInput = input.trim().toLowerCase();
      console.log(`📝 [XTerminal] 处理输入: "${trimmedInput}"`);

      // 本地命令匹配
      const localMatches = localCommands
        .filter((cmd) => cmd.command.toLowerCase().includes(trimmedInput))
        .map((cmd) => ({
          ...cmd,
          confidence: cmd.command.toLowerCase().startsWith(trimmedInput)
            ? 0.9
            : 0.6,
        }));

      console.log(`📋 [XTerminal] 本地匹配结果: ${localMatches.length} 个`);

      // AI 建议获取
      let aiMatches = [];
      if (aiEnabled.value && trimmedInput.length > 2) {
        try {
          isAILoading.value = true;
          showAIStatus.value = true;
          console.log(`🤖 [XTerminal] 开始获取AI建议...`);

          const context = {
            currentDirectory: "", // 可以从终端输出中解析
            recentCommands: commandHistory.value.slice(-5),
            connectionId: props.connectionId,
          };

          aiMatches = await aiCompletionService.getCommandSuggestions(
            trimmedInput,
            context
          );
          aiMatches = aiMatches.map((suggestion) => ({
            ...suggestion,
            type: "ai",
          }));

          console.log(`🤖 [XTerminal] AI建议获取完成: ${aiMatches.length} 个`);
        } catch (error) {
          console.error("❌ [XTerminal] 获取AI建议失败:", error);
        } finally {
          isAILoading.value = false;
        }
      }

      // 合并和排序建议
      const allSuggestions = [...localMatches, ...aiMatches]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);

      suggestions.value = allSuggestions;
      selectedSuggestionIndex.value = 0;
      showSuggestions.value = allSuggestions.length > 0;

      console.log(
        `✅ [XTerminal] 建议处理完成: ${allSuggestions.length} 个，显示: ${showSuggestions.value}`
      );

      // 更新标题
      if (aiMatches.length > 0) {
        suggestionsTitle.value = "🤖 AI + 本地补全";
      } else {
        suggestionsTitle.value = "📋 本地补全";
      }
    };

    const applySuggestion = (suggestion) => {
      console.log(`🎯 [XTerminal] 应用建议: "${suggestion.command}"`);

      if (!terminal || !suggestion) {
        console.log(
          `❌ [XTerminal] 无法应用建议: terminal=${!!terminal}, suggestion=${!!suggestion}`
        );
        return;
      }

      try {
        // 获取当前缓冲区内容
        const buffer = terminal.buffer.active;
        const cursorY = buffer.cursorY;
        const line = buffer.getLine(cursorY);

        if (!line) {
          console.log(`❌ [XTerminal] 无法获取当前行数据`);
          return;
        }

        // 获取当前行的文本内容
        let currentLineText = "";
        for (let i = 0; i < line.length; i++) {
          const cell = line.getCell(i);
          if (cell && cell.getChars()) {
            currentLineText += cell.getChars();
          }
        }

        console.log(`📝 [XTerminal] 当前行内容: "${currentLineText}"`);

        // 找到命令开始的位置（最后一个换行符后）
        const lastNewlineIndex = currentLineText.lastIndexOf("\n");
        const commandStart = lastNewlineIndex + 1;
        const currentCommand = currentLineText.substring(commandStart).trim();

        console.log(
          `📝 [XTerminal] 当前命令: "${currentCommand}", 位置: ${commandStart}-${buffer.cursorX}`
        );

        // 计算需要删除的字符数
        const charsToDelete = currentCommand.length;
        const cursorPosition = buffer.cursorX;

        // 先移动光标到命令开始位置
        const backspacesNeeded = cursorPosition - commandStart;
        console.log(`⬅️ [XTerminal] 需要退格: ${backspacesNeeded} 个字符`);

        for (let i = 0; i < backspacesNeeded; i++) {
          terminal.write("\b");
        }

        // 删除当前命令
        console.log(`🗑️ [XTerminal] 删除 ${charsToDelete} 个字符`);
        for (let i = 0; i < charsToDelete; i++) {
          terminal.write(" \b");
        }

        // 写入新命令
        console.log(`✍️ [XTerminal] 写入新命令: "${suggestion.command}"`);
        terminal.write(suggestion.command);
        currentInput.value = suggestion.command;

        // 隐藏建议
        showSuggestions.value = false;
        console.log(`✅ [XTerminal] 建议应用完成`);
      } catch (error) {
        console.error("❌ [XTerminal] 应用建议失败:", error);
        // 如果失败，直接发送建议命令
        terminal.write(`\r\n${suggestion.command}`);
        currentInput.value = suggestion.command;
        showSuggestions.value = false;
      }
    };

    const hideSuggestions = () => {
      showSuggestions.value = false;
      selectedSuggestionIndex.value = 0;
    };

    const showSuggestionsForCurrentInput = async () => {
      if (!terminal) return;

      try {
        // 从终端缓冲区获取当前输入
        const buffer = terminal.buffer.active;
        const cursorY = buffer.cursorY;
        const line = buffer.getLine(cursorY);

        if (line) {
          let currentLineText = "";
          for (let i = 0; i < line.length; i++) {
            const cell = line.getCell(i);
            if (cell && cell.getChars()) {
              currentLineText += cell.getChars();
            }
          }

          // 找到当前命令（最后一个换行符后的内容）
          const lastNewlineIndex = currentLineText.lastIndexOf("\n");
          const currentCommand = currentLineText
            .substring(lastNewlineIndex + 1)
            .trim();

          currentInput.value = currentCommand;
          await filterSuggestions(currentCommand);
        }
      } catch (error) {
        console.error("获取当前输入失败:", error);
      }
    };

    const navigateSuggestions = (direction) => {
      if (!showSuggestions.value || suggestions.value.length === 0) return;

      if (direction === "down") {
        selectedSuggestionIndex.value =
          (selectedSuggestionIndex.value + 1) % suggestions.value.length;
      } else if (direction === "up") {
        selectedSuggestionIndex.value =
          selectedSuggestionIndex.value === 0
            ? suggestions.value.length - 1
            : selectedSuggestionIndex.value - 1;
      }
    };

    const toggleAI = () => {
      aiEnabled.value = !aiEnabled.value;
      showAIStatus.value = true;
      setTimeout(() => {
        showAIStatus.value = false;
      }, 2000);

      emit("show-notification", {
        type: "info",
        message: aiEnabled.value ? "AI补全已启用" : "AI补全已禁用",
      });

      // 重新过滤建议
      if (currentInput.value) {
        filterSuggestions(currentInput.value);
      }
    };

    // 初始化终端
    const initTerminal = async () => {
      if (!terminalContainer.value) return;

      // 创建终端实例
      terminal = new Terminal({
        cols: 80,
        rows: 24,
        fontSize: props.fontSize,
        fontFamily: props.fontFamily,
        theme: {
          background: "#1e1e1e",
          foreground: "#f0f0f0",
          cursor: "#74c0fc",
          cursorAccent: "#1e1e1e",
          selectionBackground: "rgba(116, 192, 252, 0.3)",
          selectionForeground: "#ffffff",
          black: "#000000",
          red: "#ff6b6b",
          green: "#51cf66",
          yellow: "#ffd43b",
          blue: "#74c0fc",
          magenta: "#f06595",
          cyan: "#22b8cf",
          white: "#ffffff",
          brightBlack: "#495057",
          brightRed: "#ff8787",
          brightGreen: "#69db7c",
          brightYellow: "#ffe066",
          brightBlue: "#91a7ff",
          brightMagenta: "#f77fad",
          brightCyan: "#66d9e8",
          brightWhite: "#ffffff",
        },
        allowTransparency: false,
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 1000,
        tabStopWidth: 4,
        fastScrollModifier: "alt",
        rightClickSelectsWord: true,
        rendererType: "dom",
        // 启用文本选择功能
        convertEol: true,
        cols: 80,
        rows: 24,
      });

      // 添加插件
      fitAddon = new FitAddon();
      webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // 绑定事件
      terminal.onData(handleTerminalData);
      terminal.onResize(handleTerminalResize);
      terminal.onTitleChange(handleTitleChange);

      // 添加键盘事件监听器用于智能补全
      terminal.attachCustomKeyEventHandler(async (event) => {
        console.log(
          `⌨️ [XTerminal] 键盘事件: ${event.key}, Ctrl: ${event.ctrlKey}, Alt: ${event.altKey}, Shift: ${event.shiftKey}`
        );

        // Tab 键自动补全
        if (event.key === "Tab" && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          console.log(
            `🔤 [XTerminal] Tab键触发，当前建议数量: ${suggestions.value.length}`
          );

          if (showSuggestions.value && suggestions.value.length > 0) {
            // 应用选中的建议
            console.log(`✅ [XTerminal] 应用选中的建议`);
            applySuggestion(suggestions.value[selectedSuggestionIndex.value]);
          } else {
            // 触发补全
            console.log(`🔍 [XTerminal] 触发补全获取`);
            await showSuggestionsForCurrentInput();
          }
          return true;
        }

        // Esc 键隐藏建议
        if (event.key === "Escape") {
          event.preventDefault();
          console.log(`🚫 [XTerminal] Esc键，隐藏建议`);
          hideSuggestions();
          return true;
        }

        // 上下键导航建议
        if (event.key === "ArrowUp" && event.ctrlKey) {
          event.preventDefault();
          console.log(`⬆️ [XTerminal] Ctrl+上箭头，向上导航建议`);
          navigateSuggestions("up");
          return true;
        }

        if (event.key === "ArrowDown" && event.ctrlKey) {
          event.preventDefault();
          console.log(`⬇️ [XTerminal] Ctrl+下箭头，向下导航建议`);
          navigateSuggestions("down");
          return true;
        }

        // Ctrl+Space 显示/隐藏补全
        if (event.ctrlKey && event.code === "Space") {
          event.preventDefault();
          console.log(`🔍 [XTerminal] Ctrl+Space，切换补全显示`);
          if (showSuggestions.value) {
            hideSuggestions();
          } else {
            await showSuggestionsForCurrentInput();
          }
          return true;
        }

        // F4 切换AI补全
        if (event.key === "F4") {
          event.preventDefault();
          console.log(`🤖 [XTerminal] F4键，切换AI补全`);
          toggleAI();
          return true;
        }

        return false;
      });

      // 监听键入事件以触发自动补全
      terminal.onKey(async ({ key, domEvent }) => {
        // 忽略特殊键
        if (domEvent.ctrlKey || domEvent.altKey || domEvent.metaKey) {
          return;
        }

        // 延迟触发补全以避免影响正常输入
        setTimeout(async () => {
          if (key !== "\r" && key !== "\n" && key !== "\t") {
            await showSuggestionsForCurrentInput();
          }
        }, 100);
      });

      // 挂载终端到DOM
      terminal.open(terminalContainer.value);

      // 在终端打开后绑定focus和blur事件
      setTimeout(() => {
        if (terminal.textarea) {
          terminal.textarea.addEventListener("focus", () => {
            emit("focus");
          });

          terminal.textarea.addEventListener("blur", () => {
            emit("blur");
          });
        }
      }, 100);

      // 自适应大小
      await nextTick();
      fitAddon.fit();

      console.log("✅ [XTerminal] 终端初始化完成，连接ID:", props.connectionId);
      console.log(`🎯 [XTerminal] 终端尺寸: ${terminal.cols}x${terminal.rows}`);
      console.log(
        `⌨️ [XTerminal] 智能补全已配置：本地命令=${
          localCommands.length
        }个，AI=${aiEnabled.value ? "启用" : "禁用"}`
      );
    };

    // 处理终端输入
    const handleTerminalData = (data) => {
      if (!isConnected.value || !props.enabled) return;

      // 如果是回车键，记录命令到历史
      if (data === "\r" || data === "\n") {
        if (currentInput.value && currentInput.value.trim()) {
          // 添加到历史记录
          if (!commandHistory.value.includes(currentInput.value.trim())) {
            commandHistory.value.push(currentInput.value.trim());
            // 限制历史记录数量
            if (commandHistory.value.length > 100) {
              commandHistory.value = commandHistory.value.slice(-100);
            }
          }
        }
        // 清除当前输入和建议
        currentInput.value = "";
        hideSuggestions();
      }

      // 发送数据到SSH Shell
      if (window.electronAPI?.sshShellWrite) {
        window.electronAPI.sshShellWrite(props.connectionId, data);
      }

      emit("data", data);
    };

    // 处理终端大小变化
    const handleTerminalResize = ({ cols, rows }) => {
      emit("resize", { cols, rows });

      // 调整SSH Shell终端大小
      if (isConnected.value && window.electronAPI?.sshShellResize) {
        window.electronAPI.sshShellResize(props.connectionId, rows, cols);
      }
    };

    // 处理标题变化
    const handleTitleChange = (title) => {
      console.log("Terminal title changed:", title);
    };

    // 规范化换行符，避免多余的空行但保持必要的分隔
    const normalizeLineBreaks = (data) => {
      // 只处理连续的3个或更多换行符，简化为最多2个
      let normalized = data.replace(/\r\n\r\n\r\n+/g, '\r\n\r\n');
      
      // 处理开头的多余换行符（保留最多1个）
      normalized = normalized.replace(/^\r\n\r\n+/, '\r\n');
      
      // 处理结尾的多余换行符（保留最多1个）
      normalized = normalized.replace(/\r\n\r\n+$/, '\r\n');
      
      return normalized;
    };

    // 写入数据到终端
    const write = (data) => {
      if (terminal) {
        const normalizedData = normalizeLineBreaks(data);
        terminal.write(normalizedData);
      }
    };

    // 写入数据到终端并捕获输出（用于AI工具调用）
    const writeAndCapture = (data) => {
      if (terminal) {
        terminal.write(data);
        // 存储最近的输出用于AI工具调用
        lastOutput.value = data;
      }
    };

    // 用于AI工具调用的输出捕获
    const lastOutput = ref("");

    // 写入UTF8数据到终端
    const writeUtf8 = (data) => {
      if (terminal) {
        terminal.writeUtf8(data);
      }
    };

    // 清空终端
    const clear = () => {
      if (terminal) {
        terminal.clear();
      }
    };

    // 重置终端
    const reset = () => {
      if (terminal) {
        terminal.reset();
      }
    };

    // 聚焦终端
    const focus = () => {
      if (terminal) {
        console.log(`🎯 [XTerminal] 聚焦终端`);
        terminal.focus();
      } else {
        console.log(`❌ [XTerminal] 无法聚焦终端：终端未初始化`);
      }
    };

    // 设置连接状态
    const setConnected = (connected) => {
      console.log(`🔌 [XTerminal] 设置连接状态: ${connected}`);
      isConnected.value = connected;

      if (connected) {
        write("\r\n\x1b[32m✓ SSH Shell连接成功\x1b[0m\r\n");
        write("\x1b[36m💡 独立输入框已启用 - 支持自动补全和AI建议\x1b[0m\r\n");
        console.log(`✅ [XTerminal] SSH Shell连接成功`);
      } else {
        write("\r\n\x1b[31m✗ SSH Shell连接已断开\x1b[0m\r\n");
        console.log(`❌ [XTerminal] SSH Shell连接已断开`);
      }
    };

    // 处理右键菜单
    const handleContextMenu = (event) => {
      emit("contextmenu", event);
    };

    // 计算状态样式
    const statusClass = computed(() => ({
      connected: isConnected.value,
      disconnected: !isConnected.value,
    }));

    // 监听高度变化
    watch(
      () => props.height,
      (newHeight) => {
        containerHeight.value = newHeight;
        nextTick(() => {
          if (fitAddon) {
            fitAddon.fit();
          }
        });
      }
    );

    // 监听字体大小变化
    watch(
      () => props.fontSize,
      (newSize) => {
        if (terminal) {
          terminal.options.fontSize = newSize;
        }
      }
    );

    // 监听字体族变化
    watch(
      () => props.fontFamily,
      (newFamily) => {
        if (terminal) {
          terminal.options.fontFamily = newFamily;
        }
      }
    );

    // 组件挂载
    onMounted(async () => {
      // 初始化AI服务
      try {
        await aiCompletionService.initialize();
        console.log("✅ AI completion service initialized");
      } catch (error) {
        console.warn("⚠️ AI completion service initialization failed:", error);
        aiEnabled.value = false;
      }

      await initTerminal();

      // 监听终端数据事件
      if (window.electronAPI?.onTerminalData) {
        window.electronAPI.onTerminalData((event, data) => {
          console.log(`📥 [XTerminal] 收到终端数据:`, {
            connectionId: props.connectionId,
            dataConnectionId: data.connectionId,
            dataLength: data.data.length,
            dataPreview: data.data.toString().substring(0, 100),
            isMatch: data.connectionId === props.connectionId,
          });

          if (data.connectionId === props.connectionId) {
            write(data.data);
            // 通知AI命令执行器有新的终端输出
            console.log(`🔄 [XTerminal] 转发数据到AI命令执行器:`, {
              connectionId: props.connectionId,
              dataLength: data.data.length,
            });
            handleAITerminalData(props.connectionId, data.data);
          } else {
            console.log(`⚠️ [XTerminal] 连接ID不匹配，忽略数据:`, {
              expected: props.connectionId,
              received: data.connectionId,
            });
          }
        });

        window.electronAPI.onTerminalClose((event, data) => {
          if (data.connectionId === props.connectionId) {
            setConnected(false);
            write(
              `\r\n\x1b[33mShell会话已关闭 (code: ${data.code})\x1b[0m\r\n`
            );
            // 完成所有待执行的AI命令
            completeAllAICommands(props.connectionId);
          }
        });

        window.electronAPI.onTerminalError((event, data) => {
          if (data.connectionId === props.connectionId) {
            write(`\r\n\x1b[31m错误: ${data.error}\x1b[0m\r\n`);
            setConnected(false);
          }
        });
      }

      // 自动连接SSH Shell
      if (props.connection.status === "connected") {
        connectShell();
      }
    });

    // 处理输入框命令
    const handleInputCommand = (command) => {
      console.log(`📥 [XTerminal] 收到输入命令: "${command}"`);

      // 显示命令在终端中（不添加最后的换行符，让SSH返回的提示符处理换行）
      write(`\r\n\x1b[36m$ ${command}\x1b[0m`);

      // 发送命令到SSH
      if (isConnected.value && window.electronAPI?.sshShellWrite) {
        window.electronAPI.sshShellWrite(props.connectionId, command + "\r\n");
        console.log(`📤 [XTerminal] 命令已发送到SSH: "${command}"`);
      } else {
        console.warn(
          `⚠️ [XTerminal] 无法发送命令，连接状态: ${isConnected.value}`
        );
        write(`\x1b[33m命令发送失败: 未连接到SSH服务器\x1b[0m\r\n`);
      }
    };

    // 处理通知
    const handleNotification = (notification) => {
      console.log(`📢 [XTerminal] 收到通知:`, notification);
      emit("show-notification", notification);
    };

    // 组件卸载
    onUnmounted(() => {
      if (isConnected.value) {
        disconnectShell();
      }
      // 完成所有待执行的AI命令
      completeAllAICommands(props.connectionId);

      if (terminal) {
        terminal.dispose();
      }
    });

    // 连接SSH Shell
    const connectShell = async () => {
      try {
        if (!window.electronAPI?.sshCreateShell) {
          console.error("sshCreateShell not available");
          return;
        }

        const result = await window.electronAPI.sshCreateShell(
          props.connectionId,
          {
            rows: terminal?.rows || 24,
            cols: terminal?.cols || 80,
            term: "xterm-256color",
          }
        );

        if (result.success) {
          setConnected(true);
          console.log("SSH Shell connected successfully");
        } else {
          write(`\r\n\x1b[31m连接失败: ${result.error}\x1b[0m\r\n`);
        }
      } catch (error) {
        console.error("Failed to connect SSH Shell:", error);
        write(`\r\n\x1b[31m连接异常: ${error.message}\x1b[0m\r\n`);
      }
    };

    // 断开SSH Shell
    const disconnectShell = async () => {
      try {
        if (window.electronAPI?.sshShellClose) {
          await window.electronAPI.sshShellClose(props.connectionId);
        }
        setConnected(false);
        // 完成所有待执行的AI命令
        completeAllAICommands(props.connectionId);
      } catch (error) {
        console.error("Failed to disconnect SSH Shell:", error);
      }
    };

    // 拖动分割条相关方法
    const handleResizeStart = (data) => {
      console.log(`🔄 [XTerminal] 开始调整大小:`, data);
      isResizing.value = true;
    };

    const handleResize = (data) => {
      console.log(`📏 [XTerminal] 调整大小中:`, data);
      inputHeight.value = data.size;

      // 重新计算终端高度
      nextTick(() => {
        if (fitAddon) {
          fitAddon.fit();
        }
      });
    };

    const handleResizeEnd = (data) => {
      console.log(`✅ [XTerminal] 调整大小完成:`, data);
      isResizing.value = false;
    };

    // 监听连接状态
    watch(
      () => props.connection.status,
      (newStatus) => {
        if (newStatus === "connected" && !isConnected.value) {
          connectShell();
        } else if (newStatus !== "connected" && isConnected.value) {
          disconnectShell();
        }
      }
    );

    return {
      inputHeight,
      isResizing,
      terminalContainer,
      isConnected,
      containerHeight,

      // 智能补全相关状态
      showSuggestions,
      suggestions,
      selectedSuggestionIndex,
      aiEnabled,
      isAILoading,
      showAIStatus,
      suggestionsTitle,

      // 方法
      write,
      writeUtf8,
      clear,
      reset,
      focus,
      setConnected,
      connectShell,
      disconnectShell,
      handleContextMenu,
      filterSuggestions,
      applySuggestion,
      hideSuggestions,
      navigateSuggestions,
      toggleAI,
      handleInputCommand,
      handleNotification,
      handleResizeStart,
      handleResize,
      handleResizeEnd,
    };
  },
};
</script>

<style lang="scss" scoped>
.xterm-terminal {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.terminal-container {
  flex: 1;
  width: 100%;
  background: #1e1e1e;
  overflow: hidden;

  :deep(.xterm) {
    height: 100% !important;
    padding: 8px;

    // 改善选中文本的样式
    .xterm-selection {
      background: rgba(116, 192, 252, 0.3) !important;
      border-radius: 2px;

      &.focus {
        background: rgba(116, 192, 252, 0.4) !important;
      }
    }

    // 选中文本的前景色
    .xterm-selection-layer {
      color: #ffffff !important;
    }

    // 改善选中的视觉效果
    .xterm-screen {
      *::selection {
        background: rgba(116, 192, 252, 0.4) !important;
        color: #ffffff !important;
      }

      *::-moz-selection {
        background: rgba(116, 192, 252, 0.4) !important;
        color: #ffffff !important;
      }
    }
  }

  :deep(.xterm-viewport) {
    scrollbar-width: thin;
    scrollbar-color: #555 #1e1e1e;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar {
    width: 8px;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar-thumb:hover {
    background: #777;
  }

  // xterm.js 辅助元素样式
  :deep(.xterm-helpers) {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;

    .xterm-helper-textarea {
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
      padding: 0;
      border: none;
      outline: none;
      resize: none;
      background: transparent;
      color: transparent;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      letter-spacing: inherit;
      word-spacing: inherit;
      text-decoration: inherit;
      text-indent: inherit;
      text-transform: inherit;
    }

    .xterm-char-measure-element {
      position: absolute;
      top: -9999px;
      left: -9999px;
      visibility: hidden;
      white-space: pre;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      letter-spacing: inherit;
      word-spacing: inherit;
    }
  }

  /* 确保选择功能正常工作 */
  :deep(.xterm-screen) {
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
  }

  :deep(.xterm-rows) {
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
  }

  :deep(.xterm-row) {
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
  }

  /* 选择区域样式 */
  :deep(.xterm-selection) {
    position: absolute !important;
    z-index: 2 !important;
    pointer-events: none !important;
  }

  :deep(.xterm-selection div) {
    position: absolute !important;
    background-color: rgba(116, 192, 252, 0.3) !important;
    pointer-events: none !important;
  }

  /* 确保选中文本可见性 */
  :deep(.xterm-selection-layer) {
    color: #ffffff !important;
    background: rgba(116, 192, 252, 0.3) !important;
  }

  /* 改善文本选择的视觉效果 */
  :deep(.xterm-screen) {
    *::selection {
      background: rgba(116, 192, 252, 0.4) !important;
      color: #ffffff !important;
    }

    *::-moz-selection {
      background: rgba(116, 192, 252, 0.4) !important;
      color: #ffffff !important;
    }
  }
}

// 智能补全建议样式
.autocomplete-suggestions {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 8px;
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

    .suggestions-hint {
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
          font-family: "Consolas", "Monaco", monospace;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 2px;
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

  // 自定义滚动条
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

// AI状态指示器
.ai-status-indicator {
  position: absolute;
  top: 50px;
  right: 20px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid #444;
  border-radius: 6px;
  padding: 8px 12px;
  backdrop-filter: blur(10px);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  animation: fadeIn 0.3s ease;

  .ai-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #74c0fc;

    .ai-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(116, 192, 252, 0.3);
      border-top: 2px solid #74c0fc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .ai-enabled {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #51cf66;

    .ai-indicator.active {
      background: #51cf66;
      box-shadow: 0 0 6px #51cf66;
    }
  }

  .ai-disabled {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #868e96;

    .ai-indicator {
      background: #868e96;
    }
  }

  .ai-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
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
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}


// 终端输入框包装器
.terminal-input-wrapper {
  position: relative;
  padding: 16px;
  background: #1a1a1a;
  border-top: 1px solid #444;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible; // 确保自动补全建议不被遮挡

  // 确保输入框组件可见
  :deep(.terminal-input-box) {
    width: 100%;
    max-width: 100%;
    opacity: 1;
    visibility: visible;
    position: relative;
    z-index: 5;

    .input-container {
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 8px;

      .command-input {
        background: transparent;
        color: #fff;
        border: none;
        outline: none;
      }
    }

    // 确保自动补全建议不被遮挡
    .suggestions-dropdown {
      position: absolute !important;
      bottom: 100% !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 1000 !important;
      margin-bottom: 4px !important;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .terminal-container {
    :deep(.xterm) {
      padding: 4px;
      font-size: 12px;
    }
  }

  .autocomplete-suggestions {
    width: 95%;
    bottom: 10px;

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

  .ai-status-indicator {
    top: 40px;
    right: 10px;
    padding: 6px 10px;
    font-size: 11px;
  }

  .terminal-input-wrapper {
    padding: 12px;
  }

  .terminal-container {
    :deep(.xterm-helpers) {
      .xterm-helper-textarea {
        font-size: 12px;
      }

      .xterm-char-measure-element {
        font-size: 12px;
      }
    }
  }
}
</style>
