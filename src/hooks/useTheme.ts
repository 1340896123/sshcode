import { ref, onMounted, computed } from 'vue';

/**
 * Theme hook for managing CSS variables and theme state
 */
export const useTheme = () => {
  const theme = ref('dark');

  onMounted(() => {
    // Apply theme class to document root
    document.documentElement.className = theme.value === 'light' ? 'theme-light' : 'theme-dark';
  });

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    document.documentElement.className = theme.value === 'light' ? 'theme-light' : 'theme-dark';
  };

  return {
    theme,
    setTheme: (value) => {
      theme.value = value;
      document.documentElement.className = theme.value === 'light' ? 'theme-light' : 'theme-dark';
    },
    toggleTheme,
    isDark: computed(() => theme.value === 'dark'),
    isLight: computed(() => theme.value === 'light')
  };
};

/**
 * Hook for accessing CSS variables
 */
export const useCSSVariables = () => {
  const getVariable = name => {
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
