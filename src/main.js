import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/global.scss';
import { installEventSystem } from './utils/eventSystem.js';

const app = createApp(App);
const pinia = createPinia();

// 安装事件系统
app.use(installEventSystem);
app.use(pinia);
app.mount('#app');

console.log('✅ [MAIN] 应用已启动，包含Pinia和事件系统');
