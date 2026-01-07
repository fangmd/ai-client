## ADDED Requirements

### Requirement: MCP 配置管理
系统 MUST 允许用户通过设置界面管理 MCP 服务器配置，包括添加、编辑、删除和启用/禁用 MCP 服务器。

#### Scenario: 用户添加新的 MCP 服务器配置
- **WHEN** 用户在设置页面点击"添加 MCP 服务器"按钮
- **AND** 用户填写服务器标签、描述、URL 等信息
- **AND** 用户点击保存
- **THEN** 系统将配置保存到数据库
- **AND** 系统自动连接到新配置的 MCP 服务器
- **AND** 新配置的 MCP 工具立即可用于 AI 对话

#### Scenario: 用户编辑现有 MCP 服务器配置
- **WHEN** 用户在设置页面点击某个 MCP 配置的"编辑"按钮
- **AND** 用户修改配置信息（如 URL、描述等）
- **AND** 用户点击保存
- **THEN** 系统更新数据库中的配置
- **AND** 系统断开旧连接并重新连接到更新后的 MCP 服务器

#### Scenario: 用户删除 MCP 服务器配置
- **WHEN** 用户在设置页面点击某个 MCP 配置的"删除"按钮
- **AND** 用户确认删除操作
- **THEN** 系统从数据库中删除配置
- **AND** 系统断开与该 MCP 服务器的连接
- **AND** 该 MCP 服务器的工具不再可用

#### Scenario: 用户启用/禁用 MCP 服务器
- **WHEN** 用户在设置页面切换某个 MCP 配置的启用/禁用开关
- **THEN** 系统更新配置的启用状态
- **AND** 如果禁用，系统断开连接并隐藏该服务器的工具
- **AND** 如果启用，系统连接服务器并使工具可用

#### Scenario: 应用启动时加载 MCP 配置
- **WHEN** 应用启动
- **THEN** 系统从数据库读取所有启用的 MCP 配置
- **AND** 系统自动连接到所有启用的 MCP 服务器
- **AND** 所有可用的 MCP 工具在 AI 对话中可用

### Requirement: MCP 配置数据验证
系统 MUST 验证用户输入的 MCP 配置数据，确保配置的有效性。

#### Scenario: 用户输入无效的 URL
- **WHEN** 用户输入不符合 URL 格式的服务器地址
- **THEN** 系统显示错误提示
- **AND** 系统不允许保存配置

#### Scenario: 用户输入重复的服务器标签
- **WHEN** 用户输入的服务器标签与现有配置重复
- **THEN** 系统显示错误提示
- **AND** 系统不允许保存配置

#### Scenario: 用户未填写必填字段
- **WHEN** 用户未填写服务器标签或 URL
- **THEN** 系统显示错误提示
- **AND** 系统不允许保存配置

### Requirement: MCP 配置持久化存储
系统 MUST 将 MCP 配置持久化存储到数据库中，确保应用重启后配置仍然有效。

#### Scenario: 配置保存到数据库
- **WHEN** 用户保存 MCP 配置
- **THEN** 配置以 JSON 格式存储到 Config 表中
- **AND** 配置键为 `mcp_servers`，值为包含所有 MCP 服务器配置的 JSON 数组

#### Scenario: 应用重启后配置恢复
- **WHEN** 应用重启
- **THEN** 系统从数据库读取 `mcp_servers` 配置
- **AND** 系统根据配置自动连接所有启用的 MCP 服务器

## MODIFIED Requirements

### Requirement: MCP 客户端初始化
MCP 客户端初始化时 MUST 从数据库读取配置，而不是从硬编码的配置文件读取。

#### Scenario: 从数据库读取配置初始化
- **WHEN** MCP 客户端初始化
- **THEN** 系统从数据库读取 `mcp_servers` 配置
- **AND** 系统仅连接启用状态的 MCP 服务器
- **AND** 如果数据库中没有配置，系统使用空数组（不连接任何服务器）

