# 深灰暗色系UI设计规范文档

## 1. 色彩 Tokens

VSCode 的色彩系统是深色主题优先，并且高度语义化。

### 全局色彩 Tokens

这些是原始的、不可再分的颜色值。

```json
{
  "color": {
    "black": "#000000",
    "white": "#ffffff",

    "gray-10": "#1e1e1e",
    "gray-20": "#252526",
    "gray-30": "#2d2d30",
    "gray-40": "#3e3e42",
    "gray-50": "#5a5a5a",
    "gray-60": "#7a7a7a",
    "gray-70": "#a0a0a0",
    "gray-80": "#cccccc",
    "gray-90": "#e0e0e0",

    "blue-10": "#04395e",
    "blue-20": "#0e639c",
    "blue-30": "#1177bb",
    "blue-40": "#3b9bda",

    "green-10": "#0a5c1f",
    "green-20": "#137c2a",
    "green-30": "#16a34a",

    "red-10": "#5a1d1d",
    "red-20": "#a1260d",
    "red-30": "#f14c4c",

    "yellow-10": "#5c4a00",
    "yellow-20": "#b89500",
    "yellow-30": "#e3b341",

    "orange-10": "#5c2d05",
    "orange-20": "#bb5500",
    "orange-30": "#f4872e",

    "purple-10": "#3c2a5c",
    "purple-20": "#7a3cbb"
  }
}
```

### 语义化/别名色彩 Tokens

这是核心，定义了颜色的用途，直接映射到全局 Token。

```json
  "color": {
    "alias": {
      // 背景色
      "background-primary": "{color.gray-10}",
      "background-secondary": "{color.gray-20}",
      "background-tertiary": "{color.gray-30}",
      "background-hover": "{color.gray-40}",

      // 前景色/文字色
      "foreground-primary": "{color.gray-90}",
      "foreground-secondary": "{color.gray-70}",
      "foreground-muted": "{color.gray-50}",
      "foreground-disabled": "{color.gray-40}",

      // 边框与轮廓
      "border-primary": "{color.gray-40}",
      "border-focus": "{color.blue-30}",
      
      // 交互状态色
      "interactive-primary": "{color.blue-30}",
      "interactive-primary-hover": "{color.blue-40}",
      
      // 语义化反馈色
      "status-info": "{color.blue-30}",
      "status-success": "{color.green-30}",
      "status-warning": "{color.yellow-30}",
      "status-error": "{color.red-30}",

      // 特殊元素高亮 (像列表项选中，匹配括号等)
      "highlight-primary": "{color.blue-10}",
      "highlight-secondary": "{color.gray-40}"
    }
  }
}
```

## 2. 字体与排版 Tokens

VSCode 使用 Segoe UI 字体族，并有一套清晰的字体层级。

```json
  "font": {
    "family": {
      "base": "'Segoe UI', 'SF Pro Display', -apple-system, 'BlinkMacSystemFont', 'System Font', 'San Francisco', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
      "monospace": "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', 'Source Code Pro', 'Consolas', 'Courier New', monospace"
    },
    "size": {
      "xs": "11px",
      "sm": "12px",
      "base": "13px",
      "lg": "14px",
      "xl": "16px",
      "2xl": "18px",
      "3xl": "20px"
    },
    "weight": {
      "normal": "400",
      "semibold": "600",
      "bold": "700"
    },
    "line-height": {
      "tight": "1.2",
      "normal": "1.4",
      "relaxed": "1.6"
    }
  },
  "typography": {
    "alias": {
      "ui-text": {
        "font-family": "{font.family.base}",
        "font-size": "{font.size.base}",
        "font-weight": "{font.weight.normal}",
        "line-height": "{font.line-height.normal}"
      },
      "code-text": {
        "font-family": "{font.family.monospace}",
        "font-size": "{font.size.base}",
        "font-weight": "{font.weight.normal}",
        "line-height": "{font.line-height.normal}"
      },
      "sidebar-heading": {
        "font-family": "{font.family.base}",
        "font-size": "{font.size.sm}",
        "font-weight": "{font.weight.semibold}",
        "line-height": "{font.line-height.tight}",
        "color": "{color.alias.foreground-muted}"
      },
      "status-bar-text": {
        "font-family": "{font.family.base}",
        "font-size": "{font.size.sm}",
        "font-weight": "{font.weight.normal}",
        "line-height": "{font.line-height.normal}"
      }
    }
  }
}
```

## 3. 间距与尺寸 Tokens

VSCode 的界面非常紧凑，使用基于 4px 或 5px 的基准单位。

```json
  "size": {
    "scale": {
      "0": "0",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "7": "32px",
      "8": "40px"
    },
    "base-unit": "4px"
  },
  "spacing": {
    "alias": {
      "container-padding": "{size.scale.4}", // 16px
      "element-margin": "{size.scale.2}",    // 8px
      "tight-gap": "{size.scale.1}",         // 4px
      "section-gap": "{size.scale.6}"        // 24px
    }
  },
  "border": {
    "width": {
      "thin": "1px"
    },
    "radius": {
      "none": "0",
      "small": "2px",
      "medium": "4px"
    }
  }
}
```

## 4. 阴影与效果 Tokens

VSCode 的界面非常扁平，很少使用阴影，但会有一些覆盖层。

```json
  "shadow": {
    "alias": {
      "overlay": "0 2px 8px rgba(0, 0, 0, 0.3)",
      "tooltip": "0 2px 8px rgba(0, 0, 0, 0.6)"
    }
  },
  "opacity": {
    "disabled": "0.5"
  }
}
```

## 5. 组件 Tokens

将上述 Token 组合，应用于具体组件。

```json
{
  "component": {
    "button": {
      "primary-background": "{color.alias.interactive-primary}",
      "primary-background-hover": "{color.alias.interactive-primary-hover}",
      "primary-text": "{color.white}",
      "border-radius": "{border.radius.small}"
    },
    "input": {
      "background": "{color.alias.background-secondary}",
      "background-focused": "{color.alias.background-primary}",
      "border": "{color.alias.border-primary}",
      "border-focused": "{color.alias.border-focus}",
      "text": "{color.alias.foreground-primary}",
      "placeholder": "{color.alias.foreground-muted}"
    },
    "sidebar": {
      "background": "{color.alias.background-secondary}",
      "item-background-hover": "{color.alias.background-hover}",
      "item-background-active": "{color.alias.highlight-primary}"
    },
    "status-bar": {
      "background": "{color.blue-20}",
      "foreground": "{color.alias.foreground-primary}",
      "font": "{typography.alias.status-bar-text}"
    }
  }
}
```

---

## 使用说明

本设计规范文档定义了一套完整的深灰暗色系UI设计系统，包括：

- **色彩系统**：从基础颜色到语义化别名的完整色彩体系
- **字体排版**：清晰的字体层级和排版规范
- **间距尺寸**：基于4px基准单位的间距系统
- **视觉效果**：阴影、透明度等效果定义
- **组件规范**：具体组件的Token应用

所有Token都遵循设计系统的最佳实践，确保UI的一致性和可维护性。
