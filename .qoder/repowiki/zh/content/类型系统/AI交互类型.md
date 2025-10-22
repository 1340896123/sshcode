# AI交互类型

<cite>
**Referenced Files in This Document**   
- [ai.ts](file://src/types/ai.ts)
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts)
- [api.ts](file://src/types/api.ts)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts)
- [ai.ts](file://src/modules/ai-assistant/stores/ai.ts)
- [aiCommandExecutor.ts](file://src/modules/ai-assistant/utils/aiCommandExecutor.ts)
</cite>

## 目录
1. [简介](#简介)
2. [核心数据结构](#核心数据结构)
3. [对话状态管理](#对话状态管理)
4. [AI配置与服务集成](#ai配置与服务集成)
5. [响应解析与操作生成](#响应解析与操作生成)
6. [智能建议与分类](#智能建议与分类)
7. [组件间通信与事件流](#组件间通信与事件流)
8. [错误处理与重试机制](#错误处理与重试机制)
9. [性能统计与监控](#性能统计与监控)

## 简介
本文档全面解析了SSHCode项目中AI助手功能的核心数据结构和交互机制。文档详细阐述了`AIMessage`、`ToolCall`、`CommandSuggestion`等关键类型的设计与用途，深入分析了`useAIChat`组合式函数如何协调AI对话流程，以及`ParsedResponse`如何解析AI响应并生成可执行操作。通过系统化的结构说明和流程图解，为开发者提供了对AI交互系统全面深入的理解。

## 核心数据结构

### AIMessage结构
`AIMessage`接口定义了AI对话中消息的基本结构，包含消息ID、角色、内容、时间戳以及工具调用信息。消息的角色（role）属性支持'user'、'assistant'、'system'和'tool'四种类型，用于区分消息来源和用途。

```mermaid
classDiagram
class AIMessage {
+string id
+'user' | 'assistant' | 'system' | 'tool' role
+string | null content
+number timestamp
+ToolCall[]? tool_calls
+string? tool_call_id
}
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L4-L11)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L4-L11)

### ToolCall结构
`ToolCall`接口封装了AI生成的命令调用请求，包含调用ID、类型、函数名称和参数。该结构是AI与系统功能交互的核心，通过`function.arguments`字段传递JSON格式的命令参数。

```mermaid
classDiagram
class ToolCall {
+string id
+string type
+Function function
+unknown? result
}
class Function {
+string name
+string arguments
}
ToolCall --> Function : "contains"
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L13-L21)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L13-L21)

### CommandSuggestion结构
`CommandSuggestion`接口定义了命令建议的数据结构，包含命令文本、描述、置信度、类型和分类。分类（category）属性支持'git'、'package'、'service'等多种类型，用于智能建议的排序和过滤。

```mermaid
classDiagram
class CommandSuggestion {
+string command
+string description
+number confidence
+'ai' | 'fallback' type
+'git' | 'package' | 'service' | 'container' | 'file' | 'process' | 'network' | 'general' | 'help' category
}
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L56-L71)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L56-L71)

## 对话状态管理

### ToolCallHistoryItem结构
`ToolCallHistoryItem`接口扩展了`ToolCall`，增加了命令执行状态的完整记录。该结构通过`status`属性跟踪执行状态（executing/completed/error/timeout），并记录开始时间、结束时间、执行时长和结果。

```mermaid
classDiagram
class ToolCallHistoryItem {
+string command
+string connectionId
+'executing' | 'completed' | 'error' | 'timeout' status
+number startTime
+number? endTime
+string? result
+string? error
+number executionTime
+string? realtimeOutput
}
ToolCallHistoryItem --|> ToolCall : "extends"
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L98-L108)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L98-L108)

### 对话状态流转
AI助手的对话状态通过一系列事件和状态更新进行管理。当用户发送消息时，系统创建`AIMessage`并调用AI API。AI响应可能包含`tool_calls`，触发命令执行流程。

```mermaid
sequenceDiagram
participant User as "用户"
participant useAIChat as "useAIChat"
participant aiService as "aiService"
participant aiCommandExecutor as "aiCommandExecutor"
User->>useAIChat : 发送消息
useAIChat->>aiService : callAIAPI()
aiService->>aiService : 构建请求数据
aiService->>aiService : 发送API请求
aiService-->>useAIChat : 返回ParsedResponse
useAIChat->>useAIChat : 添加消息到UI
alt 包含tool_calls
useAIChat->>aiCommandExecutor : executeAICommand()
aiCommandExecutor->>aiCommandExecutor : 执行命令
aiCommandExecutor-->>useAIChat : 返回结果
useAIChat->>useAIChat : 更新消息状态
end
```

**Diagram sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L150-L200)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L311-L328)
- [aiCommandExecutor.ts](file://src/modules/ai-assistant/utils/aiCommandExecutor.ts#L18-L63)

**Section sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L150-L200)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L311-L328)

## AI配置与服务集成

### AIConfig结构
`AIConfig`接口定义了AI服务的配置项，包括基础URL、API密钥、模型名称等。这些配置项决定了AI服务的集成方式和行为特征。

```mermaid
classDiagram
class AIConfig {
+string? provider
+string baseUrl
+string apiKey
+string? model
+string? customModel
+number? maxTokens
+number? temperature
}
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L23-L31)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L23-L31)

### 配置验证与获取
系统通过`getAIConfig`函数获取并验证AI配置。配置来源优先级为Electron API > 本地存储 > 默认值。验证失败时会触发配置设置引导。

```mermaid
flowchart TD
Start([获取AI配置]) --> CheckElectronAPI["检查Electron API"]
CheckElectronAPI --> |存在| GetFromElectron["从Electron API获取"]
CheckElectronAPI --> |不存在| CheckLocalStorage["检查本地存储"]
CheckLocalStorage --> |存在| GetFromLocalStorage["从本地存储获取"]
CheckLocalStorage --> |不存在| ThrowError["抛出AI_CONFIG_NOT_SET错误"]
GetFromElectron --> Validate["验证配置有效性"]
GetFromLocalStorage --> Validate
Validate --> |有效| ReturnConfig["返回配置"]
Validate --> |无效| ThrowError
ThrowError --> TriggerSetup["触发配置设置引导"]
```

**Diagram sources**
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L34-L88)

**Section sources**
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L34-L88)

## 响应解析与操作生成

### ParsedResponse结构
`ParsedResponse`接口定义了AI响应的解析结果，包含内容文本和可执行操作列表。操作（actions）字段包含ID、类型、标签和命令，用于生成UI上的可点击按钮。

```mermaid
classDiagram
class ParsedResponse {
+string content
+Action[]? actions
}
class Action {
+string id
+string type
+string label
+string command
}
ParsedResponse --> Action : "contains"
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L33-L41)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L33-L41)

### 响应解析流程
`parseAIResponse`函数负责解析AI返回的文本内容，提取代码块中的命令并生成可执行操作。解析过程优先处理代码块，然后是行内代码。

```mermaid
flowchart TD
Start([解析AI响应]) --> ExtractCodeBlocks["提取代码块中的命令"]
ExtractCodeBlocks --> ExtractInlineCode["提取行内代码中的命令"]
ExtractInlineCode --> RemoveDuplicates["去重并合并命令"]
RemoveDuplicates --> GenerateActions["生成操作按钮"]
GenerateActions --> LimitActions["限制操作数量(最多5个)"]
LimitActions --> ReturnResult["返回ParsedResponse"]
```

**Diagram sources**
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L658-L685)

**Section sources**
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L658-L685)

### APIResponse泛型设计
`APIResponse<T>`接口采用泛型设计，统一处理不同AI接口的响应结构。该设计支持`success`、`data`、`output`、`error`等标准字段，确保了API响应处理的一致性。

```mermaid
classDiagram
class APIResponse~T~ {
+boolean success
+T? data
+T? output
+string? error
+string? message
}
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L183-L189)
- [api.ts](file://src/types/api.ts#L4-L10)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L183-L189)
- [api.ts](file://src/types/api.ts#L4-L10)

## 智能建议与分类

### 建议分类体系
`CommandSuggestion`的分类（category）属性构建了一个多维度的建议体系，支持'git'、'package'、'service'、'container'、'file'、'process'、'network'、'general'和'help'九种类型。该分类体系使系统能够根据上下文智能推荐相关命令。

```mermaid
graph TD
A[命令建议分类] --> B[版本控制]
A --> C[包管理]
A --> D[服务管理]
A --> E[容器管理]
A --> F[文件操作]
A --> G[进程管理]
A --> H[网络管理]
A --> I[通用命令]
A --> J[帮助信息]
B --> git
C --> package
D --> service
E --> container
F --> file
G --> process
H --> network
I --> general
J --> help
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L62-L71)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L62-L71)

### 置信度排序机制
系统利用`confidence`属性对建议进行排序，高置信度的建议优先显示。置信度计算基于命令与当前上下文的相关性、历史执行成功率和用户偏好。

```mermaid
flowchart TD
Start([智能建议排序]) --> CalculateConfidence["计算各建议的置信度"]
CalculateConfidence --> ConsiderContext["考虑当前上下文相关性"]
CalculateConfidence --> ConsiderHistory["考虑历史执行成功率"]
CalculateConfidence --> ConsiderUserPref["考虑用户偏好"]
ConsiderContext --> CombineScores["综合各项得分"]
ConsiderHistory --> CombineScores
ConsiderUserPref --> CombineScores
CombineScores --> SortSuggestions["按置信度排序建议"]
SortSuggestions --> FilterSuggestions["过滤低置信度建议"]
FilterSuggestions --> ReturnTopSuggestions["返回前N个建议"]
```

**Section sources**
- [ai.ts](file://src/types/ai.ts#L56-L71)

## 组件间通信与事件流

### 事件系统架构
系统采用基于事件的通信模式，通过`EventTypes`定义的事件类型实现组件间解耦。关键事件包括AI命令开始、完成、错误和配置需求。

```mermaid
classDiagram
class EventTypes {
+string AI_MESSAGE_SEND
+string AI_RESPONSE
+string AI_COMMAND_START
+string AI_COMMAND_COMPLETE
+string AI_COMMAND_ERROR
+string AI_CONFIG_REQUIRED
+string TERMINAL_OUTPUT
}
```

**Diagram sources**
- [eventSystem.ts](file://src/utils/eventSystem.ts#L11-L33)

**Section sources**
- [eventSystem.ts](file://src/utils/eventSystem.ts#L11-L33)

### 事件处理流程
`useAIChat`组合式函数通过`onEvent`监听AI相关事件，并更新UI状态。事件流确保了命令执行状态的实时同步。

```mermaid
sequenceDiagram
participant aiCommandExecutor as "aiCommandExecutor"
participant useAIChat as "useAIChat"
participant UI as "UI组件"
aiCommandExecutor->>useAIChat : emit(AI_COMMAND_START)
useAIChat->>useAIChat : handleCommandStart()
useAIChat->>UI : 添加"执行中"消息
aiCommandExecutor->>useAIChat : emit(AI_COMMAND_COMPLETE)
useAIChat->>useAIChat : handleCommandComplete()
useAIChat->>UI : 更新消息为"完成"
alt 执行失败
aiCommandExecutor->>useAIChat : emit(AI_COMMAND_ERROR)
useAIChat->>useAIChat : handleCommandError()
useAIChat->>UI : 更新消息为"错误"
end
```

**Diagram sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L400-L550)
- [aiCommandExecutor.ts](file://src/modules/ai-assistant/utils/aiCommandExecutor.ts#L18-L63)

**Section sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L400-L550)

## 错误处理与重试机制

### 错误状态管理
系统通过`ToolCallHistoryItem`的`status`和`error`字段管理错误状态。错误处理流程确保了用户能够清晰了解命令执行失败的原因。

```mermaid
flowchart TD
Start([命令执行]) --> ExecuteCommand["执行命令"]
ExecuteCommand --> |成功| UpdateStatusToCompleted["更新状态为completed"]
ExecuteCommand --> |失败| UpdateStatusToError["更新状态为error"]
UpdateStatusToError --> SetErrorMessage["设置错误信息"]
SetErrorMessage --> EmitErrorEvent["发送AI_COMMAND_ERROR事件"]
EmitErrorEvent --> ShowErrorInUI["在UI中显示错误"]
```

**Diagram sources**
- [aiCommandExecutor.ts](file://src/modules/ai-assistant/utils/aiCommandExecutor.ts#L45-L63)
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L500-L550)

**Section sources**
- [aiCommandExecutor.ts](file://src/modules/ai-assistant/utils/aiCommandExecutor.ts#L45-L63)
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L500-L550)

### 重试机制实现
系统提供`retryToolCall`函数实现命令重试功能。该函数从历史记录中查找指定ID的工具调用，并重新执行其命令。

```mermaid
flowchart TD
Start([重试工具调用]) --> FindToolCall["在历史记录中查找工具调用"]
FindToolCall --> |找到| GetCommand["获取原命令"]
FindToolCall --> |未找到| ReturnNull["返回null"]
GetCommand --> ExecuteCommand["执行命令"]
ExecuteCommand --> AddRetryMessage["添加重试消息到UI"]
AddRetryMessage --> ReturnSuccess["返回成功"]
```

**Diagram sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L370-L380)
- [ai.ts](file://src/modules/ai-assistant/stores/ai.ts#L240-L255)

**Section sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L370-L380)

## 性能统计与监控

### 工具调用统计
系统通过`getToolCallStats`函数提供工具调用的性能统计，包括总数、成功数、失败数、成功率和平均执行时间。

```mermaid
classDiagram
class ToolCallStats {
+number total
+number successful
+number failed
+number successRate
+number avgExecutionTime
}
```

**Diagram sources**
- [ai.ts](file://src/types/ai.ts#L168-L174)

**Section sources**
- [ai.ts](file://src/types/ai.ts#L168-L174)

### 统计计算流程
统计计算基于`toolCallHistory`历史记录，通过过滤和计算得出各项指标。该机制为系统性能优化提供了数据支持。

```mermaid
flowchart TD
Start([计算工具调用统计]) --> CountTotal["计算总调用数"]
CountTotal --> FilterSuccessful["过滤成功调用"]
CountTotal --> FilterFailed["过滤失败调用"]
FilterSuccessful --> CalculateSuccessRate["计算成功率"]
FilterFailed --> CalculateSuccessRate
CountTotal --> CalculateAvgTime["计算平均执行时间"]
CalculateSuccessRate --> CombineResults["组合统计结果"]
CalculateAvgTime --> CombineResults
CombineResults --> ReturnStats["返回统计对象"]
```

**Diagram sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L340-L360)
- [ai.ts](file://src/modules/ai-assistant/stores/ai.ts#L210-L230)

**Section sources**
- [useAIChat.ts](file://src/modules/ai-assistant/composables/useAIChat.ts#L340-L360)