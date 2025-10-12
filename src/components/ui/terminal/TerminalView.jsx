import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from '../utils/clsx';

/**
 * TerminalView组件 - 基于xterm.js的终端视图组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {Object} props.theme - 终端主题配置
 * @param {boolean} props.readOnly - 是否只读模式
 * @param {boolean} props.showCursor - 是否显示光标
 * @param {boolean} props.allowTransparency - 是否允许透明
 * @param {Function} props.onData - 接收终端数据回调
 * @param {Function} props.onResize - 终端尺寸变化回调
 * @param {Function} props.onTitleChange - 标题变化回调
 * @param {Function} props.onSelectionChange - 选择变化回调
 * @param {Object} props.options - xterm.js选项
 * @param {string} props.fontSize - 字体大小
 * @param {string} props.fontFamily - 字体族
 * @param {boolean} props.scrollback - 是否启用滚动历史
 * @param {number} props.scrollbackLines - 滚动历史行数
 * @param {boolean} props.copyOnSelect - 选择时是否自动复制
 */
export function TerminalView({
  className = '',
  theme = {},
  readOnly = false,
  showCursor = true,
  allowTransparency = false,
  onData,
  onResize,
  onTitleChange,
  onSelectionChange,
  options = {},
  fontSize = '14',
  fontFamily = '"Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace',
  scrollback = true,
  scrollbackLines = 1000,
  copyOnSelect = false,
  ...props
}) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({ cols: 80, rows: 24 });

  // 默认主题配置
  const defaultTheme = {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: '#264f78',
    black: '#0c0c0c',
    red: '#c50f1f',
    green: '#13a10e',
    yellow: '#c19c00',
    blue: '#0037da',
    magenta: '#881798',
    cyan: '#3a96dd',
    white: '#cccccc',
    brightBlack: '#767676',
    brightRed: '#e74856',
    brightGreen: '#16c60c',
    brightYellow: '#f9f1a5',
    brightBlue: '#3b78ff',
    brightMagenta: '#b4009e',
    brightCyan: '#61d6d6',
    brightWhite: '#f2f2f2',
    ...theme,
  };

  // 默认选项
  const defaultOptions = {
    theme: defaultTheme,
    fontSize: parseInt(fontSize),
    fontFamily,
    allowTransparency,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: scrollback ? scrollbackLines : 0,
    tabStopWidth: 4,
    bellStyle: 'sound',
    convertEol: true,
    termName: 'xterm-256color',
    rightClickSelectsWord: true,
    fastScrollModifier: 'alt',
    rendererType: 'canvas',
    ...options,
  };

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    let Terminal = null;
    let FitAddon = null;
    let WebLinksAddon = null;
    let SearchAddon = null;

    const initTerminal = async () => {
      try {
        // 动态导入xterm.js（如果项目中没有安装，这里会提供一个模拟实现）
        if (typeof window !== 'undefined' && window.Terminal) {
          Terminal = window.Terminal;
          FitAddon = window.FitAddon;
          WebLinksAddon = window.WebLinksAddon;
          SearchAddon = window.SearchAddon;
        } else {
          // 模拟实现（实际项目中应该安装xterm.js）
          console.warn('xterm.js not found, using mock implementation');
          return createMockTerminal();
        }

        const terminal = new Terminal(defaultOptions);
        xtermRef.current = terminal;

        // 添加插件
        if (FitAddon) {
          const fitAddon = new FitAddon();
          terminal.loadAddon(fitAddon);
          terminal.fitAddon = fitAddon;
        }

        if (WebLinksAddon) {
          const webLinksAddon = new WebLinksAddon();
          terminal.loadAddon(webLinksAddon);
        }

        if (SearchAddon) {
          const searchAddon = new SearchAddon();
          terminal.loadAddon(searchAddon);
          terminal.searchAddon = searchAddon;
        }

        // 事件监听
        terminal.onData((data) => {
          if (!readOnly && onData) {
            onData(data);
          }
        });

        terminal.onResize((cols, rows) => {
          setDimensions({ cols, rows });
          if (onResize) {
            onResize({ cols, rows });
          }
        });

        terminal.onTitleChange((title) => {
          if (onTitleChange) {
            onTitleChange(title);
          }
        });

        terminal.onSelectionChange(() => {
          if (onSelectionChange) {
            const selection = terminal.getSelection();
            onSelectionChange(selection);
          }
        });

        // 挂载到DOM
        terminal.open(terminalRef.current);

        // 适应容器大小
        if (terminal.fitAddon) {
          terminal.fitAddon.fit();
        }

        // 设置只读模式
        if (readOnly) {
          terminal.write('\x1b[?25l'); // 隐藏光标
        }

        setIsReady(true);

      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        createMockTerminal();
      }
    };

    initTerminal();

    return () => {
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (error) {
          console.error('Error disposing terminal:', error);
        }
        xtermRef.current = null;
      }
    };
  }, []);

  // 创建模拟终端（当xterm.js不可用时）
  const createMockTerminal = () => {
    const mockTerminal = {
      write: (data) => {
        if (terminalRef.current) {
          terminalRef.current.textContent += data;
        }
      },
      writeln: (data) => {
        if (terminalRef.current) {
          terminalRef.current.textContent += data + '\n';
        }
      },
      clear: () => {
        if (terminalRef.current) {
          terminalRef.current.textContent = '';
        }
      },
      focus: () => {
        terminalRef.current?.focus();
      },
      resize: (cols, rows) => {
        setDimensions({ cols, rows });
      },
      dispose: () => {
        // 清理逻辑
      },
    };

    xtermRef.current = mockTerminal;
    setIsReady(true);
  };

  // 窗口大小变化时重新调整终端尺寸
  useEffect(() => {
    const handleResize = () => {
      if (xtermRef.current && xtermRef.current.fitAddon) {
        xtermRef.current.fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 写入数据到终端
  const write = useCallback((data) => {
    if (xtermRef.current) {
      xtermRef.current.write(data);
    }
  }, []);

  // 写入一行数据到终端
  const writeln = useCallback((data) => {
    if (xtermRef.current) {
      xtermRef.current.writeln(data);
    }
  }, []);

  // 清空终端
  const clear = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  }, []);

  // 聚焦终端
  const focus = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  }, []);

  // 获取选择的内容
  const getSelection = useCallback(() => {
    if (xtermRef.current) {
      return xtermRef.current.getSelection() || '';
    }
    return '';
  }, []);

  // 复制选择的内容
  const copySelection = useCallback(() => {
    const selection = getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection);
    }
  }, [getSelection]);

  // 粘贴内容
  const paste = useCallback((text) => {
    if (xtermRef.current && !readOnly) {
      xtermRef.current.paste(text);
    }
  }, [readOnly]);

  // 搜索文本
  const search = useCallback((text, options = {}) => {
    if (xtermRef.current && xtermRef.current.searchAddon) {
      return xtermRef.current.searchAddon.findNext(text, options);
    }
    return false;
  }, []);

  // 暴露方法给父组件
  React.useImperativeHandle(props.terminalRef, () => ({
    write,
    writeln,
    clear,
    focus,
    getSelection,
    copySelection,
    paste,
    search,
    resize: (cols, rows) => {
      if (xtermRef.current) {
        xtermRef.current.resize(cols, rows);
      }
    },
    getTerminal: () => xtermRef.current,
  }));

  const containerClasses = clsx(
    'relative w-full h-full bg-gray-900 text-gray-100 font-mono overflow-hidden',
    'border border-gray-700 rounded-lg',
    className
  );

  return (
    <div className={containerClasses} {...props}>
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily,
        }}
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-gray-400 text-sm">正在初始化终端...</div>
          </div>
        </div>
      )}

      {/* 终端状态指示器 */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {readOnly && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            只读
          </span>
        )}
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
          {dimensions.cols}×{dimensions.rows}
        </span>
      </div>
    </div>
  );
}

// 预设的终端主题
export const terminalThemes = {
  dark: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selection: '#264f78',
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    selection: '#b3d4fc',
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selection: '#49483e',
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selection: '#44475a',
  },
  cyberpunk: {
    background: '#0a0e27',
    foreground: '#00ff00',
    cursor: '#00ff00',
    selection: '#003300',
  },
};

export default TerminalView;
