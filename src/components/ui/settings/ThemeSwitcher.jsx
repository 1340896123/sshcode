import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Switch } from '../primitives/Switch';

/**
 * ThemeSwitcher组件 - 主题与外观切换组件
 */
export function ThemeSwitcher({
  theme = 'system',
  onThemeChange,
  showPreview = true,
  compact = false,
  className = '',
  ...props
}) {
  const [currentTheme, setCurrentTheme] = useState(theme);

  const themes = [
    {
      id: 'light',
      name: '浅色主题',
      description: '明亮的界面主题',
      icon: 'Sun',
      preview: 'bg-white border-gray-200',
      textColor: 'text-gray-900'
    },
    {
      id: 'dark',
      name: '深色主题',
      description: '暗黑的界面主题',
      icon: 'Moon',
      preview: 'bg-gray-900 border-gray-700',
      textColor: 'text-gray-100'
    },
    {
      id: 'system',
      name: '跟随系统',
      description: '自动跟随系统主题设置',
      icon: 'Monitor',
      preview: 'bg-gradient-to-r from-white to-gray-900',
      textColor: 'text-gray-600'
    }
  ];

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-2', className)} {...props}>
        <Icon name="Sun" size="sm" />
        <Switch
          checked={currentTheme === 'dark'}
          onChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
        />
        <Icon name="Moon" size="sm" />
      </div>
    );
  }

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg p-4', className)} {...props}>
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Palette" size="sm" />
        <h3 className="text-sm font-medium text-gray-100">主题设置</h3>
      </div>

      <div className="space-y-3">
        {themes.map((themeOption) => (
          <div
            key={themeOption.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
              'hover:bg-gray-700',
              currentTheme === themeOption.id && 'bg-blue-600/20 border border-blue-500'
            )}
            onClick={() => handleThemeChange(themeOption.id)}
          >
            <Icon name={themeOption.icon} size="md" />

            <div className="flex-1">
              <div className="text-sm font-medium text-gray-100">
                {themeOption.name}
              </div>
              <div className="text-xs text-gray-500">
                {themeOption.description}
              </div>
            </div>

            {showPreview && (
              <div className={clsx(
                'w-12 h-8 rounded border-2',
                themeOption.preview
              )}>
                <div className={clsx(
                  'w-full h-full flex items-center justify-center text-xs font-medium',
                  themeOption.textColor
                )}>
                  Aa
                </div>
              </div>
            )}

            <div className="w-4 h-4 rounded-full border-2 border-gray-600">
              {currentTheme === themeOption.id && (
                <div className="w-full h-full rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 预设组件
export const CompactThemeSwitcher = (props) => (
  <ThemeSwitcher compact={true} {...props} />
);

export const MinimalThemeSwitcher = (props) => (
  <ThemeSwitcher compact={true} showPreview={false} {...props} />
);

export default ThemeSwitcher;
