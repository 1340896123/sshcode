# SSH客户端UI组件库实现计划

## 项目概述
基于React + Tailwind CSS实现完整的SSH客户端UI组件库，包含11大类组件。

## 实现顺序

### 第一阶段：通用基础组件 (Primitives)
- [x] Button (已存在，需要增强)
- [x] Input (已存在，需要增强) 
- [x] Tooltip (已存在)
- [x] ChatMessage (已存在)
- [x] Notification (已存在)
- [x] Modal (已存在)
- [ ] Icon (lucide-react封装)
- [ ] Textarea (增强版Input)
- [ ] Select/Combobox
- [ ] Switch/Checkbox/Radio
- [ ] Tag/StatusDot
- [ ] Badge
- [ ] Progress/Spinner
- [ ] Code/MonoText
- [ ] Popover
- [ ] Empty/Skeleton

### 第二阶段：布局与导航 (Layout & Navigation)
- [ ] AppShell
- [ ] Breadcrumb
- [ ] Tabs
- [ ] Accordion
- [ ] ResizableSplit
- [ ] Panel/Card
- [ ] Grid/Flex工具类

### 第三阶段：连接管理 (Connection Management)
- [ ] ConnectionList
- [ ] ConnectionItem
- [ ] ConnectionSearchFilter
- [ ] ConnectionForm
- [ ] ConfirmDialog (增强版)
- [ ] ImportExport
- [ ] TestConnection

### 第四阶段：会话管理 (Session Management)
- [ ] SessionBar
- [ ] SessionTab
- [ ] SessionContextMenu
- [ ] NewSessionWizard
- [ ] TabInnerNav
- [ ] ThreePaneLayout

### 第五阶段：文件管理 (File Management)
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

### 第六阶段：终端管理 (Terminal Management)
- [ ] TerminalView (增强版)
- [ ] TerminalStatusBar
- [ ] CommandInput
- [ ] AutocompleteMenu
- [ ] SnippetList
- [ ] TerminalActions
- [ ] DragOverlay

### 第七阶段：AI助手 (AI Assistant)
- [ ] ChatThread (增强版ChatMessage)
- [ ] ChatInputBox
- [ ] ToolCallViewer
- [ ] AIActionControls
- [ ] PromptTemplatePicker
- [ ] ResultDiffViewer
- [ ] GuardrailNotice
- [ ] AttachmentPill

### 第八阶段：系统反馈 (Feedback & Overlays)
- [ ] Toasts (增强版Notification)
- [ ] LoadingBar
- [ ] Drawer
- [ ] CommandPalette
- [ ] ErrorBoundary
- [ ] UpdateBanner/OfflineNotice

### 第九阶段：设置与偏好 (Settings)
- [ ] ThemeSwitcher
- [ ] Keybindings
- [ ] TerminalThemePicker
- [ ] SecurityPanel
- [ ] ProxySettings
- [ ] LogViewer

### 第十阶段：复合组件 (Composite)
- [ ] ConnectionSelect
- [ ] ServerHealthCard
- [ ] FilePreview
- [ ] IdentityBadge

### 第十一阶段：辅助与无障碍 (A11y & i18n)
- [ ] FocusRing
- [ ] ARIA增强
- [ ] i18n支持
- [ ] 响应式断点

## 技术规范

### 样式系统
- 使用Tailwind CSS v4
- 统一的颜色系统
- 暗色主题优先
- 响应式设计

### 组件规范
- 使用class-variance-authority进行变体管理
- 使用clsx进行条件类名合并
- 支持forwardRef
- 完整的TypeScript类型定义
- 可访问性支持

### 文件结构
```
src/components/ui/
├── primitives/           # 基础组件
├── layout/              # 布局组件
├── connection/          # 连接管理
├── session/             # 会话管理
├── file/                # 文件管理
├── terminal/            # 终端管理
├── ai/                  # AI助手
├── feedback/            # 系统反馈
├── settings/            # 设置
├── composite/           # 复合组件
├── a11y/               # 无障碍
└── utils/              # 工具函数
```

## 开始实现
现在开始第一阶段的实现，从最基础的组件开始。
