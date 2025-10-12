import { useState, useEffect } from 'react';

/**
 * Theme hook for managing CSS variables and theme state
 */
export const useTheme = () => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
};

/**
 * Hook for accessing CSS variables
 */
export const useCSSVariables = () => {
  const getVariable = (name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  const setVariable = (name, value) => {
    document.documentElement.style.setProperty(name, value);
  };

  return {
    getVariable,
    setVariable
  };
};