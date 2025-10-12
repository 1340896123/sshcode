import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * I18n上下文
 */
const I18nContext = createContext({
  locale: 'zh',
  t: (key) => key,
  setLocale: () => {},
  availableLocales: ['zh', 'en'],
  rtl: false,
  formatDate: (date) => date.toLocaleString(),
  formatNumber: (num) => num.toString()
});

/**
 * 翻译资源
 */
const translations = {
  zh: {
    // 通用
    'common.ok': '确定',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.search': '搜索',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.warning': '警告',
    'common.info': '信息',
    
    // 连接
    'connection.connect': '连接',
    'connection.disconnect': '断开连接',
    'connection.connected': '已连接',
    'connection.disconnected': '未连接',
    'connection.connecting': '连接中',
    'connection.failed': '连接失败',
    'connection.name': '连接名称',
    'connection.host': '主机地址',
    'connection.port': '端口',
    'connection.username': '用户名',
    'connection.password': '密码',
    'connection.privateKey': '私钥',
    
    // 文件
    'file.upload': '上传',
    'file.download': '下载',
    'file.rename': '重命名',
    'file.delete': '删除',
    'file.create': '新建',
    'file.folder': '文件夹',
    'file.file': '文件',
    'file.size': '大小',
    'file.modified': '修改时间',
    'file.permissions': '权限',
    'file.owner': '拥有者',
    
    // 终端
    'terminal.clear': '清屏',
    'terminal.reconnect': '重新连接',
    'terminal.copy': '复制',
    'terminal.paste': '粘贴',
    'terminal.command': '命令',
    'terminal.history': '历史记录',
    'terminal.terminal': '终端',
    
    // AI助手
    'ai.assistant': 'AI助手',
    'ai.send': '发送',
    'ai.typing': '正在输入...',
    'ai.error': 'AI响应错误',
    'ai.retry': '重试',
    'ai.stop': '停止',
    
    // 设置
    'settings.theme': '主题',
    'settings.language': '语言',
    'settings.shortcuts': '快捷键',
    'settings.security': '安全',
    'settings.proxy': '代理',
    
    // 无障碍
    'a11y.keyboard': '键盘导航',
    'a11y.focus': '焦点',
    'a11y.screenReader': '屏幕阅读器',
    'a11y.highContrast': '高对比度',
    
    // 响应式
    'responsive.mobile': '移动端',
    'responsive.tablet': '平板',
    'responsive.desktop': '桌面'
  },
  
  en: {
    // Common
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    
    // Connection
    'connection.connect': 'Connect',
    'connection.disconnect': 'Disconnect',
    'connection.connected': 'Connected',
    'connection.disconnected': 'Disconnected',
    'connection.connecting': 'Connecting',
    'connection.failed': 'Connection Failed',
    'connection.name': 'Connection Name',
    'connection.host': 'Host',
    'connection.port': 'Port',
    'connection.username': 'Username',
    'connection.password': 'Password',
    'connection.privateKey': 'Private Key',
    
    // File
    'file.upload': 'Upload',
    'file.download': 'Download',
    'file.rename': 'Rename',
    'file.delete': 'Delete',
    'file.create': 'Create',
    'file.folder': 'Folder',
    'file.file': 'File',
    'file.size': 'Size',
    'file.modified': 'Modified',
    'file.permissions': 'Permissions',
    'file.owner': 'Owner',
    
    // Terminal
    'terminal.clear': 'Clear',
    'terminal.reconnect': 'Reconnect',
    'terminal.copy': 'Copy',
    'terminal.paste': 'Paste',
    'terminal.command': 'Command',
    'terminal.history': 'History',
    'terminal.terminal': 'Terminal',
    
    // AI Assistant
    'ai.assistant': 'AI Assistant',
    'ai.send': 'Send',
    'ai.typing': 'Typing...',
    'ai.error': 'AI Response Error',
    'ai.retry': 'Retry',
    'ai.stop': 'Stop',
    
    // Settings
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.shortcuts': 'Shortcuts',
    'settings.security': 'Security',
    'settings.proxy': 'Proxy',
    
    // Accessibility
    'a11y.keyboard': 'Keyboard Navigation',
    'a11y.focus': 'Focus',
    'a11y.screenReader': 'Screen Reader',
    'a11y.highContrast': 'High Contrast',
    
    // Responsive
    'responsive.mobile': 'Mobile',
    'responsive.tablet': 'Tablet',
    'responsive.desktop': 'Desktop'
  }
};

/**
 * I18nProvider组件 - i18n切换与文案占位组件
 */
export function I18nProvider({ children, defaultLocale = 'zh' }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [direction, setDirection] = useState('ltr');

  const availableLocales = ['zh', 'en'];
  
  // 检查是否为RTL语言
  useEffect(() => {
    const rtlLocales = ['ar', 'he', 'fa'];
    setDirection(rtlLocales.includes(locale) ? 'rtl' : 'ltr');
  }, [locale]);

  // 翻译函数
  const t = (key, params = {}) => {
    const translation = translations[locale]?.[key] || translations[zh]?.[key] || key;
    
    // 支持参数替换
    return Object.keys(params).reduce(
      (str, param) => str.replace(`{{${param}}}`, params[param]),
      translation
    );
  };

  // 切换语言
  const changeLocale = (newLocale) => {
    if (availableLocales.includes(newLocale)) {
      setLocale(newLocale);
      localStorage.setItem('locale', newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = direction;
    }
  };

  // 从localStorage恢复语言设置
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && availableLocales.includes(savedLocale)) {
      changeLocale(savedLocale);
    } else {
      // 检测浏览器语言
      const browserLocale = navigator.language.split('-')[0];
      if (availableLocales.includes(browserLocale)) {
        changeLocale(browserLocale);
      }
    }
  }, []);

  // 格式化日期
  const formatDate = (date, options = {}) => {
    const localeMap = {
      zh: 'zh-CN',
      en: 'en-US'
    };
    
    return new Date(date).toLocaleString(
      localeMap[locale] || locale,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
      }
    );
  };

  // 格式化数字
  const formatNumber = (num, options = {}) => {
    const localeMap = {
      zh: 'zh-CN',
      en: 'en-US'
    };
    
    return new Intl.NumberFormat(localeMap[locale] || locale, options).format(num);
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = locale === 'zh' 
      ? ['B', 'KB', 'MB', 'GB', 'TB']
      : ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 响应式断点
  const getResponsiveText = (breakpoint) => {
    return t(`responsive.${breakpoint}`);
  };

  const contextValue = {
    locale,
    t,
    setLocale: changeLocale,
    availableLocales,
    rtl: direction === 'rtl',
    direction,
    formatDate,
    formatNumber,
    formatFileSize,
    getResponsiveText
  };

  return (
    <I18nContext.Provider value={contextValue}>
      <div lang={locale} dir={direction} className="i18n-provider">
        {children}
        
        {/* 语言切换器 (可选显示) */}
        <div className="sr-only" role="status" aria-live="polite">
          {t('a11y.languageChanged', { locale: t(`common.${locale}`) })}
        </div>
      </div>
    </I18nContext.Provider>
  );
}

// Hook for using i18n
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// 预设组件
export const LanguageSwitcher = ({ className = '' }) => {
  const { locale, setLocale, availableLocales, t } = useI18n();
  
  return (
    <div className={`language-switcher ${className}`}>
      <label htmlFor="language-select" className="sr-only">
        {t('settings.language')}
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-gray-300 focus:outline-none focus:border-blue-500"
        aria-label={t('settings.language')}
      >
        {availableLocales.map(loc => (
          <option key={loc} value={loc}>
            {t(`common.${loc}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

export const TranslatedText = ({ key, params = [], className = '' }) => {
  const { t } = useI18n();
  
  return (
    <span className={className}>
      {t(key, params)}
    </span>
  );
};

export const ResponsiveText = ({ mobile = '', tablet = '', desktop = '', className = '' }) => {
  const { getResponsiveText } = useI18n();
  
  return (
    <span className={className}>
      <span className="block sm:hidden">
        {mobile || getResponsiveText('mobile')}
      </span>
      <span className="hidden sm:block md:hidden">
        {tablet || getResponsiveText('tablet')}
      </span>
      <span className="hidden md:block">
        {desktop || getResponsiveText('desktop')}
      </span>
    </span>
  );
};

export default I18nProvider;
