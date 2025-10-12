# UI通用组件库

这是一个为SSH代码编辑器项目创建的通用UI组件库，包含了常用的UI组件，提高代码复用性和维护性。

## 组件列表

### 基础组件 (Primitives)

#### 1. Icon 图标组件
- **功能**: 基于lucide-react的统一图标组件
- **特性**: 支持所有lucide图标，预定义常用图标快捷导出
- **Props**: name, size, className, color, strokeWidth等
- **示例**: `<Icon name="Plus" size={20} />` 或 `<icons.Plus size={20} />`

#### 2. Textarea 文本域组件
- **功能**: 增强版文本域，支持自动高度
- **特性**: 自动高度调整、字符计数、工具栏
- **Props**: autoHeight, minHeight, maxHeight, maxLength等
- **子组件**: TextareaWithCounter, TextareaWithToolbar
- **示例**: `<Textarea autoHeight minHeight={100} />`

#### 3. Select 选择器组件
- **功能**: 下拉选择器，支持搜索和键盘导航
- **特性**: 可搜索、可清空、键盘导航、多选支持
- **Props**: options, searchable, clearable, disabled等
- **子组件**: MultiSelect
- **示例**: `<Select options={options} searchable />`

#### 4. Switch/Checkbox/Radio 开关和选择组件
- **功能**: 开关切换器、复选框、单选框
- **特性**: 多种变体、尺寸、状态支持
- **子组件**: CheckboxGroup, RadioGroup
- **示例**: `<Switch checked={isChecked} onChange={setIsChecked} />`

#### 5. Tag/StatusDot 标签和状态点组件
- **功能**: 标签显示、状态指示器
- **特性**: 可移除、可交互、状态点动画
- **子组件**: StatusDot, StatusWithText, TagGroup, InteractiveTag
- **示例**: `<Tag removable onRemove={handleRemove}>标签</Tag>`

#### 6. Badge 徽标组件
- **功能**: 徽标显示、计数器、状态标识
- **特性**: 计数溢出处理、定位徽标、环境标识
- **子组件**: CountBadge, DotBadge, StatusBadge, EnvironmentBadge等
- **示例**: `<Badge variant="success">成功</Badge>`

#### 7. Progress/Spinner 进度条和加载器
- **功能**: 线性进度条、环形进度条、各种加载动画
- **特性**: 动画效果、步骤进度、进度组
- **子组件**: CircularProgress, Spinner, DotsSpinner, StepProgress等
- **示例**: `<Progress value={75} showLabel />`

#### 8. Code/MonoText 代码和等宽文本组件
- **功能**: 代码块、行内代码、等宽文本
- **特性**: 语法高亮、行号显示、复制功能
- **子组件**: InlineCode, CodeBlock, SyntaxHighlighter
- **示例**: `<Code language="javascript" copyable>code</Code>`

#### 9. Popover 气泡弹出框组件
- **功能**: 气泡弹出框、悬停卡片、确认弹窗
- **特性**: 多种触发方式、智能定位、箭头指示
- **子组件**: PopoverTrigger, PopoverContent, PopoverConfirm, HoverCard
- **示例**: `<Popover content="提示信息">触发元素</Popover>`

#### 10. Empty/Skeleton 空状态和骨架屏组件
- **功能**: 空状态展示、加载骨架屏
- **特性**: 预定义空状态、多种骨架屏类型
- **子组件**: Skeleton, SkeletonGroup, TableSkeleton, EmptyState等
- **示例**: `<Empty title="暂无数据" />`

### 原有组件

#### 11. Button 按钮组件

通用按钮组件，支持多种样式和状态。

**Props:**
- `variant`: 按钮变体 (`'primary' | 'secondary' | 'small' | 'edit' | 'delete'`)
- `size`: 按钮大小 (`'small' | 'normal' | 'large'`)
- `disabled`: 是否禁用 (boolean)
- `loading`: 是否加载中 (boolean)
- `onClick`: 点击事件处理函数

**示例:**
```jsx
import { Button } from './ui';

<Button onClick={handleClick}>主要按钮</Button>
<Button variant="secondary" onClick={handleClick}>次要按钮</Button>
<Button variant="edit" size="small" onClick={handleEdit}>编辑</Button>
<Button variant="delete" size="small" onClick={handleDelete}>删除</Button>
```

### 2. Input 输入框组件

通用输入框组件，支持多种输入类型。

**Props:**
- `type`: 输入类型 (`'text' | 'password' | 'number' | 'email' | 'search' | 'textarea'`)
- `size`: 输入框大小 (`'small' | 'normal' | 'large'`)
- `disabled`: 是否禁用 (boolean)
- `placeholder`: 占位符文本
- `value`: 输入值
- `onChange`: 变化事件处理函数
- `rows`: 文本域行数（textarea类型）

**示例:**
```jsx
import { Input } from './ui';

<Input 
  type="text" 
  placeholder="请输入用户名"
  value={username}
  onChange={handleChange}
/>

<Input 
  type="textarea"
  rows={3}
  placeholder="请输入消息"
  value={message}
  onChange={handleChange}
/>
```

### 3. Tooltip 气泡提示组件

鼠标悬停时显示的气泡提示组件。

**Props:**
- `children`: 触发提示的子元素
- `content`: 提示内容
- `position`: 提示位置 (`'top' | 'bottom' | 'left' | 'right'`)
- `variant`: 提示变体 (`'dark' | 'light'`)
- `disabled`: 是否禁用提示

**示例:**
```jsx
import { Tooltip } from './ui';

<Tooltip content="这是一个提示信息">
  <Button>悬停查看提示</Button>
</Tooltip>

<Tooltip content="删除操作" position="top">
  <Button variant="delete">删除</Button>
</Tooltip>
```

### 4. ChatMessage 聊天消息组件

用于显示聊天消息的组件，支持多种消息类型和操作。

**Props:**
- `message`: 消息对象 `{ id, type, content, timestamp }`
- `showActions`: 是否显示操作按钮
- `onCopy`: 复制消息回调函数
- `onDelete`: 删除消息回调函数
- `onEdit`: 编辑消息回调函数

**示例:**
```jsx
import { ChatMessage, ChatMessageLoading } from './ui';

<ChatMessage 
  message={{
    id: 1,
    type: 'user',
    content: '你好！',
    timestamp: Date.now()
  }}
  onCopy={handleCopy}
/>

<ChatMessageLoading text="AI正在思考..." />
```

### 5. Notification 通知组件

通知消息组件，支持多种类型的通知显示。

**Props:**
- `notification`: 通知对象 `{ id, message, type, duration }`
- `onClose`: 关闭通知回调函数
- `onClick`: 点击通知回调函数

**Hook:**
```jsx
import { useNotification } from './ui';

const { success, error, warning, info } = useNotification();

// 使用示例
success('操作成功！');
error('操作失败！');
warning('警告信息');
info('提示信息');
```

**容器组件:**
```jsx
import { NotificationContainer } from './ui';

<NotificationContainer 
  notifications={notifications}
  onClose={handleClose}
/>
```

### 6. Modal 模态框组件

模态框组件，支持多种尺寸和配置。

**Props:**
- `isOpen`: 是否打开模态框
- `onClose`: 关闭模态框回调函数
- `title`: 模态框标题
- `size`: 模态框大小 (`'small' | 'medium' | 'large' | 'fullscreen'`)
- `closeOnOverlayClick`: 点击遮罩是否关闭
- `closeOnEscape`: 按ESC键是否关闭
- `showCloseButton`: 是否显示关闭按钮
- `footer`: 底部内容

**示例:**
```jsx
import { Modal, ConfirmDialog, AlertDialog } from './ui';

<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  title="设置"
  size="medium"
>
  <div>模态框内容</div>
</Modal>

<ConfirmDialog
  isOpen={showConfirm}
  onClose={handleClose}
  onConfirm={handleConfirm}
  message="确定要删除吗？"
  type="warning"
/>

<AlertDialog
  isOpen={showAlert}
  onClose={handleClose}
  message="操作完成！"
/>
```

## 样式规范

所有组件都遵循项目的统一样式规范：

- **主题色**: `#007acc` (蓝色)
- **背景色**: `#1e1e1e`, `#252526`, `#2d2d30`
- **文字色**: `#d4d4d4`, `#cccccc`
- **边框色**: `#3e3e42`, `#5a5a5a`
- **成功色**: `#4ec9b0`
- **错误色**: `#d16969`
- **警告色**: `#dcdcaa`

## 使用指南

1. **导入组件**:
```jsx
import { Button, Input, Modal } from './ui';
```

2. **组合使用**:
```jsx
<Modal isOpen={isOpen} onClose={handleClose}>
  <Input placeholder="请输入内容" />
  <Button onClick={handleSubmit}>提交</Button>
</Modal>
```

3. **自定义样式**:
所有组件都支持 `className` 属性来添加自定义样式。

## 最佳实践

1. **保持一致性**: 在整个项目中使用相同的组件变体和尺寸
2. **可访问性**: 组件支持键盘导航和屏幕阅读器
3. **响应式**: 组件适配不同屏幕尺寸
4. **性能优化**: 使用 React.memo 和合理的重渲染控制

## 组件依赖关系

```
Modal → Button
ChatMessage → Button, Tooltip
Notification → Button
```

所有组件都是独立的，可以单独使用，也可以组合使用。
