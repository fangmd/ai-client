# Git Commit 规则

## 提交格式

```
<type>(<scope>): <subject>
```

## Type 类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关
- `build`: 构建系统相关

## Scope 范围（可选）

### 技术层 Scope

- `ui`: 界面相关
- `api`: API 相关
- `db`: 数据库相关
- `tool`: 工具相关

### 业务模块 Scope（推荐）

优先使用业务模块作为 scope，更直观地反映改动内容：

- `chat`: 会话管理相关
- `message`: 消息管理相关
- `provider`: AI 提供商管理相关
- `file`: 文件/附件相关
- `config`: 配置管理相关
- `mcp`: MCP 集成相关
- `ai`: AI 对话处理相关

### 使用建议

- **业务模块优先**：如果改动主要涉及某个业务功能，使用业务模块 scope
- **技术层兜底**：如果是跨业务模块的技术性改动（如数据库迁移、API 重构），使用技术层 scope
- **混合使用**：允许同时使用，如 `feat(chat,ui): 添加会话列表组件`

## Subject 说明

- 使用中文或英文
- 首字母小写
- 结尾不加句号
- 简洁描述改动内容

## 示例

```
# 业务模块 scope（推荐）
feat(chat): 添加会话删除功能
fix(message): 修复消息流式显示问题
feat(provider): 支持自定义 API 端点
refactor(file): 优化文件存储逻辑

# 技术层 scope
fix(api): 修复 OpenAI 响应解析错误
refactor(db): 优化数据库查询逻辑
feat(ui): 添加消息输入框

# 混合使用
feat(chat,ui): 添加会话列表组件
```
