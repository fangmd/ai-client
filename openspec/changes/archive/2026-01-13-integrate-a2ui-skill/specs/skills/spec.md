## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: A2UI 消息自动检测
系统 MUST 自动检测 AI 返回的消息是否符合 A2UI 消息格式，并在符合时自动设置消息类型。

#### Scenario: AI 返回有效的 A2UI JSON 消息
- **WHEN** AI 完成消息生成
- **AND** 消息内容为有效的 JSON 数组，被 `---BEGIN A2UI---` 和 `---END A2UI---` 分隔符包裹
- **AND** 数组中的每个对象包含且仅包含以下操作之一：`beginRendering`、`surfaceUpdate`、`dataModelUpdate`、`deleteSurface`
- **THEN** 系统自动提取分隔符之间的纯 JSON 字符串
- **AND** 系统自动将消息的 `contentType` 设置为 `'a2ui'`
- **AND** 系统更新消息的 `content` 字段为提取的纯 JSON 字符串（去掉分隔符）
- **AND** 消息能够被正确渲染为 A2UI 界面

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
- **AND** 消息内容为 JSON 数组
- **AND** 数组中部分对象符合 A2UI 格式，部分不符合
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理

#### Scenario: AI 返回空数组
- **WHEN** AI 完成消息生成
- **AND** 消息内容为有效的 JSON 数组
- **AND** 数组为空（长度为 0）
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理

#### Scenario: AI 返回包含多个 A2UI 操作类型的对象
- **WHEN** AI 完成消息生成
- **AND** 消息内容为有效的 JSON 数组
- **AND** 数组中某个对象包含多个 A2UI 操作类型（例如同时包含 `beginRendering` 和 `surfaceUpdate`）
- **THEN** 系统不将消息识别为 A2UI 格式
- **AND** 系统不修改消息的 `contentType`
- **AND** 系统不修改消息的 `content` 字段
- **AND** 消息按照默认方式处理
