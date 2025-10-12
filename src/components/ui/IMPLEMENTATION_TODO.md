# SSH客户端UI组件实现待办列表

## 当前状态
✅ 已完成：基础组件、布局组件、连接管理组件
🔄 正在进行：会话管理组件

## 实现计划

### 第四阶段：会话管理 (Session Management)
- [ ] SessionBar - 会话栏组件
- [ ] SessionTab - 会话标签组件  
- [ ] SessionContextMenu - 会话上下文菜单
- [ ] NewSessionWizard - 新建会话向导
- [ ] TabInnerNav - 标签页内部导航
- [ ] ThreePaneLayout - 三分区布局

### 第五阶段：文件管理 (File Management)
- [ ] PathBar - 路径栏
- [ ] FileTable - 文件表格
- [ ] FileRow - 文件行
- [ ] DirectoryTree - 目录树
- [ ] FileToolbar - 文件工具栏
- [ ] CreateRenameDialog - 创建/重命名对话框
- [ ] DeleteConfirm - 删除确认
- [ ] TransferQueue - 传输队列
- [ ] PermissionEditor - 权限编辑器
- [ ] Empty/ErrorState - 空状态/错误状态

### 第六阶段：终端管理 (Terminal Management)
- [ ] TerminalView - 终端视图（增强版）
- [ ] TerminalStatusBar - 终端状态栏
- [ ] CommandInput - 命令输入
- [ ] AutocompleteMenu - 自动补全菜单
- [ ] SnippetList - 片段列表
- [ ] TerminalActions - 终端操作
- [ ] DragOverlay - 拖拽覆盖层

### 第七阶段：AI助手 (AI Assistant)
- [ ] ChatThread - 聊天线程
- [ ] ChatInputBox - 聊天输入框
- [ ] ToolCallViewer - 工具调用查看器
- [ ] AIActionControls - AI操作控制
- [ ] PromptTemplatePicker - 提示词模板选择器
- [ ] ResultDiffViewer - 结果差异查看器
- [ ] GuardrailNotice - 安全提示
- [ ] AttachmentPill - 附件药丸

### 第八阶段：系统反馈 (Feedback & Overlays)
- [ ] Toasts - 通知（增强版）
- [ ] LoadingBar - 加载条
- [ ] Drawer - 抽屉
- [ ] CommandPalette - 命令面板
- [ ] ErrorBoundary - 错误边界
- [ ] UpdateBanner - 更新横幅
- [ ] OfflineNotice - 离线提示

### 第九阶段：设置与偏好 (Settings)
- [ ] ThemeSwitcher - 主题切换器
- [ ] Keybindings - 键位设置
- [ ] TerminalThemePicker - 终端主题选择器
- [ ] SecurityPanel - 安全面板
- [ ] ProxySettings - 代理设置
- [ ] LogViewer - 日志查看器

### 第十阶段：复合组件 (Composite)
- [ ] ConnectionSelect - 连接选择器
- [ ] ServerHealthCard - 服务器健康卡片
- [ ] FilePreview - 文件预览器
- [ ] IdentityBadge - 身份徽章

### 第十一阶段：辅助与无障碍 (A11y & i18n)
- [ ] FocusRing - 焦点环
- [ ] ARIA增强
- [ ] i18n支持
- [ ] 响应式断点

## 技术要求
- 使用 React + Tailwind CSS
- 支持 forwardRef
- 使用 CVA 进行变体管理
- 使用 clsx 进行类名合并
- TypeScript 类型定义
- 可访问性支持
- 暗色主题优先
- 响应式设计

## 开始实现
从第四阶段会话管理组件开始实现。
