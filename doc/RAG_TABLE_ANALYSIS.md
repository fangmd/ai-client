# RAG 表结构分析

本文档详细分析 RAG 系统中各个数据库表的结构和作用。

## 数据库配置

- **数据库文件位置**：
  - 开发环境：`<projectRoot>/prisma/rag.db`
  - 生产环境：`<userData>/data/rag.db`
- **数据库引擎**：SQLite (better-sqlite3)
- **扩展插件**：sqlite-vec（向量搜索）、fts5（全文搜索）
- **配置参数**：
  - `foreign_keys = ON`：启用外键约束
  - `journal_mode = WAL`：WAL 模式，提升并发性能
  - `synchronous = NORMAL`：平衡性能与安全性
  - `cache_size = -64000`：64MB 缓存

---

## 表结构详解

### 1. rag_library（知识库表）

**作用**：存储知识库（Library）的基本信息，是 RAG 系统的顶层组织单位。

**表结构**：
```sql
CREATE TABLE rag_library (
  id INTEGER PRIMARY KEY,              -- 主键，自增
  name TEXT NOT NULL,                  -- 知识库名称
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);
```

**字段说明**：
- `id`：知识库唯一标识
- `name`：知识库名称（用户可自定义）
- `created_at`：创建时间戳
- `updated_at`：最后更新时间戳

**关系**：
- 一对多关系：一个知识库可以包含多个文档（`rag_document.library_id`）

**使用场景**：
- 用户创建知识库时插入记录
- 用户重命名知识库时更新 `name` 和 `updated_at`
- 删除知识库时，由于外键级联删除，会同时删除该库下的所有文档和分块

---

### 2. rag_document（文档表）

**作用**：存储上传到知识库的文档信息，记录文档的元数据和索引状态。

**表结构**：
```sql
CREATE TABLE rag_document (
  id INTEGER PRIMARY KEY,              -- 主键，自增
  library_id INTEGER NOT NULL,         -- 所属知识库 ID（外键）
  file_name TEXT NOT NULL,             -- 文件名
  file_path TEXT NOT NULL,             -- 文件完整路径
  file_size INTEGER,                   -- 文件大小（字节）
  mime_type TEXT,                      -- MIME 类型
  status TEXT DEFAULT 'pending',       -- 索引状态
  error_message TEXT,                  -- 错误信息（如果索引失败）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
  FOREIGN KEY(library_id) REFERENCES rag_library(id) ON DELETE CASCADE
);
```

**字段说明**：
- `id`：文档唯一标识
- `library_id`：所属知识库 ID（外键，级联删除）
- `file_name`：原始文件名（如 `example.md`）
- `file_path`：文件的完整存储路径
- `file_size`：文件大小（可选）
- `mime_type`：MIME 类型（可选，如 `text/markdown`）
- `status`：索引状态，可选值：
  - `pending`：待索引（初始状态）
  - `indexing`：正在索引中
  - `ready`：索引完成，可用于检索
  - `failed`：索引失败
- `error_message`：如果索引失败，存储错误信息
- `created_at`：文档上传时间
- `updated_at`：最后更新时间（索引状态变化时更新）

**关系**：
- 多对一关系：多个文档属于一个知识库（`library_id` → `rag_library.id`）
- 一对多关系：一个文档可以包含多个分块（`rag_chunk.document_id`）

**使用场景**：
- 用户上传文档时插入记录（状态为 `pending`）
- 开始索引时更新状态为 `indexing`
- 索引完成时更新状态为 `ready`
- 索引失败时更新状态为 `failed` 并记录 `error_message`
- 删除文档时，由于外键级联删除，会同时删除该文档的所有分块

---

### 3. rag_chunk（文档分块表）

**作用**：存储文档被切分后的文本片段（chunk），是实际参与检索的最小单位。

**表结构**：
```sql
CREATE TABLE rag_chunk (
  id INTEGER PRIMARY KEY,              -- 主键，自增
  document_id INTEGER NOT NULL,        -- 所属文档 ID（外键）
  content TEXT NOT NULL,               -- 分块文本内容
  chunk_index INTEGER,                 -- 分块在文档中的索引位置
  metadata JSON,                       -- 元数据（JSON 格式）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  FOREIGN KEY(document_id) REFERENCES rag_document(id) ON DELETE CASCADE
);
```

**字段说明**：
- `id`：分块唯一标识（与 `rag_vector.rowid` 对齐）
- `document_id`：所属文档 ID（外键，级联删除）
- `content`：分块的文本内容（实际参与检索的内容）
- `chunk_index`：分块在文档中的顺序索引（从 0 开始）
- `metadata`：JSON 格式的元数据，通常包含：
  - `startOffset`：在原文中的起始偏移量
  - `endOffset`：在原文中的结束偏移量
  - `startLine`：起始行号
  - `endLine`：结束行号
- `created_at`：分块创建时间（索引时写入）

**关系**：
- 多对一关系：多个分块属于一个文档（`document_id` → `rag_document.id`）
- 一对一关系：每个分块对应一个向量（`id` = `rag_vector.rowid`）
- 通过触发器与 `rag_chunk_fts` 全文检索表同步

**使用场景**：
- 文档索引时，将文档内容按固定大小（默认 500 字符）和重叠率（默认 10%）切分后批量插入
- 检索时，通过向量搜索或全文搜索找到相关分块 ID，再查询此表获取完整内容
- 删除文档时，由于外键级联删除，会同时删除该文档的所有分块

**分块策略**：
- 默认 `chunkSize = 500` 字符
- 默认 `overlapRatio = 0.1`（10% 重叠，避免边界信息丢失）

---

### 4. rag_vector（向量表）

**作用**：存储文档分块的向量嵌入（embedding），用于向量相似度搜索。

**表结构**：
```sql
CREATE VIRTUAL TABLE rag_vector USING vec0(
  embedding FLOAT[512]  -- 512 维浮点向量
);
```

**字段说明**：
- `rowid`：隐式主键，与 `rag_chunk.id` 对齐（一对一关系）
- `embedding`：512 维浮点向量数组（对应 `bge-small-zh-v1.5` 模型）

**技术细节**：
- **虚拟表**：使用 `sqlite-vec` 扩展的 `vec0` 虚拟表
- **向量维度**：固定为 512 维（与当前使用的 embedding 模型匹配）
- **rowid 对齐**：`rowid` 必须与 `rag_chunk.id` 保持一致，确保向量与分块一一对应

**使用场景**：
- 文档索引时，对每个分块调用 embedding 模型生成向量，然后插入：
  ```sql
  INSERT OR REPLACE INTO rag_vector(rowid, embedding) VALUES (chunkId, embeddingArray)
  ```
- 检索时，将用户查询向量化后执行相似度搜索：
  ```sql
  SELECT rowid, distance 
  FROM rag_vector 
  WHERE embedding MATCH ? 
  ORDER BY distance 
  LIMIT ?
  ```
- 距离越小表示越相似

**注意事项**：
- 如果更换 embedding 模型（维度不同），需要重建整个向量表
- 向量计算在索引阶段完成，检索时只需执行向量搜索

---

### 5. rag_chunk_fts（全文检索表）

**作用**：提供对分块内容的全文搜索能力，支持关键词匹配和 BM25 排序。

**表结构**：
```sql
CREATE VIRTUAL TABLE rag_chunk_fts USING fts5(
  content,                    -- 索引的文本字段
  content='rag_chunk',        -- 内容来源表
  content_rowid='id'          -- 来源表的 rowid 字段
);
```

**字段说明**：
- `rowid`：隐式主键，与 `rag_chunk.id` 对齐
- `content`：被索引的文本内容（来自 `rag_chunk.content`）

**技术细节**：
- **虚拟表**：使用 SQLite 内置的 `fts5` 全文搜索扩展
- **外部内容表**：通过 `content='rag_chunk'` 和 `content_rowid='id'` 配置，表示数据来源
- **自动同步**：通过触发器（见下方）与 `rag_chunk` 表保持同步

**使用场景**：
- 检索时执行关键词搜索：
  ```sql
  SELECT rowid, bm25(rag_chunk_fts) as score
  FROM rag_chunk_fts
  WHERE rag_chunk_fts MATCH ?
  ORDER BY bm25(rag_chunk_fts)
  LIMIT ?
  ```
- BM25 分数越小表示越相关
- 适合精确关键词匹配（如产品型号、特定术语）

**触发器同步机制**：
系统通过三个触发器自动维护 `rag_chunk_fts` 与 `rag_chunk` 的同步：

1. **rag_chunk_ai**（AFTER INSERT）：
   - 当插入新分块时，自动将内容同步到全文检索表

2. **rag_chunk_au**（AFTER UPDATE）：
   - 当更新分块时，先删除旧内容，再插入新内容

3. **rag_chunk_ad**（AFTER DELETE）：
   - 当删除分块时，自动从全文检索表中删除对应记录

---

## 表关系图

```
rag_library (知识库)
    │
    │ 1:N (library_id)
    ▼
rag_document (文档)
    │
    │ 1:N (document_id)
    ▼
rag_chunk (分块)
    │
    ├── 1:1 (id = rowid) ──► rag_vector (向量表)
    │
    └── 1:1 (id = rowid) ──► rag_chunk_fts (全文检索表)
                            (通过触发器自动同步)
```

---

## 数据流转示例

### 索引流程（文档上传 → 可检索）

1. **创建知识库**：插入 `rag_library` 记录
2. **上传文档**：插入 `rag_document` 记录（`status = 'pending'`）
3. **开始索引**：更新 `rag_document.status = 'indexing'`
4. **解析文档**：读取文件内容
5. **文本分块**：将内容切分为多个 chunk
6. **写入分块**：批量插入 `rag_chunk` 记录（触发器自动同步到 `rag_chunk_fts`）
7. **生成向量**：对每个 chunk 调用 embedding 模型
8. **写入向量**：插入 `rag_vector` 记录（`rowid = chunk.id`）
9. **完成索引**：更新 `rag_document.status = 'ready'`

### 检索流程（查询 → 返回相关片段）

1. **向量化查询**：将用户问题转换为 512 维向量
2. **向量搜索**：在 `rag_vector` 中查找最相似的 TopK 个向量（按 distance 排序）
3. **全文搜索**：在 `rag_chunk_fts` 中查找匹配关键词的 TopK 个分块（按 BM25 排序）
4. **混合融合**：将两种搜索结果合并，加权计算最终分数
5. **获取内容**：根据 chunk ID 查询 `rag_chunk` 获取完整文本内容
6. **关联文档**：根据 `document_id` 查询 `rag_document` 获取文档信息
7. **返回结果**：组装为包含内容、文档信息、元数据的检索结果

---

## 关键设计点

### 1. 级联删除
- 删除知识库 → 自动删除所有文档 → 自动删除所有分块 → 自动清理向量和全文索引
- 删除文档 → 自动删除所有分块 → 自动清理向量和全文索引
- 通过外键约束 `ON DELETE CASCADE` 实现

### 2. 虚拟表设计
- `rag_vector` 和 `rag_chunk_fts` 都是虚拟表，不直接存储数据
- `rag_vector` 使用 `sqlite-vec` 扩展，提供高效的向量搜索
- `rag_chunk_fts` 使用 `fts5` 扩展，提供全文搜索和 BM25 排序

### 3. rowid 对齐
- `rag_chunk.id` = `rag_vector.rowid` = `rag_chunk_fts.rowid`
- 确保分块、向量、全文索引三者的数据一致性

### 4. 触发器同步
- 通过触发器自动维护 `rag_chunk_fts` 与 `rag_chunk` 的同步
- 无需手动维护，保证数据一致性

### 5. 混合搜索策略
- **向量搜索**：语义相似度匹配（适合理解用户意图）
- **全文搜索**：关键词精确匹配（适合产品型号、术语等）
- **融合排序**：加权合并两种结果，提升召回率和准确性

---

## 性能优化建议

1. **索引优化**：
   - 考虑为 `rag_document.library_id` 和 `rag_document.status` 添加索引
   - 考虑为 `rag_chunk.document_id` 添加索引

2. **批量操作**：
   - 索引时批量插入 chunk 和 vector，减少事务开销
   - Embedding 按批次处理（当前 `EMBEDDING_BATCH_SIZE=15`）

3. **查询优化**：
   - 向量搜索和全文搜索可以并行执行
   - 限制 TopK 数量，避免返回过多结果

4. **存储优化**：
   - WAL 模式提升并发读写性能
   - 合理的缓存大小（当前 64MB）

---

## 总结

RAG 表结构设计遵循了清晰的分层架构：
- **rag_library**：顶层组织（知识库）
- **rag_document**：文档管理（元数据和状态）
- **rag_chunk**：内容存储（实际检索单位）
- **rag_vector**：向量索引（语义搜索）
- **rag_chunk_fts**：全文索引（关键词搜索）

通过外键约束、触发器同步、虚拟表等技术，实现了高效、一致、易维护的 RAG 数据存储和检索系统。
