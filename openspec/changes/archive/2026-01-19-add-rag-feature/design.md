# RAG 功能技术架构设计

## Context

在 Electron 应用中实现 RAG（Retrieval-Augmented Generation）功能，让 AI 能够基于用户上传的本地文档进行回答。需要平衡性能、隐私和用户体验。

### 约束条件

- 数据必须存储在本地 SQLite 数据库
- 向量计算和文件解析是 CPU 密集型，不能阻塞主进程
- 必须使用本地 Embedding 方案，确保数据完全本地化
- 需要与现有 AI 聊天流程无缝集成

## Goals / Non-Goals

### Goals

- 实现完整的 RAG 流程：文档导入 → 文本切片 → 向量化 → 存储 → 检索 → 增强生成
- 支持多种文档格式（MD、TXT）
- 提供引用溯源功能，用户可查看原始文档片段
- 支持混合搜索（向量搜索 + 全文搜索）
- 使用本地 Embedding，确保数据完全本地化

### Non-Goals

- 不支持实时文档更新（需要重新索引）
- 不支持多语言混合索引（优先支持中文）
- 不支持图片 OCR（仅文本提取）

## Decisions

### 1. 数据库选型：SQLite + sqlite-vec

**决策**：使用 `better-sqlite3` + `sqlite-vec` 作为向量数据库

**理由**：
- 项目已使用 SQLite（Prisma），无需引入新数据库
- `sqlite-vec` 是 SQLite 的向量扩展，性能满足中小规模需求
- 数据完全本地化，符合隐私要求
- 与现有架构一致，减少复杂度

**替代方案**：
- ChromaDB：需要独立服务，增加部署复杂度
- Qdrant：需要独立服务，不符合本地化要求
- PostgreSQL + pgvector：需要独立数据库服务

### 2. 文本切片策略

**决策**：使用固定大小切片（~500 字符）+ 10% 重叠

**理由**：
- 简单可靠，易于实现和调试
- 500 字符适合大多数 LLM 上下文窗口
- 10% 重叠保持语义连续性

**替代方案**：
- 语义切片（使用模型判断）：计算成本高，延迟大
- 句子边界切片：需要 NLP 库，增加依赖

### 3. Embedding 模型选择

**决策**：使用 `bge-small-zh-v1.5`（512 维）作为本地 Embedding 模型

**理由**：
- `bge-small-zh` 对中文支持好，模型小（~50MB），适合本地运行
- 512 维平衡精度和存储空间
- 纯本地方案，确保数据隐私，无需网络连接
- 与项目本地化目标一致

**替代方案**：
- 其他本地模型：但 bge-small-zh 在中文场景下表现最佳
- 云端 API：不符合数据本地化要求，已排除

### 4. 进程模型：Worker Threads

**决策**：使用 Node.js Worker Threads 处理向量计算和文件解析

**理由**：
- 避免阻塞主进程和渲染进程
- 无需额外进程管理，简化架构
- 可以复用主进程的数据库连接（通过消息传递）

**替代方案**：
- Utility Process：Electron 特有，但需要额外 IPC 开销
- 主进程同步处理：会阻塞 UI，体验差

### 5. 混合搜索策略

**决策**：向量搜索 + FTS5 全文搜索，结果合并排序

**理由**：
- 向量搜索适合语义匹配
- FTS5 适合精确关键词匹配（如产品型号）
- 合并结果提供更好的召回率

**实现方式**：
- 分别执行两种搜索
- 使用加权分数合并结果
- 去重后返回 Top-K

### 6. RAG 集成方式

**决策**：在 AI Handler 中集成 RAG 检索，在发送给 LLM 前注入上下文

**理由**：
- 最小化对现有代码的修改
- 统一在 Handler 层处理，逻辑清晰
- 支持按会话或按消息启用 RAG

**流程**：
1. 用户发送消息
2. 如果启用 RAG，先执行向量检索
3. 将检索结果组装为系统消息或上下文消息
4. 发送给 LLM 生成回答
5. 在回答中标记引用来源

## 数据库设计

### 表结构

```sql
-- 知识库表
CREATE TABLE rag_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文档表
CREATE TABLE rag_document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    library_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'pending', -- pending, indexing, ready, failed
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(library_id) REFERENCES rag_library(id) ON DELETE CASCADE
);

-- 文档片段表
CREATE TABLE rag_chunk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER, -- 片段在文档中的索引
    metadata JSON, -- 存储页码、行号等信息
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES rag_document(id) ON DELETE CASCADE
);

-- 向量表（使用 sqlite-vec 虚拟表）
CREATE VIRTUAL TABLE rag_vector USING vec0(
    chunk_id INTEGER PRIMARY KEY,
    embedding FLOAT[512] -- bge-small-zh 为 512 维
);

-- 全文搜索表（FTS5）
CREATE VIRTUAL TABLE rag_chunk_fts USING fts5(
    chunk_id UNINDEXED,
    content,
    content=rag_chunk,
    content_rowid=id
);
```

### 索引策略

- `rag_document.library_id`：加速按库查询
- `rag_document.status`：加速状态筛选
- `rag_chunk.document_id`：加速按文档查询
- `rag_chunk_fts`：FTS5 自动索引

## 核心流程设计

### 1. 文档索引流程（Ingestion）

```
用户上传文件
  ↓
FileHandler 接收文件路径
  ↓
Worker Thread: 解析文件（MD/TXT）
  ↓
Worker Thread: 文本切片（500 字符，10% 重叠）
  ↓
Worker Thread: 向量化（本地 Embedding）
  ↓
主进程: 批量写入数据库（chunks + vectors）
  ↓
更新文档状态为 "ready"
```

### 2. RAG 检索流程（Retrieval）

```
用户发送消息
  ↓
AI Handler 检查是否启用 RAG
  ↓
Worker Thread: 将用户问题向量化
  ↓
主进程: 执行向量搜索（sqlite-vec）
  ↓
主进程: 执行全文搜索（FTS5）
  ↓
合并结果，按相关性排序，取 Top-K
  ↓
组装上下文 Prompt
  ↓
发送给 LLM（在系统消息中注入上下文）
  ↓
LLM 生成回答（带引用标记）
```

### 3. 引用溯源流程

```
AI 回答中包含引用标记 [1], [2]...
  ↓
前端解析引用标记
  ↓
用户点击引用标记
  ↓
IPC 查询对应的 chunk 信息
  ↓
侧边栏显示原始文本片段
  ↓
高亮显示匹配内容
```

## 性能优化

### 1. 批量处理

- 文档切片后批量向量化（每批 10-20 个）
- 向量写入使用事务批量插入

### 2. 异步处理

- 文件解析在 Worker Thread 异步执行
- 向量化在 Worker Thread 异步执行
- 主进程通过消息传递接收结果

### 3. 缓存策略

- Embedding 模型加载后缓存
- 常用文档的向量结果可缓存（可选）

### 4. 索引优化

- 使用事务批量插入向量
- 定期 VACUUM 优化数据库

## 错误处理

### 1. 文件解析失败

- 记录错误信息到 `rag_document.error_message`
- 状态标记为 `failed`
- UI 显示错误提示，允许重试

### 2. 向量化失败

- 重试机制（最多 3 次）
- 记录失败原因
- 跳过失败的 chunk，继续处理其他 chunk

### 3. 检索失败

- 降级为普通对话（不使用 RAG）
- 记录错误日志
- 用户无感知降级

## 安全考虑

### 1. 文件路径验证

- 验证文件路径在允许范围内
- 防止路径遍历攻击

### 2. 文件大小限制

- 单个文件限制 50MB
- 单个知识库总大小限制 500MB

### 3. 资源限制

- Worker Thread 数量限制（最多 2 个）
- 向量化并发数限制（最多 5 个）

## Migration Plan

### Phase 1: 基础架构

1. 安装依赖（sqlite-vec 等）
2. 创建数据库迁移（新增表结构）
3. 实现 Worker Thread 基础设施

### Phase 2: 文档处理

1. 实现文件解析器（MD、TXT）
2. 实现文本切片工具
3. 实现本地向量化服务

### Phase 3: 存储与检索

1. 实现向量存储（sqlite-vec）
2. 实现全文搜索（FTS5）
3. 实现混合搜索合并逻辑

### Phase 4: UI 集成

1. 在设置界面添加知识库管理 UI
2. 文档上传与状态显示
3. 在聊天界面添加知识库选择功能
4. RAG 高级配置 UI（Top-K、阈值，可选）
5. 引用溯源 UI

### Phase 5: AI 集成

1. 在 AI Handler 中集成 RAG 检索
2. 实现上下文注入
3. 实现引用标记解析

## Risks / Trade-offs

### 风险 1: sqlite-vec 编译问题

**风险**：`sqlite-vec` 需要原生编译，可能在不同平台出现问题

**缓解**：
- 提供详细的安装文档
- 考虑提供预编译版本

### 风险 2: 本地 Embedding 性能

**风险**：本地模型可能较慢，影响用户体验

**缓解**：
- 优化模型加载（延迟加载、缓存）
- 批量处理向量化任务
- 在 Worker Thread 中异步执行，不阻塞 UI
- 考虑使用更轻量的模型变体（如果性能仍不足）

### 风险 3: 向量搜索精度

**风险**：向量搜索可能返回不相关结果

**缓解**：
- 使用混合搜索（向量 + 全文）
- 提供相关性阈值配置
- 允许用户调整 Top-K 数量

### 风险 4: 数据库膨胀

**风险**：大量文档和向量数据可能导致数据库过大

**缓解**：
- 定期清理未使用的知识库
- 提供数据库压缩工具
- 限制单个知识库大小

## Open Questions

1. **引用标记格式**：使用 `[1]` 还是 `[ref:1]`？需要与 LLM 约定格式
2. **上下文长度**：Top-K 片段总长度可能超过 LLM 上下文窗口，需要截断策略
3. **增量更新**：文档更新后是否需要重新索引整个文档，还是支持增量更新？
4. **多语言支持**：当前优先中文，后续是否需要支持英文等其他语言？
