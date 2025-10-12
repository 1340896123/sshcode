# SSH客户端UI组件开发TODO列表

## 当前进度概览
- ✅ 已完成: Button, Input, Tooltip, ChatMessage, Notification, Modal, Icon, Switch, Checkbox, Radio, Textarea, Select, Combobox, Badge, Tag, Progress, Code, Empty, Popover
- ✅ 布局组件: AppShell, Accordion, Breadcrumb, ResizableSplit, Tabs, Panel/Card
- ✅ 连接管理: ConnectionList, ConnectionItem, ConnectionSearchFilter, ConnectionForm, ConfirmDialog, ImportExport, TestConnection
- 🔄 下一步: 会话管理、文件管理、终端管理

## 第一阶段：通用基础组件 (Primitives) - 补充缺失
- [x] Button (已存在，需要增强)
- [x] Input (已存在，需要增强) 
- [x] Tooltip (已存在)
- [x] ChatMessage (已存在)
- [x] Notification (已存在)
- [x] Modal (已存在)
- [x] Icon (lucide-react封装)
- [x] Textarea (增强版Input)
- [x] Select/Combobox
- [x] Switch/Checkbox/Radio
- [x] Tag/StatusDot
- [x] Badge
- [x] Progress/Spinner
- [x] Code/MonoText (已完善)
- [x] Popover
- [x] Empty/Skeleton

## 第二阶段：布局与导航 (Layout & Navigation) - 补充缺失
- [x] AppShell
- [x] Breadcrumb
- [x] Tabs
- [x] Accordion
- [x] ResizableSplit
- [x] Panel/Card
- [ ] Grid/Flex工具类 (Tailwind原子化)

## 第三阶段：连接管理 (Connection Management)
- [x] ConnectionList
- [x] ConnectionItem
- [x] ConnectionSearchFilter
- [x] ConnectionForm
- [x] ConfirmDialog (增强版)
- [x] ImportExport
- [x] TestConnection

## 第四阶段：会话管理 (Session Management)
- [ ] SessionBar
- [ ] SessionTab
- [ ] SessionContextMenu
- [ ] NewSessionWizard
- [ ] TabInnerNav
- [ ] ThreePaneLayout

## 第五阶段：文件管理 (File Management)
- [ ] PathBar
- [ ] FileTable
- [ ] FileRow
- [ ] DirectoryTree
- [ ] FileToolbar
- [ ] CreateRenameDialog
- [ ] DeleteConfirm
- [ ] TransferQueue
- [ ] PermissionEditor
- [ ] Empty/ErrorState

## 第六阶段：终端管理 (Terminal Management)
- [ ] TerminalView (增强版)
- [ ] TerminalStatusBar
- [ ] CommandInput
- [ ] AutocompleteMenu
- [ ] SnippetList
- [ ] TerminalActions
- [ ] DragOverlay

## 第七阶段：AI助手 (AI Assistant)
- [ ] ChatThread (增强版ChatMessage)
- [ ] ChatInputBox
- [ ] ToolCallViewer
- [ ] AIActionControls
- [ ] PromptTemplatePicker
- [ ] ResultDiffViewer
- [ ] GuardrailNotice
- [ ] AttachmentPill

## 第八阶段：系统反馈 (Feedback & Overlays)
- [ ] Toasts (增强版Notification)
- [ ] LoadingBar
- [ ] Drawer
- [ ] CommandPalette
- [ ] ErrorBoundary
- [ ] UpdateBanner/OfflineNotice

## 第九阶段：设置与偏好 (Settings)
- [ ] ThemeSwitcher
- [ ] Keybindings
- [ ] TerminalThemePicker
- [ ] SecurityPanel
- [ ] ProxySettings
- [ ] LogViewer

## 第十阶段：复合组件 (Composite)
- [ ] ConnectionSelect
- [ ] ServerHealthCard
- [ ] FilePreview
- [ ] IdentityBadge

## 第十一阶段：辅助与无障碍 (A11y & i18n)
- [ ] FocusRing
- [ ] ARIA增强
- [ ] i18n支持
- [ ] 响应式断点

## 实现优先级
1. 🔴 高优先级: 连接管理、会话管理、文件管理
2. 🟡 中优先级: 终端管理、AI助手、系统反馈
3. 🟢 低优先级: 设置、复合组件、无障碍

## 技术要求
- 使用React + Tailwind CSS
- 支持暗色主题
- 完整的TypeScript类型定义
- 可访问性支持
- 响应式设计
- 组件变体管理 (CVA)
- 条件类名合并 (clsx)
