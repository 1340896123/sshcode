# AI服务调用与缓存

<cite>
**本文档引用文件**  
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts)
- [aiConstants.ts](file://src/modules/ai-assistant/constants/aiConstants.ts)
- [ai.ts](file://src/types/ai.ts)
- [config.ts](file://src/types/config.ts)
</cite>

## 目录
1. [AI服务调用流程](#ai服务调用流程)
2. [提示词构建机制](#提示词构建机制)
3. [响应解析策略](#响应解析策略)
4. [内存缓存实现](#内存缓存实现)
5. [降级机制](#降级机制)
6. [性能与安全](#性能与安全)

## AI服务调用流程

AICompletionService通过fetchAISuggestions方法与大语言模型API进行交互，实现完整的请求-响应流程。该服务首先检查配置的完整性，确保API密钥和基础URL等必要参数已正确设置。

请求构建过程遵循标准的REST API调用模式，使用fetch API发送POST请求到配置的AI服务端点。请求头包含内容类型声明和Bearer认证令牌，其中API密钥通过`Authorization: Bearer ${aiConfig.apiKey}`方式传递，确保了身份验证的安全性。

在请求体中，系统构建了包含系统角色和用户角色的对话消息数组。系统消息定义了AI助手的角色定位——专业的Linux命令行助手，并明确了输出格式要求：返回JSON数组，包含命令、描述、置信度和类别等字段。用户消息则包含由buildPrompt方法生成的上下文感知提示词。

错误处理机制包含多层防护：网络请求失败时捕获HTTP状态码异常，响应解析时处理空内容异常，并在所有异常情况下自动触发降级机制。请求设置了合理的超时控制和重试策略，确保在网络不稳定情况下的服务可用性。

**节流与重试机制**通过在AI配置中设置的重试次数（MAX_RETRIES）和重试延迟（RETRY_DELAY）实现。每次请求失败后，系统会按照预设的延迟时间进行指数退避重试，避免对API服务造成过大压力。

**Section sources**
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L74-L139)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L382-L418)

## 提示词构建机制

buildPrompt方法通过整合用户输入、当前目录和历史命令等上下文信息，生成具有情境感知能力的提示词，显著提升了建议的准确性和实用性。

方法接收两个参数：用户输入的命令前缀和包含上下文信息的对象。上下文信息包括当前工作目录（currentDirectory）和最近执行的命令历史（recentCommands）。这些信息通过CompletionContext接口定义，确保了类型安全。

提示词构建过程首先检查当前目录是否存在，如果存在则将其作为上下文信息的一部分。然后检查命令历史，取最近的三条命令进行展示。这些历史命令通过数组的slice(-3)方法获取，并使用join(',')方法连接成字符串。

最终生成的提示词包含三个关键部分：用户输入的原始查询、当前目录信息和最近命令历史。这种结构化的提示词设计使AI模型能够充分理解用户的操作上下文，从而提供更加精准的命令建议。例如，当用户在Git仓库目录中输入"status"时，系统会优先建议"git status"而非其他同名命令。

**Section sources**
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L144-L158)
- [ai.ts](file://src/types/ai.ts#L156-L160)

## 响应解析策略

parseAIResponse方法实现了JSON和文本格式的双重解析策略，确保能够处理不同格式的AI模型输出。该方法首先尝试将响应内容解析为JSON格式，如果失败则回退到文本解析模式。

在JSON解析模式下，系统期望接收到符合预定义格式的数组，每个元素包含command、description、confidence和category字段。解析成功后，系统会对数据进行标准化处理，为缺失的置信度和类别字段提供默认值。

文本解析模式采用正则表达式匹配和行分割相结合的方式。系统将响应内容按行分割，过滤空白行后，使用正则表达式`^(.+?)\s*[-:]\s*(.+)$`提取命令和描述。这种模式能够识别"命令 - 描述"或"命令: 描述"等常见格式。

解析过程中还包含了去重机制，确保不会返回重复的命令建议。通过检查suggestions数组中是否已存在相同命令，避免了重复建议的出现。最终结果限制在8个以内，保证了建议列表的简洁性。

当解析过程出现异常时，系统会记录错误日志并触发降级机制，返回基于规则的命令建议。这种容错设计确保了即使在AI模型输出格式异常的情况下，用户仍能获得有用的命令建议。

**Section sources**
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L163-L212)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L585-L629)

## 内存缓存实现

AICompletionService实现了5分钟的内存缓存机制，通过Map数据结构存储请求结果，显著提升了系统性能和用户体验。缓存机制的核心是cacheTimeout常量，其值为`5 * 60 * 1000`毫秒，即5分钟。

缓存键的生成策略结合了用户输入和上下文信息，使用`${input.trim()}_${JSON.stringify(context)}`的格式。这种设计确保了相同输入和上下文的请求能够命中缓存，同时避免了不同上下文下的结果混淆。

缓存条目包含两个关键字段：suggestions（命令建议数组）和timestamp（时间戳）。每次获取建议时，系统首先检查缓存中是否存在对应键，如果存在则验证时间戳是否在有效期内。只有当缓存未过期时，才会返回缓存结果。

缓存统计功能通过getCacheStats方法实现，返回总条目数、有效条目数和缓存大小等指标。这些统计数据可用于监控缓存的使用效率和命中率。clearCache方法提供了手动清除缓存的能力，便于在需要时刷新缓存状态。

缓存机制与请求流程紧密集成：在发送API请求前先检查缓存，如果命中则直接返回结果；如果未命中，则在获取新结果后将其存入缓存。这种设计有效减少了对AI API的调用次数，降低了响应延迟。

**Section sources**
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L13-L13)
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L50-L50)
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L448-L448)
- [ai.ts](file://src/types/ai.ts#L162-L165)
- [ai.ts](file://src/types/ai.ts#L167-L171)

## 降级机制

getFallbackSuggestions方法实现了完善的降级机制，确保在网络异常或API不可用时仍能提供基本的命令建议功能。该机制基于用户输入的关键词模式匹配，提供预定义的常用命令建议。

降级建议的生成遵循分类原则，针对不同的输入模式返回相应的命令集合。例如，当输入包含"list"或"ls"时，返回文件列表相关的命令（如"ls -la"、"ls -lh"）；当输入包含"install"时，返回包管理相关的命令（如"sudo apt install"、"npm install"）。

建议的置信度根据匹配的精确度进行分级：精确匹配的置信度为0.9，模糊匹配的为0.8，通用匹配的为0.7。对于无法匹配特定模式的输入，系统提供通用的帮助建议，如"{input} --help"和"man {input}"。

降级机制在多个场景下被触发：AI配置不完整、网络请求失败、响应解析异常等。无论何种原因导致主流程失败，系统都会优雅地回退到降级模式，确保功能的可用性。这种设计体现了系统的健壮性和用户体验优先的原则。

**Section sources**
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L244-L374)
- [aiConstants.ts](file://src/modules/ai-assistant/constants/aiConstants.ts#L156-L160)

## 性能与安全

系统通过多模型支持和API密钥安全存储的最佳实践，实现了性能优化和安全保障。多模型支持通过AI配置中的model和customModel字段实现，允许用户选择不同的大语言模型，如默认的"gpt-3.5-turbo"或其他自定义模型。

API密钥的安全存储采用多层次保护策略：首先通过Electron API从主进程安全地获取配置，避免在前端代码中硬编码密钥；其次支持从本地存储读取加密的配置，确保敏感信息不以明文形式暴露。

性能监控通过testConnection方法实现，该方法发送测试请求并返回详细的测试结果，包括成功状态、获取的建议数量和执行消息。这些指标可用于评估AI服务的响应性能和稳定性。

系统还实现了请求节流机制，通过API_CONFIG中的DEFAULT_TIMEOUT和RATE_LIMIT_DELAY参数控制请求频率，防止对AI服务造成过大压力。错误重试策略采用指数退避算法，平衡了重试成功率和系统负载。

**Section sources**
- [aiCompletionService.ts](file://src/modules/ai-assistant/utils/aiCompletionService.ts#L463-L463)
- [aiService.ts](file://src/modules/ai-assistant/utils/aiService.ts#L18-L54)
- [aiConstants.ts](file://src/modules/ai-assistant/constants/aiConstants.ts#L216-L244)
- [config.ts](file://src/types/config.ts#L1-L37)