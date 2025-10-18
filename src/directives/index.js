import { clickOutside } from './clickOutside';

// 导出所有指令
export {
  clickOutside
};

export default {
  install(app) {
    // 注册所有指令
    app.directive('click-outside', clickOutside);
  }
};