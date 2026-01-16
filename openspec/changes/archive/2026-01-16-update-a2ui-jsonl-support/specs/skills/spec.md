## MODIFIED Requirements

### Requirement: A2UI 消息自动检测
系统 MUST 自动检测 AI 返回的消息是否符合 A2UI 消息格式，并在符合时自动设置消息类型。

**重要变更**: 
- A2UI 消息格式现在仅支持 JSONL（JSON Lines）格式，即每行一个独立的 JSON 对象，不再支持 JSON 数组格式。
- 为了支持 JSONL 流式渲染，系统 MUST 在流式输出过程中提前检测 `---BEGIN A2UI---` 标记，并立即设置 `contentType = 'a2ui'`，而不是等到消息完成（`onDone`）才设置。这样前端可以更早知道消息类型，提前准备 A2UI 渲染器，实现流式渲染。

#### Scenario: AI 返回有效的 A2UI JSONL 消息
- **WHEN** AI 完成消息生成
- **AND** 消息内容为有效的 JSONL 格式（每行一个 JSON 对象），被 `---BEGIN A2UI---` 和 `---END A2UI---` 分隔符包裹
- **AND** 每行的 JSON 对象包含且仅包含以下操作之一：`beginRendering`、`surfaceUpdate`、`dataModelUpdate`、`deleteSurface`
- **THEN** 系统自动提取分隔符之间的 JSONL 内容
- **AND** 系统将 JSONL 格式转换为 JSON 数组格式（每行对象组成数组，因为渲染器期望数组格式）
- **AND** 系统更新消息的 `content` 字段为转换后的 JSON 数组字符串
- **NOTE**: 如果系统在流式输出过程中已经检测到 `---BEGIN A2UI---` 标记并设置了 `contentType = 'a2ui'`，则不需要再次设置。如果系统只在消息完成后才检测（向后兼容），则此时设置 `contentType = 'a2ui'`
- **AND** 消息能够被正确渲染为 A2UI 界面

#### Scenario: AI 流式输出 A2UI JSONL 消息 - 提前检测消息类型
- **WHEN** AI 流式输出消息内容（token by token）
- **AND** 消息内容包含 `---BEGIN A2UI---` 标记
- **THEN** 系统立即检测到 A2UI 标记（在流式输出过程中，而不是等到消息完成）
- **AND** 系统立即将消息的 `contentType` 设置为 `'a2ui'`
- **AND** 系统立即更新数据库中的消息记录，设置 `contentType = 'a2ui'`
- **AND** 系统通知前端消息类型已更新，前端可以提前准备 A2UI 渲染器
- **AND** 系统进入 A2UI 模式，开始流式解析 JSONL 格式
- **AND** 前端更早知道消息类型，可以提前初始化 A2UI 渲染器，支持流式渲染

#### Scenario: AI 流式输出 A2UI JSONL 消息 - 流式解析 JSONL
- **WHEN** 系统已进入 A2UI 模式（检测到 `---BEGIN A2UI---` 标记并设置了 `contentType = 'a2ui'`）
- **AND** AI 继续流式输出 token
- **THEN** 系统缓存 token 直到能够解析出完整的 JSONL 行（一个完整的 JSON 对象）
- **AND** 当解析出完整的 JSONL 行时，系统立即输出该行给前端
- **AND** 前端可以实时渲染每个 JSONL 行，实现渐进式 UI 构建
- **AND** 当检测到 `---END A2UI---` 标记时，系统处理剩余的缓冲区内容
- **AND** 系统在消息完成后，将完整的 JSONL 内容转换为 JSON 数组格式并更新消息的 `content` 字段

#### Scenario: AI 返回非 A2UI 格式的消息
- **WHEN** AI 完成消息生成
- **AND** 消息内容不是有效的 A2UI JSONL 格式（例如普通文本、JSON 数组、其他 JSON 格式等）
- **THEN** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理（如 Markdown 渲染）

#### Scenario: AI 返回格式错误的 JSON
- **WHEN** AI 完成消息生成
- **AND** 消息内容不是有效的 JSONL 格式
- **THEN** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 系统不抛出错误，继续正常处理消息
- **AND** 系统记录警告日志

#### Scenario: AI 返回部分符合 A2UI 格式的消息
- **WHEN** AI 完成消息生成
- **AND** 消息内容为 JSONL 格式
- **AND** 部分行的 JSON 对象符合 A2UI 格式，部分不符合
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理

#### Scenario: AI 返回空的 JSONL
- **WHEN** AI 完成消息生成
- **AND** 消息内容为有效的 JSONL 格式但没有任何行（空内容）
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理

#### Scenario: AI 返回包含多个 A2UI 操作类型的对象
- **WHEN** AI 完成消息生成
- **AND** 消息内容为有效的 JSONL 格式
- **AND** 某行的 JSON 对象包含多个 A2UI 操作类型（例如同时包含 `beginRendering` 和 `surfaceUpdate`）
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理

#### Scenario: AI 返回格式错误的 JSONL 消息
- **WHEN** AI 完成消息生成
- **AND** 消息内容为 JSONL 格式
- **AND** 某些行不是有效的 JSON 对象
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 系统记录警告日志
- **AND** 消息按照默认方式处理
