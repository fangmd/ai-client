## MODIFIED Requirements
### Requirement: RAG 增强对话

系统 SHALL 在对话中集成 RAG 检索，基于知识库内容增强 AI 回答。

#### Scenario: 选择知识库
- **WHEN** 用户在聊天界面打开知识库入口（位于“附近选择器”右侧的“知识库”图标）
- **AND** 在弹出的列表中选择某个知识库
- **THEN** 系统将该知识库选择保存到当前会话（`ChatSession.ragLibraryId`，可为空）
- **AND THEN** 聊天界面在知识库图标处体现“已选择”状态（例如高亮/提示当前库名称）
- **AND THEN** 后续对话将使用该知识库进行 RAG 检索

#### Scenario: 默认不选择
- **GIVEN** 用户创建一个新的聊天会话
- **THEN** 会话的默认知识库选择 SHALL 为“不选择”（`ChatSession.ragLibraryId = null`）
- **AND THEN** 聊天界面的知识库图标初始状态为“未选择”

#### Scenario: 禁用 RAG 模式
- **WHEN** 用户将知识库选择设置为“不选择/无”
- **THEN** 系统将当前会话的 `ChatSession.ragLibraryId` 置为 `null`
- **AND THEN** 系统在后续对话中不使用 RAG 检索
- **AND** AI 回答基于通用知识生成

#### Scenario: 启用 RAG 模式
- **WHEN** 用户在聊天界面选择了知识库（`ChatSession.ragLibraryId` 不为 `null`）
- **THEN** 系统在后续对话中启用 RAG 检索
- **AND** AI 回答基于知识库内容生成

#### Scenario: RAG 检索流程
- **WHEN** 用户发送消息且 RAG 模式已启用
- **THEN** 系统将用户问题向量化
- **AND** 在知识库中执行向量搜索
- **AND** 执行全文搜索（FTS5）
- **AND** 合并搜索结果，取 Top-K 相关片段
- **AND** 应用相关性阈值过滤（默认 0.2）
- **AND** 将片段作为 system message 注入到 LLM Prompt
- **AND** LLM 基于上下文生成回答

#### Scenario: RAG 上下文注入格式
- **WHEN** RAG 检索完成且存在相关片段
- **THEN** 系统将检索结果组装为特定格式的 system message
- **AND** 格式为："以下是检索到的参考内容，请结合引用编号回答：\n\n[1] <文件名> (行 x-y)\n<片段内容>\n\n[2] ..."
- **AND** 每个片段最多截断为 800 字符
- **AND** 片段按相关性排序并编号
- **AND** system message 插入在系统提示词之后、用户消息之前

