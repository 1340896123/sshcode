# 终端补全输入叠加问题修复

## 🐛 问题描述

在之前的实现中，使用上下箭头键导航补全建议时，输入框中的内容会不断叠加，导致：

```
原始输入: $ ls
↓ 选择第一个建议: $ ls -la
↓ 选择第二个建议: $ ls -la -la -la  ← 错误叠加
```

## 🔧 问题根因

1. **预览逻辑错误**: 每次预览都基于当前输入框的值（已被之前的预览修改）
2. **状态管理不当**: 原始输入值保存时机不正确
3. **鼠标键盘冲突**: 鼠标悬停时没有正确恢复原始状态

## ✅ 修复方案

### 1. 修复预览逻辑
```javascript
// 修复前：基于当前可能已被修改的值
const currentValue = this.input.value;

// 修复后：始终基于原始输入值
if (this.originalInputValue === undefined) return;
const cursorPosition = this.originalCursorPosition;
const textBeforeCursor = this.originalInputValue.substring(0, cursorPosition);
```

### 2. 正确保存原始状态
```javascript
// 在显示补全建议时立即保存原始状态
showCompletionSuggestions(completions, textBeforeCursor, textAfterCursor) {
  // 保存当前输入状态作为原始状态
  const currentValue = this.input.value;
  const cursorPosition = this.input.selectionStart;
  this.originalInputValue = currentValue;
  this.originalCursorPosition = cursorPosition;
}
```

### 3. 添加恢复方法
```javascript
// 独立的恢复方法
restoreOriginalInput() {
  if (this.originalInputValue !== undefined) {
    this.input.value = this.originalInputValue;
    this.input.setSelectionRange(this.originalCursorPosition, this.originalCursorPosition);
  }
}
```

### 4. 修复鼠标悬停
```javascript
// 鼠标悬停时先恢复原始输入，再预览新建议
itemDiv.addEventListener('mouseenter', () => {
  this.selectedSuggestionIndex = parseInt(itemDiv.dataset.index);
  this.updateSuggestionSelection();
  this.restoreOriginalInput();  // 先恢复
  this.previewSuggestion(item); // 再预览
});
```

## 🧪 测试场景

### 场景1: 键盘导航测试
```
输入: $ ls<Tab>
显示: [ls, lsblk, lsof, lspci]

按↓: 预览 lsblk  ← 应该显示 $ lsblk
按↓: 预览 lsof  ← 应该显示 $ lsof (不是 $ lsblksof)
按↑: 预览 lsblk ← 应该显示 $ lsblk (不是 $ lsoflsblk)
按ESC: 恢复 $ ls  ← 正确恢复原始输入
```

### 场景2: 鼠标键盘混合测试
```
输入: $ cd <Tab>
显示: [./src/, ./docs/, /var/log/]

鼠标悬停 ./src/: 预览 $ cd ./src/
键盘↓选择 ./docs/: 预览 $ cd ./docs/ (不是 $ cd ./src/./docs/)
鼠标悬停 /var/log/: 预览 $ cd /var/log/ (正确)
```

### 场景3: 取消后重新触发
```
输入: $ git <Tab>
显示: [status, add, commit, push]

按↓选择 add, 预览 $ git add
按ESC取消, 恢复 $ git
按Tab重新触发, 显示相同列表
按↓选择 add, 预览 $ git add (正确)
```

## 🎯 修复效果

### 修复前
```
$ ls<Tab>
↓ → $ ls -la
↓ → $ ls -la -la -la  ← 错误叠加
↓ → $ ls -la -la -la -la -la  ← 持续叠加
```

### 修复后
```
$ ls<Tab>
↓ → $ ls -la
↓ → $ lsblk  ← 正确替换
↓ → $ lsof  ← 正确替换
ESC → $ ls   ← 正确恢复
```

## 🔍 技术细节

### 状态管理
- `originalInputValue`: 始终保存用户最初的输入
- `originalCursorPosition`: 保存原始光标位置
- `selectedSuggestionIndex`: 当前选中项索引

### 预览机制
1. 显示补全时保存原始状态
2. 预览时始终基于原始状态计算
3. 取消时恢复到原始状态
4. 应用时使用选中的建议

### 事件处理
- 键盘导航: 先恢复再预览
- 鼠标悬停: 先恢复再预览
- 点击应用: 直接应用选中项
- ESC取消: 恢复原始状态

## 🚀 性能优化

1. **避免重复计算**: 始终基于原始输入计算
2. **状态一致性**: 确保UI和内部状态同步
3. **内存管理**: 正确清理临时状态
4. **响应速度**: 预览操作无网络请求

这个修复确保了补全导航的稳定性和正确性，用户现在可以正常使用键盘导航而不会遇到输入叠加的问题！