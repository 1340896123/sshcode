/**
 * v-click-outside directive
 * Detects clicks outside of an element
 */
export const clickOutside = {
  // 初始化指令
  mounted(el, binding) {
    el._clickOutside = {
      handler: (event) => {
        // 检查点击是否在元素外部
        if (!(el === event.target || el.contains(event.target))) {
          // 调用绑定的方法
          binding.value(event);
        }
      }
    };

    // 添加事件监听器
    document.addEventListener('click', el._clickOutside.handler, true);
  },

  // 更新指令
  updated(el, binding) {
    // 如果方法改变了，更新处理器
    if (el._clickOutside.handler !== binding.value) {
      el._clickOutside.handler = binding.value;
    }
  },

  // 卸载指令
  unmounted(el) {
    // 移除事件监听器
    if (el._clickOutside && el._clickOutside.handler) {
      document.removeEventListener('click', el._clickOutside.handler, true);
    }
    delete el._clickOutside;
  }
};

export default clickOutside;