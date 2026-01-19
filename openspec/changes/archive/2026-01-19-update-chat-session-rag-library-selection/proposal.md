# Change: 聊天会话持久化知识库选择（UI 图标 + ChatSession 关联）

## Why
当前聊天页的知识库选择存在两点缺口：
- UI 位置与现有“附近选择器”未形成一致的工具栏布局，且知识库入口不够直观。
- 知识库选择仅停留在运行时状态，未作为会话字段持久化，导致切换/恢复会话时无法稳定复现 RAG 选择。

## What Changes
- 在聊天界面将“知识库选择入口”与现有 UI 结合：放在“附近选择器”右侧，使用“知识库”图标作为入口，点击后弹出可选知识库列表。
- 将选中的知识库保存为 `ChatSession` 下的字段（nullable），用于会话级别持久化，并形成关联（逻辑关联到 RAG 数据库的 `rag_library.id`）。
- 默认知识库为“不选择”（即不启用 RAG）。

## Impact
- Affected specs: `openspec/specs/rag/spec.md`
- Affected code (expected): 聊天页工具栏/附近选择器区域、会话创建/加载、Prisma `ChatSession` 模型与会话读写逻辑

