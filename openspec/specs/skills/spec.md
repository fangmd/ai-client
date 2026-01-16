# skills Specification

## Purpose
SKILLS 功能允许 ai-client 从内置目录中发现和加载可重用的技能定义。技能通过 `SKILL.md` 文件定义（纯 Markdown 格式），AI 可以通过 `skill` 工具按需加载技能内容，从而扩展 AI 的能力范围。技能名称从目录名自动获取，支持从 `resources/skills/` 目录自动发现。
## Requirements
### Requirement: 技能文件格式
系统 MUST 支持通过 `SKILL.md` 文件定义技能，文件格式为纯 Markdown 内容。

#### Scenario: 技能文件包含有效的 Markdown 内容
- **WHEN** 系统扫描到包含 Markdown 内容的 `SKILL.md` 文件
- **THEN** 系统将目录名作为技能名称
- **AND** 系统将 Markdown 内容作为技能内容存储
- **AND** 系统将技能添加到可用技能列表

#### Scenario: 技能文件为空或无法读取
- **WHEN** 系统扫描到空的或无法读取的 `SKILL.md` 文件
- **THEN** 系统跳过该文件
- **AND** 系统记录警告日志
- **AND** 系统继续处理其他技能文件

### Requirement: 技能发现机制
系统 MUST 从 `resources/skills/` 目录中发现所有技能。

#### Scenario: 应用启动时扫描技能目录
- **WHEN** 应用启动
- **THEN** 系统扫描 `resources/skills/` 目录下的所有子目录
- **AND** 系统查找每个子目录中的 `SKILL.md` 文件
- **AND** 系统解析所有有效的技能文件
- **AND** 系统构建技能列表供后续使用

#### Scenario: 技能目录结构
- **WHEN** 技能目录结构为 `resources/skills/<skill-name>/SKILL.md`
- **THEN** 系统使用 `<skill-name>` 作为技能标识符和名称
- **AND** 系统读取 `SKILL.md` 文件的 Markdown 内容作为技能内容
- **AND** 系统将技能添加到可用技能列表

#### Scenario: 技能目录不存在或为空
- **WHEN** `resources/skills/` 目录不存在或为空
- **THEN** 系统返回空技能列表
- **AND** 系统不抛出错误
- **AND** skill 工具仍然可用，但显示无可用技能

### Requirement: Skill 工具定义
系统 MUST 提供 `skill` 工具，允许 AI 按名称加载技能内容。

#### Scenario: AI 调用 skill 工具加载技能
- **WHEN** AI 调用 `skill` 工具并传入技能名称参数
- **AND** 技能存在于可用技能列表中
- **THEN** 系统加载技能内容
- **AND** 系统返回格式化的技能内容（包含技能名称、基础目录、Markdown 内容）
- **AND** AI 可以使用技能内容指导后续操作

#### Scenario: AI 调用不存在的技能
- **WHEN** AI 调用 `skill` 工具并传入不存在的技能名称
- **THEN** 系统返回错误信息
- **AND** 系统在错误信息中列出所有可用技能名称
- **AND** AI 可以重新调用正确的技能名称

#### Scenario: skill 工具描述包含可用技能列表
- **WHEN** 系统生成 skill 工具的描述
- **AND** 存在可用技能
- **THEN** 工具描述包含可用技能列表（XML 格式）
- **AND** 每个技能包含名称（描述可以使用名称或从内容中提取）
- **AND** AI 可以根据技能名称选择合适的技能

#### Scenario: 无可用技能时的工具描述
- **WHEN** 系统生成 skill 工具的描述
- **AND** 不存在任何可用技能
- **THEN** 工具描述说明当前无可用技能
- **AND** skill 工具仍然可用，但调用时会返回错误

### Requirement: 技能内容格式化
系统 MUST 将技能内容格式化为易读的格式返回给 AI。

#### Scenario: 技能内容格式化输出
- **WHEN** 系统加载技能内容
- **THEN** 输出格式包含：
  - 技能标题（`## Skill: <name>`）
  - 基础目录信息（`**Base directory**: <path>`）
  - 技能 Markdown 内容（原始内容）
- **AND** 格式化的内容作为纯文本返回给 AI

### Requirement: 技能元数据获取
系统 MUST 从目录结构获取技能元数据。

#### Scenario: 从目录名获取技能名称
- **WHEN** 系统扫描技能目录
- **THEN** 系统使用目录名作为技能名称
- **AND** 系统验证目录名非空且有效
- **AND** 如果目录名无效，系统跳过该技能

#### Scenario: 技能描述生成
- **WHEN** 系统生成技能描述（用于工具描述）
- **THEN** 系统可以使用技能名称作为描述
- **OR** 系统可以从 Markdown 内容的第一行或标题中提取描述（可选）

### Requirement: 工具集成
skill 工具 MUST 集成到 AI Provider 的工具系统中。

#### Scenario: skill 工具在 AI 对话中可用
- **WHEN** AI 开始对话
- **THEN** skill 工具自动添加到可用工具列表
- **AND** AI 可以看到 skill 工具的描述和参数
- **AND** AI 可以调用 skill 工具加载技能

#### Scenario: skill 工具与其他工具共存
- **WHEN** AI 对话中同时存在多个工具（terminal、read、skill 等）
- **THEN** skill 工具与其他工具互不干扰
- **AND** AI 可以同时使用 skill 工具和其他工具
- **AND** 工具调用顺序由 AI 决定

### Requirement: 测试技能
系统 MUST 包含一个测试技能用于验证功能。

#### Scenario: 测试技能存在
- **WHEN** 系统扫描技能目录
- **THEN** 系统发现 `test-skill` 技能（从目录名 `test-skill` 获取）
- **AND** 测试技能包含示例 Markdown 内容
- **AND** AI 可以成功加载测试技能内容

### Requirement: A2UI 消息自动检测
系统 MUST 自动检测 AI 返回的消息是否符合 A2UI 消息格式，并在符合时自动设置消息类型。

**重要**: 为了支持 JSONL 流式渲染，系统 MUST 在流式输出过程中提前检测 `---BEGIN A2UI---` 标记，并立即设置 `contentType = 'a2ui'`，而不是等到消息完成（`onDone`）才设置。这样前端可以更早知道消息类型，提前准备 A2UI 渲染器，实现流式渲染。

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
- **AND** 消息内容不是有效的 A2UI JSON 格式（例如普通文本、其他 JSON 格式等）
- **THEN** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理（如 Markdown 渲染）

#### Scenario: AI 返回格式错误的 JSON
- **WHEN** AI 完成消息生成
- **AND** 消息内容不是有效的 JSON 格式
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

