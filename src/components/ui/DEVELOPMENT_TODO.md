# SSH客户端UI组件开发待办清单

## 当前状态分析

### 已完成的组件
- ✅ Button (基础版本，需要增强)
- ✅ Input (基础版本，需要增强)
- ✅ Tooltip
- ✅ ChatMessage
- ✅ Notification
- ✅ Modal
- ✅ Icon (完整的lucide-react封装)
- ✅ Textarea (增强版)
- ✅ Select (基础版本)
- ✅ Switch/Checkbox/Radio
- ✅ Tag/StatusDot
- ✅ Badge
- ✅ Progress/Spinner
- ✅ Code/MonoText
- ✅ Popover
- ✅ Empty/Skeleton

### 需要增强的现有组件
- 🔄 Button (添加outline/ghost变体，统一设计系统)
- 🔄 Input (添加prefix/suffix, clearable, error状态)
- 🔄 Select (增强为Combobox，支持搜索)

## 开发计划

### 第一阶段：增强现有基础组件
- [ ] 增强Button组件 (添加solid/outline/ghost变体，统一size系统)
- [ ] 增强Input组件 (添加prefix/suffix, clearable, error状态)
- [ ] 增强Select组件 (改为Combobox，支持搜索和键盘导航)

### 第二阶段：布局与导航组件
- [ ] AppShell (顶部栏 + 侧栏 + 内容区 + 状态栏)
- [ ] Breadcrumb (文件管理路径)
- [ ] Tabs (可关闭、可拖拽排序、溢出滚动)
- [ ] Accordion (可折叠面板)
- [ ] ResizableSplit (可调整大小的分栏)
- [ ] Panel/Card (列表容器与表单容器)

### 第三阶段：连接管理组件
- [ ] ConnectionList (连接列表)
- [ ] ConnectionItem (连接项)
- [ ] ConnectionSearchFilter (搜索与筛选)
- [ ] ConnectionForm (连接表单)
- [ ] ConfirmDialog (危险操作确认)
- [ ] ImportExport (导入导出)
- [ ] TestConnection (测试连接)

### 第四阶段：会话管理组件
- [ ] SessionBar (会话栏)
- [ ] SessionTab (会话标签)
- [ ] SessionContextMenu (会话上下文菜单)
- [ ] NewSessionWizard (新建会话向导)
- [ ] TabInnerNav (标签页内部导航)
- [ ] ThreePaneLayout (三分区布局)

### 第五阶段：文件管理组件
- [ ] PathBar (路径栏)
- [ ] FileTable (文件表)
- [ ] FileRow (文件行)
- [ ] DirectoryTree (目录树)
- [ ] FileToolbar (操作条)
- [ ] CreateRenameDialog (新建/重命名对话框)
- [ ] DeleteConfirm (删除确认)
- [ ] TransferQueue (传输队列)
- [ ] PermissionEditor (权限编辑)
- [ ] Empty/ErrorState (空状态与错误)

### 第六阶段：终端管理组件
- [ ] TerminalView (增强版终端视图)
- [ ] TerminalStatusBar (会话状态条)
- [ ] CommandInput (命令输入)
- [ ] AutocompleteMenu (自动补全菜单)
- [ ] SnippetList (片段列表)
- [ ] TerminalActions (终端操作)
- [ ] DragOverlay (拖放提示)

### 第七阶段：AI助手组件
- [ ] ChatThread (聊天窗口)
- [ ] ChatInputBox (消息输入)
- [ ] ToolCallViewer (工具调用区域)
- [ ] AIActionControls (中断/撤销控制)
- [ ] PromptTemplatePicker (提示词模板)
- [ ] ResultDiffViewer (结果预检)
- [ ] GuardrailNotice (权限提示)
- [ ] AttachmentPill (引用与上下文)

### 第八阶段：系统反馈组件
- [ ] Toasts (增强版通知)
- [ ] LoadingBar (全局加载条)
- [ ] Drawer (抽屉)
- [ ] CommandPalette (命令面板)
- [ ] ErrorBoundary (错误边界)
- [ ] UpdateBanner (更新提示)
- [ ] OfflineNotice (离线提示)

### 第九阶段：设置组件
- [ ] ThemeSwitcher (主题切换)
- [ ] Keybindings (键位设置)
- [ ] TerminalThemePicker (终端主题)
- [ ] SecurityPanel (安全与隐私)
- [ ] ProxySettings (代理与网络)
- [ ] LogViewer (日志与诊断)

### 第十阶段：复合组件
- [ ] ConnectionSelect (选择连接下拉)
- [ ] ServerHealthCard (服务器健康卡片)
- [ ] FilePreview (文件预览器)
- [ ] IdentityBadge (身份徽章)

### 第十一阶段：无障碍组件
- [ ] FocusRing (焦点可见)
- [ ] ARIA增强支持
- [ ] i18n国际化支持
- [ ] 响应式断点优化

## 技术要求

### 设计系统
- 统一的颜色系统 (基于VS Code Dark主题)
- 一致的间距系统 (4px基准)
- 标准化的字体大小和权重
- 统一的圆角和阴影

### 组件规范
- 使用forwardRef支持ref传递
- 完整的TypeScript类型定义
- 可访问性支持 (ARIA属性)
- 键盘导航支持
- 响应式设计

### 性能优化
- 使用React.memo优化重渲染
- 合理的useCallback和useMemo使用
- 懒加载和代码分割
- 虚拟滚动 (大列表)

## 开发优先级

1. **高优先级** (核心功能)
   - 增强基础组件
   - 布局组件 (AppShell, Tabs, ResizableSplit)
   - 连接管理组件
   - 会话管理组件

2. **中优先级** (重要功能)
   - 文件管理组件
   - 终端管理组件
   - AI助手组件

3. **低优先级** (增强功能)
   - 系统反馈组件
   - 设置组件
   - 复合组件
   - 无障碍组件

## 质量保证

### 测试要求
- 每个组件都有基本的交互测试
- 关键组件有完整的单元测试
- 集成测试覆盖主要用户流程

### 代码质量
- ESLint规则检查
- Prettier代码格式化
- 组件文档和示例
- 类型安全检查

### 用户体验
- 流畅的动画和过渡
- 直观的交互反馈
- 错误处理和边界情况
- 加载状态和空状态处理
