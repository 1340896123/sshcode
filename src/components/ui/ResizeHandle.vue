<template>
  <div
    class="resize-handle"
    :class="{
      'is-resizing': isResizing,
      [direction]: true
    }"
    @mousedown="startResize"
    :title="title"
  >
    <div class="resize-dots" v-if="showDots">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="resize-line" v-else></div>
  </div>
</template>

<script>
import { ref, onUnmounted } from 'vue'

export default {
  name: 'ResizeHandle',
  props: {
    // 分割方向：horizontal（水平）或 vertical（垂直）
    direction: {
      type: String,
      default: 'horizontal',
      validator: (value) => ['horizontal', 'vertical'].includes(value)
    },
    // 最小尺寸
    minSize: {
      type: Number,
      default: 60
    },
    // 最大尺寸
    maxSize: {
      type: Number,
      default: 300
    },
    // 初始尺寸
    initialSize: {
      type: Number,
      default: 100
    },
    // 是否显示拖动点
    showDots: {
      type: Boolean,
      default: true
    },
    // 提示文本
    title: {
      type: String,
      default: '拖动调整大小'
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['resize-start', 'resize', 'resize-end'],
  setup(props, { emit }) {
    const isResizing = ref(false)
    const startPosition = ref(0)
    const startSize = ref(props.initialSize)

    // 开始拖动
    const startResize = (event) => {
      if (props.disabled) return
      
      isResizing.value = true
      startPosition.value = props.direction === 'horizontal' ? event.clientY : event.clientX
      startSize.value = props.initialSize

      // 添加全局事件监听器
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
      
      // 设置鼠标样式
      document.body.style.cursor = props.direction === 'horizontal' ? 'ns-resize' : 'ew-resize'
      document.body.style.userSelect = 'none'

      // 触发开始事件
      emit('resize-start', {
        size: startSize.value,
        position: startPosition.value
      })

      event.preventDefault()
    }

    // 处理拖动
    const handleResize = (event) => {
      if (!isResizing.value) return

      const currentPosition = props.direction === 'horizontal' ? event.clientY : event.clientX
      const delta = currentPosition - startPosition.value
      
      // 计算新尺寸
      let newSize
      if (props.direction === 'horizontal') {
        newSize = Math.max(props.minSize, Math.min(props.maxSize, startSize.value - delta))
      } else {
        newSize = Math.max(props.minSize, Math.min(props.maxSize, startSize.value + delta))
      }

      // 触发调整大小事件
      emit('resize', {
        size: newSize,
        delta: delta,
        startPosition: startPosition.value,
        currentPosition: currentPosition
      })
    }

    // 停止拖动
    const stopResize = () => {
      if (!isResizing.value) return

      isResizing.value = false
      
      // 移除全局事件监听器
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
      
      // 恢复鼠标样式
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      // 触发结束事件
      emit('resize-end', {
        size: startSize.value
      })
    }

    // 组件卸载时清理事件监听器
    onUnmounted(() => {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
    })

    return {
      isResizing,
      startResize
    }
  }
}
</script>

<style lang="scss" scoped>
.resize-handle {
  position: relative;
  background: #2a2a2a;
  border: 1px solid #444;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  user-select: none;

  // 水平方向（上下拖动）
  &.horizontal {
    height: 8px;
    border-top: 1px solid #444;
    border-bottom: 1px solid #444;
    cursor: ns-resize;

    &:hover {
      background: #333;
      border-color: #555;

      .resize-dots span {
        background: #74c0fc;
      }

      .resize-line {
        background: #74c0fc;
      }
    }

    &:active,
    &.is-resizing {
      background: #3a3a3a;

      .resize-dots span {
        background: #91a7ff;
      }

      .resize-line {
        background: #91a7ff;
      }
    }

    .resize-dots {
      display: flex;
      gap: 3px;
      align-items: center;

      span {
        width: 4px;
        height: 4px;
        background: #666;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
    }

    .resize-line {
      width: 30px;
      height: 2px;
      background: #666;
      border-radius: 1px;
      transition: all 0.2s ease;
    }
  }

  // 垂直方向（左右拖动）
  &.vertical {
    width: 8px;
    border-left: 1px solid #444;
    border-right: 1px solid #444;
    cursor: ew-resize;

    &:hover {
      background: #333;
      border-color: #555;

      .resize-dots span {
        background: #74c0fc;
      }

      .resize-line {
        background: #74c0fc;
      }
    }

    &:active,
    &.is-resizing {
      background: #3a3a3a;

      .resize-dots span {
        background: #91a7ff;
      }

      .resize-line {
        background: #91a7ff;
      }
    }

    .resize-dots {
      display: flex;
      flex-direction: column;
      gap: 3px;
      align-items: center;

      span {
        width: 4px;
        height: 4px;
        background: #666;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
    }

    .resize-line {
      width: 2px;
      height: 30px;
      background: #666;
      border-radius: 1px;
      transition: all 0.2s ease;
    }
  }

  // 禁用状态
  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;

    &:hover {
      background: #2a2a2a;
      border-color: #444;

      .resize-dots span {
        background: #666;
      }

      .resize-line {
        background: #666;
      }
    }
  }

  // 拖动时的视觉反馈
  &.is-resizing {
    z-index: 100;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .resize-handle {
    &.horizontal {
      height: 12px;

      .resize-dots {
        gap: 4px;

        span {
          width: 5px;
          height: 5px;
        }
      }

      .resize-line {
        width: 40px;
        height: 3px;
      }
    }

    &.vertical {
      width: 12px;

      .resize-dots {
        gap: 4px;

        span {
          width: 5px;
          height: 5px;
        }
      }

      .resize-line {
        width: 3px;
        height: 40px;
      }
    }
  }
}
</style>
