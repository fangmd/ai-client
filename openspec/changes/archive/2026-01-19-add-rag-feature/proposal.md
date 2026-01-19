# Change: 添加 RAG 功能

## Why

用户需要基于本地文档进行 AI 对话，确保数据隐私（使用本地 LLM 或本地 Embedding 时），并提供引用溯源能力。当前系统仅支持直接对话，无法利用用户上传的文档知识。

## What Changes

- **新增知识库管理能力**：支持创建、重命名、删除多个知识库，管理文档导入
- **新增文档解析能力**：支持 Markdown、TXT 格式文件的文本提取和切片
- **新增向量存储与检索**：基于 SQLite + sqlite-vec 实现本地向量数据库，支持语义搜索
- **增强对话体验**：在对话中集成 RAG，支持库切换、引用溯源、上下文控制
- **新增 Embedding 支持**：使用本地 Embedding（@xenova/transformers），确保数据完全本地化
- **数据库扩展**：新增知识库、文档、文档片段、向量存储相关表结构

## Impact

- **受影响的能力**：
  - 新增 `rag` 能力（知识库管理、文档索引、向量检索、RAG 增强对话）
  - 修改 `ai-chat` 能力（集成 RAG 检索流程）
- **受影响的代码**：
  - `prisma/schema.prisma` - 新增数据模型
  - `src/main/handlers/` - 新增 `rag-handler.ts`
  - `src/main/repository/` - 新增知识库、文档相关 Repository
  - `src/main/providers/` - 新增 Embedding Provider
  - `src/main/utils/` - 新增文档解析、文本切片、向量检索工具
  - `src/renderer/src/` - 新增知识库管理 UI、RAG 配置 UI
  - `src/common/constants/ipc.ts` - 新增 RAG 相关 IPC 通道
- **新增依赖**：
  - `better-sqlite3`（已存在）
  - `sqlite-vec`（需新增）
  - `@xenova/transformers`（本地 Embedding）
  - 自定义文本切片工具
