import { computed } from 'vue';
import { useCSSVariables } from './useTheme';

// Helper function to get CSS variable value
const getVariable = name => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  return '';
};

/**
 * Hook for generating component styles based on CSS variables
 */
export const useComponentStyles = (componentType, props = {}) => {
  return computed(() => {
    const styles = {
      // Common spacing values
      space: {
        2: getVariable('--space-2') || '8px',
        3: getVariable('--space-3') || '12px',
        4: getVariable('--space-4') || '16px'
      },
      // Common radius values
      radius: {
        sm: getVariable('--radius-sm') || '4px',
        md: getVariable('--radius-md') || '6px',
        lg: getVariable('--radius-lg') || '8px'
      },
      // Colors
      colors: {
        'bg-primary': getVariable('--bg-primary'),
        'bg-secondary': getVariable('--bg-secondary'),
        'bg-tertiary': getVariable('--bg-tertiary'),
        'text-primary': getVariable('--text-primary'),
        'text-secondary': getVariable('--text-secondary'),
        'text-muted': getVariable('--text-muted'),
        'border-strong': getVariable('--border-strong'),
        'border-soft': getVariable('--border-soft'),
        'accent-primary': getVariable('--accent-primary'),
        'accent-success': getVariable('--accent-success'),
        'accent-warning': getVariable('--accent-warning'),
        'accent-error': getVariable('--accent-error'),
        'accent-info': getVariable('--accent-info')
      }
    };

    switch (componentType) {
      case 'button':
        return getButtonStyles(styles, props);
      case 'input':
        return getInputStyles(styles, props);
      case 'select':
        return getSelectStyles(styles, props);
      default:
        return styles;
    }
  });
};

const getButtonStyles = (
  styles,
  {
    variant = 'solid',
    color = 'primary',
    size = 'md',
    disabled = false,
    iconOnly = false,
    rounded = false,
    fullWidth = false
  }
) => {
  const sizeConfig = {
    sm: {
      padding: iconOnly ? '6px' : '12px 12px',
      fontSize: getVariable('--font-size-sm'),
      iconSize: '16px',
      gap: getVariable('--spacing-tight-gap')
    },
    md: {
      padding: iconOnly ? '8px' : '16px 16px',
      fontSize: getVariable('--font-size-lg'),
      iconSize: '20px',
      gap: getVariable('--spacing-element-margin')
    },
    lg: {
      padding: iconOnly ? '12px' : '24px 24px',
      fontSize: getVariable('--font-size-xl'),
      iconSize: '24px',
      gap: getVariable('--spacing-container-padding')
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const variantStyles = {
    solid: {
      primary: {
        backgroundColor: getVariable('--button-primary-background'),
        color: getVariable('--button-primary-text'),
        border: 'none',
        borderRadius: getVariable('--button-primary-border-radius')
      },
      secondary: {
        backgroundColor: getVariable('--background-tertiary'),
        color: getVariable('--foreground-secondary'),
        border: 'none'
      },
      success: {
        backgroundColor: getVariable('--status-success'),
        color: getVariable('--color-white'),
        border: 'none'
      },
      warning: {
        backgroundColor: getVariable('--status-warning'),
        color: getVariable('--color-black'),
        border: 'none'
      },
      error: {
        backgroundColor: getVariable('--status-error'),
        color: getVariable('--color-white'),
        border: 'none'
      },
      info: {
        backgroundColor: getVariable('--status-info'),
        color: getVariable('--color-white'),
        border: 'none'
      }
    },
    outline: {
      primary: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-info'],
        border: `1px solid ${styles.colors['border-strong']}`
      },
      secondary: {
        backgroundColor: 'transparent',
        color: styles.colors['text-secondary'],
        border: `1px solid ${styles.colors['border-strong']}`
      },
      success: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-success'],
        border: `1px solid ${styles.colors['border-strong']}`
      },
      warning: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-warning'],
        border: `1px solid ${styles.colors['border-strong']}`
      },
      error: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-error'],
        border: `1px solid ${styles.colors['border-strong']}`
      },
      info: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-info'],
        border: `1px solid ${styles.colors['border-strong']}`
      }
    },
    ghost: {
      primary: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-info'],
        border: 'none'
      },
      secondary: {
        backgroundColor: 'transparent',
        color: styles.colors['text-secondary'],
        border: 'none'
      },
      success: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-success'],
        border: 'none'
      },
      warning: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-warning'],
        border: 'none'
      },
      error: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-error'],
        border: 'none'
      },
      info: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-info'],
        border: 'none'
      }
    },
    link: {
      primary: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-info'],
        border: 'none',
        textDecoration: 'underline'
      },
      secondary: {
        backgroundColor: 'transparent',
        color: styles.colors['text-secondary'],
        border: 'none',
        textDecoration: 'underline'
      },
      success: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-success'],
        border: 'none',
        textDecoration: 'underline'
      },
      warning: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-warning'],
        border: 'none',
        textDecoration: 'underline'
      },
      error: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-error'],
        border: 'none',
        textDecoration: 'underline'
      },
      info: {
        backgroundColor: 'transparent',
        color: styles.colors['accent-info'],
        border: 'none',
        textDecoration: 'underline'
      }
    }
  };

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: getVariable('--font-family-base'),
    fontWeight: getVariable('--font-weight-semibold'),
    fontSize: config.fontSize,
    padding: config.padding,
    gap: iconOnly ? '0' : config.gap,
    borderRadius: rounded ? '50%' : getVariable('--border-radius-small'),
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? getVariable('--opacity-disabled') : 1,
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    transform: 'translateZ(0)',
    willChange: 'transform',
    width: fullWidth ? '100%' : 'auto',
    lineHeight: getVariable('--line-height-normal'),
    ...variantStyles[variant]?.[color]
  };

  return { baseStyle, config };
};

const getInputStyles = (
  styles,
  { size = 'md', error = false, disabled = false, readonly = false }
) => {
  const sizeConfig = {
    sm: {
      height: '32px',
      padding: getVariable('--spacing-element-margin'),
      fontSize: getVariable('--font-size-sm'),
      iconSize: '16px'
    },
    md: {
      height: '40px',
      padding: getVariable('--spacing-container-padding'),
      fontSize: getVariable('--font-size-lg'),
      iconSize: '20px'
    },
    lg: {
      height: '48px',
      padding: '16px',
      fontSize: getVariable('--font-size-xl'),
      iconSize: '24px'
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const baseStyle = {
    width: '100%',
    height: config.height,
    backgroundColor: getVariable('--input-background'),
    border: `1px solid ${error ? getVariable('--status-error') : getVariable('--input-border')}`,
    borderRadius: getVariable('--border-radius-small'),
    fontFamily: getVariable('--font-family-mono'),
    fontSize: config.fontSize,
    color: getVariable('--input-text'),
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
    opacity: disabled ? getVariable('--opacity-disabled') : 1,
    cursor: disabled ? 'not-allowed' : readonly ? 'default' : 'text',
    lineHeight: getVariable('--line-height-normal')
  };

  const focusStyle = {
    backgroundColor: getVariable('--input-background-focused'),
    borderColor: error ? getVariable('--status-error') : getVariable('--input-border-focused'),
    boxShadow: `0 0 0 1px ${error ? getVariable('--status-error') : getVariable('--input-border-focused')}, inset 0 1px 2px rgba(0, 0, 0, 0.1)`
  };

  return { baseStyle, focusStyle, config };
};

const getSelectStyles = (styles, { size = 'md', variant = 'default', disabled = false }) => {
  const sizeConfig = {
    sm: {
      height: '32px',
      padding: getVariable('--spacing-element-margin'),
      fontSize: getVariable('--font-size-sm')
    },
    md: {
      height: '40px',
      padding: getVariable('--spacing-container-padding'),
      fontSize: getVariable('--font-size-lg')
    },
    lg: {
      height: '48px',
      padding: '16px',
      fontSize: getVariable('--font-size-xl')
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const baseStyle = {
    position: 'relative',
    width: '100%',
    height: config.height,
    backgroundColor: getVariable('--input-background'),
    border: `1px solid ${getVariable('--input-border')}`,
    borderRadius: getVariable('--border-radius-small'),
    fontFamily: getVariable('--font-family-base'),
    fontSize: config.fontSize,
    color: getVariable('--input-text'),
    outline: 'none',
    transition: 'all 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? getVariable('--opacity-disabled') : 1,
    lineHeight: getVariable('--line-height-normal')
  };

  const variantStyles = {
    default: {},
    error: {
      borderColor: getVariable('--status-error')
    },
    success: {
      borderColor: getVariable('--status-success')
    },
    warning: {
      borderColor: getVariable('--status-warning')
    }
  };

  return {
    baseStyle: { ...baseStyle, ...variantStyles[variant] },
    config,
    dropdownStyle: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 50,
      marginTop: getVariable('--spacing-tight-gap'),
      backgroundColor: getVariable('--background-tertiary'),
      border: `1px solid ${getVariable('--border-primary')}`,
      borderRadius: getVariable('--radius-lg'),
      boxShadow: getVariable('--shadow-lg'),
      maxHeight: '240px',
      overflow: 'auto'
    }
  };
};
