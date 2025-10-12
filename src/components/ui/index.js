// UI组件统一导出文件

// 原有组件 - 已移动到适当目录
export { default as Button } from './primitives/Button';
export { default as Input } from './primitives/Input';
export { default as Tooltip } from './primitives/Tooltip';
export { default as ChatMessage, ChatMessageLoading } from './ai/ChatMessage';
export { default as NotificationContainer, useNotification } from './feedback/Notification';
export { default as Modal, ConfirmDialog as ModalConfirmDialog, AlertDialog } from './feedback/Modal';

// 基础组件 (Primitives)
export { default as Icon, icons } from './primitives/Icon';
export {
  default as Textarea,
  TextareaWithCounter,
  TextareaWithToolbar
} from './primitives/Textarea';
export {
  default as Select,
  MultiSelect
} from './primitives/Select';
export {
  default as Combobox,
  SearchableSelect,
  CreatableSelect,
  MultiSelectCombobox,
  TagSelect
} from './primitives/Combobox';
export {
  default as Switch,
  Checkbox,
  Radio,
  RadioGroup,
  CheckboxGroup
} from './primitives/Switch';
export {
  default as Tag,
  StatusDot,
  StatusWithText,
  TagGroup,
  InteractiveTag
} from './primitives/Tag';
export {
  default as Badge,
  CountBadge,
  DotBadge,
  StatusBadge,
  EnvironmentBadge,
  ConnectionBadge,
  PositionedBadge,
  BadgeGroup
} from './primitives/Badge';
export {
  default as Progress,
  CircularProgress,
  Spinner,
  DotsSpinner,
  PulseSpinner,
  ProgressGroup,
  StepProgress
} from './primitives/Progress';
export {
  default as Code,
  MonoText,
  InlineCode,
  CodeBlock,
  SyntaxHighlighter,
  PathText,
  CommandText,
  KeyText,
  VersionText,
  HashText,
  IPText,
  PortText
} from './primitives/Code';
export {
  default as Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverConfirm,
  HoverCard
} from './primitives/Popover';
export {
  default as Empty,
  Skeleton,
  SkeletonGroup,
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
  EmptyState as PrimitiveEmptyState,
  LoadingState
} from './primitives/Empty';

// 布局组件 (Layout & Navigation)
export {
  default as AppShell,
  Topbar,
  Sidebar,
  SidebarSection,
  StatusBar
} from './layout/AppShell';
export {
  default as Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  FileBreadcrumb,
  URLBreadcrumb
} from './layout/Breadcrumb';
export {
  default as Tabs,
  Tab,
  TabPanel,
  TabList,
  TabPanels
} from './layout/Tabs';
export {
  default as Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionContent,
  ConnectionAccordion,
  LogAccordion
} from './layout/Accordion';
export { default as ResizableSplit } from './layout/ResizableSplit';
export { default as SplitPane } from './layout/SplitPane';
export { default as ThreePaneSplit } from './layout/ThreePaneSplit';
export { default as FileExplorerSplit } from './layout/FileExplorerSplit';
export { default as TerminalSplit } from './layout/TerminalSplit';
export {
  default as Panel,
  Card,
  CardSection,
  CardGrid,
  CollapsibleCard,
  StatsCard,
  ListCard
} from './layout/Panel';

// 连接管理组件 (Connection Management)
export {
  default as ConnectionList,
  ConnectionGroup
} from './connection/ConnectionList';
export {
  default as ConnectionItem,
  ConnectionItemCompact,
  ConnectionItemDetailed
} from './connection/ConnectionItem';
export {
  default as ConnectionSearchFilter,
  QuickSearch
} from './connection/ConnectionSearchFilter';
export {
  default as ConnectionForm,
  ConnectionFormModal
} from './connection/ConnectionForm';
export {
  default as ImportExport,
  ImportExportModal,
  QuickExportButton,
  QuickImportButton
} from './connection/ImportExport';
export {
  default as TestConnection,
  InlineTestConnection,
  CompactTestConnection
} from './connection/TestConnection';

// 会话管理组件 (Session Management)
export {
  SessionBar,
  SessionBarCompact,
  SessionBarMinimal
} from './session/SessionBar';
export {
  SessionTab,
  SessionTabCompact,
  SessionTabMinimal
} from './session/SessionTab';
export {
  SessionContextMenu
} from './session/SessionContextMenu';
export {
  NewSessionWizard
} from './session/NewSessionWizard';
export {
  TabInnerNav
} from './session/TabInnerNav';
export {
  ThreePaneLayout
} from './session/ThreePaneLayout';

// 文件管理组件 (File Management)
export {
  PathBar
} from './file/PathBar';
export {
  FileTable
} from './file/FileTable';
export {
  FileRow
} from './file/FileRow';
export {
  DirectoryTree,
  DirectoryTreeNode
} from './file/DirectoryTree';
export {
  FileToolbar,
  QuickFileToolbar,
  MinimalFileToolbar
} from './file/FileToolbar';
export {
  CreateRenameDialog,
  QuickCreateDialog,
  RenameDialog
} from './file/CreateRenameDialog';
export {
  DeleteConfirm,
  QuickDeleteConfirm,
  BatchDeleteConfirm
} from './file/DeleteConfirm';
export {
  TransferQueue,
  CompactTransferQueue,
  MinimalTransferQueue
} from './file/TransferQueue';
export {
  PermissionEditor,
  QuickPermissionEditor
} from './file/PermissionEditor';
export {
  EmptyState,
  FileEmptyState,
  DirectoryEmptyState,
  SearchEmptyState,
  ErrorState,
  NoPermissionState,
  DisconnectedState,
  MinimalEmptyState
} from './file/EmptyState';

// 反馈组件 (Feedback & Overlays)
export {
  default as ConfirmDialog,
  DeleteConfirmDialog,
  DisconnectConfirmDialog,
  OverwriteConfirmDialog,
  BatchOperationConfirmDialog,
  SettingsChangeConfirmDialog
} from './feedback/ConfirmDialog';
export {
  Toast,
  ToastContainer,
  SuccessToast,
  ErrorToast,
  WarningToast,
  InfoToast,
  useToast
} from './feedback/Toast';
export {
  LoadingBar,
  GlobalLoadingBar,
  LoadingBarProvider,
  useLoadingBar,
  useAsyncLoading,
  TopLoadingBar,
  BottomLoadingBar,
  FixedLoadingBar,
  BlueLoadingBar,
  GreenLoadingBar,
  RedLoadingBar
} from './feedback/LoadingBar';
export {
  CommandPalette,
  ConnectionCommandPalette,
  useCommandPalette
} from './feedback/CommandPalette';
export {
  ErrorBoundary,
  MinimalErrorBoundary,
  FullErrorBoundary,
  DevelopmentErrorBoundary,
  useErrorHandler,
  withErrorBoundary
} from './feedback/ErrorBoundary';
export {
  UpdateBanner,
  AutoUpdateBanner,
  SilentUpdateBanner,
  useUpdateManager
} from './feedback/UpdateBanner';
export {
  OfflineNotice,
  NetworkStatusIndicator,
  PersistentOfflineNotice,
  useNetworkStatus
} from './feedback/OfflineNotice';

// 终端管理组件 (Terminal Management)
export {
  TerminalView,
  terminalThemes
} from './terminal/TerminalView';
export {
  TerminalStatusBar,
  MinimalTerminalStatusBar,
  FullTerminalStatusBar,
  ConnectionStatusBar,
  TransferStatusBar
} from './terminal/TerminalStatusBar';
export {
  CommandInput,
  SingleLineCommandInput,
  MultiLineCommandInput,
  HistoryEnabledCommandInput,
  SearchCommandInput,
  SecureCommandInput
} from './terminal/CommandInput';
export {
  AutocompleteMenu,
  CommandAutocompleteMenu,
  PathAutocompleteMenu,
  HistoryAutocompleteMenu,
  SnippetAutocompleteMenu
} from './terminal/AutocompleteMenu';
export {
  SnippetList,
  CommandSnippetList,
  CompactSnippetList,
  GridSnippetList
} from './terminal/SnippetList';
export {
  TerminalActions,
  MinimalTerminalActions,
  FullTerminalActions,
  FloatingTerminalActions,
  VerticalTerminalActions,
  ConnectionTerminalActions,
  EditingTerminalActions,
  FileTransferTerminalActions
} from './terminal/TerminalActions';
export {
  DragOverlay,
  MinimalDragOverlay,
  DefaultDragOverlay,
  DetailedDragOverlay,
  FullscreenDragOverlay,
  ImageDragOverlay,
  DocumentDragOverlay,
  CodeDragOverlay
} from './terminal/DragOverlay';

// AI助手组件 (AI Assistant)
export {
  ChatThread,
  MinimalChatThread,
  FullChatThread,
  CompactChatThread
} from './ai/ChatThread';
export {
  ChatInputBox,
  MinimalChatInput,
  FullChatInput
} from './ai/ChatInputBox';
export {
  ToolCallViewer,
  CompactToolCallViewer,
  DetailedToolCallViewer
} from './ai/ToolCallViewer';
export {
  AIActionControls,
  MinimalAIControls,
  CompactAIControls,
  FullAIControls,
  FloatingAIControls,
  VerticalAIControls,
  RunningAIControls,
  PausedAIControls,
  CompletedAIControls,
  ErrorAIControls
} from './ai/AIActionControls';
export {
  PromptTemplatePicker
} from './ai/PromptTemplatePicker';
export {
  ResultDiffViewer
} from './ai/ResultDiffViewer';
export {
  GuardrailNotice,
  DangerousCommandWarning,
  ReadOnlyModeNotice,
  HighRiskOperation
} from './ai/GuardrailNotice';
export {
  AttachmentPill,
  FileAttachment,
  TerminalAttachment,
  SnippetAttachment,
  TextAttachment
} from './ai/AttachmentPill';

// 设置与偏好组件 (Settings)
export {
  ThemeSwitcher,
  CompactThemeSwitcher,
  MinimalThemeSwitcher
} from './settings/ThemeSwitcher';
export {
  Keybindings
} from './settings/Keybindings';
export {
  TerminalThemePicker
} from './settings/TerminalThemePicker';
export {
  SecurityPanel
} from './settings/SecurityPanel';
export {
  ProxySettings
} from './settings/ProxySettings';
export {
  LogViewer
} from './settings/LogViewer';

// 跨区域通用复合组件 (Composite)
export {
  ConnectionSelect,
  CompactConnectionSelect,
  MinimalConnectionSelect,
  FullConnectionSelect
} from './composite/ConnectionSelect';
export {
  ServerHealthCard,
  CompactServerHealthCard,
  DetailedServerHealthCard
} from './composite/ServerHealthCard';
export {
  FilePreview,
  ImagePreview,
  CodePreview,
  BinaryPreview
} from './composite/FilePreview';
export {
  IdentityBadge,
  RootBadge,
  AdminBadge,
  UserBadge,
  ReadOnlyBadge,
  CompactIdentityBadge,
  MinimalIdentityBadge
} from './composite/IdentityBadge';

// 辅助与无障碍组件 (A11y & i18n)
export {
  FocusRing,
  BlueFocusRing,
  GreenFocusRing,
  RedFocusRing,
  PurpleFocusRing,
  YellowFocusRing,
  GrayFocusRing,
  useFocusRing
} from './a11y/FocusRing';
export {
  ARIAProvider,
  useARIA,
  useAnnouncer,
  useLiveRegion,
  useFocusTrap
} from './a11y/ARIAProvider';
export {
  KeyboardNavigation,
  MenuKeyboardNavigation,
  DialogKeyboardNavigation,
  TableKeyboardNavigation,
  useKeyboardShortcuts
} from './a11y/KeyboardNavigation';
export {
  I18nProvider,
  LanguageSwitcher,
  TranslatedText,
  ResponsiveText,
  useI18n
} from './a11y/I18nProvider';

// 工具函数
export { cn, mergeClasses, responsive } from './utils/clsx';
export { createVariants, sizeVariants, colorVariants, stateVariants } from './utils/cva';
