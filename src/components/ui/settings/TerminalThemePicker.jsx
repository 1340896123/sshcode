import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * TerminalThemePicker组件 - 终端主题选择器组件
 */
export function TerminalThemePicker({
  theme = 'default',
  onThemeChange,
  showPreview = true,
  className = '',
  ...props
}) {
  const [selectedTheme, setSelectedTheme] = useState(theme);

  const terminalThemes = [
    {
      id: 'default',
      name: '默认主题',
      background: '#1a1a1a',
      foreground: '#ffffff',
      cursor: '#ffffff',
      selection: '#44475a',
      colors: ['#ff5555', '#50fa7b', '#f1fa8c', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#bfbfbf']
    },
    {
      id: 'monokai',
      name: 'Monokai',
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      selection: '#49483e',
      colors: ['#f92672', '#a6e22e', '#f4bf75', '#f4bf75', '#ae81ff', '#f92672', '#66d9ef', '#c5c8c6']
    },
    {
      id: 'dracula',
      name: 'Dracula',
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      selection: '#44475a',
      colors: ['#ff5555', '#50fa7b', '#f1fa8c', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#bfbfbf']
    },
    {
      id: 'nord',
      name: 'Nord',
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      selection: '#434c5e',
      colors: ['#bf616a', '#a3be8c', '#ebcb8b', '#ebcb8b', '#b48ead', '#bf616a', '#88c0d0', '#e5e9f0']
    },
    {
      id: 'solarized',
      name: 'Solarized Dark',
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      selection: '#073642',
      colors: ['#dc322f', '#859900', '#b58900', '#b58900', '#6c71c4', '#dc322f', '#2aa198', '#93a1a1']
    }
  ];

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onThemeChange?.(themeId);
  };

  const renderColorPalette = (colors) => (
    <div className="flex gap-1">
      {colors.slice(0, 8).map((color, index) => (
        <div
          key={index}
          className="w-3 h-3 rounded-full border border-gray-600"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg p-4', className)} {...props}>
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Terminal" size="sm" />
        <h3 className="text-sm font-medium text-gray-100">终端主题</h3>
      </div>

      <div className="space-y-3">
        {terminalThemes.map((themeOption) => (
          <div
            key={themeOption.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
              'hover:bg-gray-700',
              selectedTheme === themeOption.id && 'bg-blue-600/20 border border-blue-500'
            )}
            onClick={() => handleThemeSelect(themeOption.id)}
          >
            {showPreview && (
              <div
                className="w-16 h-12 rounded border-2 border-gray-600 p-1"
                style={{ backgroundColor: themeOption.background }}
              >
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {renderColorPalette(themeOption.colors)}
                  </div>
                  <div
                    className="h-1 rounded"
                    style={{ backgroundColor: themeOption.cursor }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1">
              <div className="text-sm font-medium text-gray-100">
                {themeOption.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                背景色: {themeOption.background}
              </div>
            </div>

            <div className="w-4 h-4 rounded-full border-2 border-gray-600">
              {selectedTheme === themeOption.id && (
                <div className="w-full h-full rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TerminalThemePicker;
