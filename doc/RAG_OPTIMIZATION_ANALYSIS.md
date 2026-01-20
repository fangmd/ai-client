# RAG 技术方案优化分析

本文档基于对现有 RAG 技术方案的深入分析，提出具体的优化建议和改进方向。

## 一、核心问题分析

### 1.1 库级过滤效率问题 ⚠️ **高优先级**

**问题描述**：
- 当前实现中，`searchHybrid` 在全库范围内检索（不区分 `libraryId`）
- 检索完成后，通过 JOIN 查询过滤 `libraryId`，导致：
  - 检索了大量不相关的 chunk（来自其他知识库）
  - 浪费了向量计算和全文检索的计算资源
  - 当知识库数量增多时，性能会显著下降

**影响范围**：
- `src/main/utils/hybrid-search.ts`：`searchHybrid` 函数
- `src/main/utils/vector-store.ts`：`searchVectors` 函数
- `src/main/utils/fulltext-search.ts`：`searchFulltext` 函数
- `src/main/handlers/rag-handler.ts`：`rag:search` 处理
- `src/main/handlers/ai-handler.ts`：`buildRagContext` 函数

**优化方案**：
1. **方案 A（推荐）**：在检索阶段加入库级过滤
   - 修改 `searchVectors` 和 `searchFulltext`，接受 `libraryId` 参数
   - 通过 JOIN `rag_chunk` → `rag_document` 在 SQL 层面过滤
   - 优点：减少检索数据量，提升性能
   - 缺点：需要修改 SQL 查询，可能影响索引使用

2. **方案 B**：扩大 TopK 后过滤
   - 检索时使用更大的 TopK（如 `topK * 2` 或 `topK * 3`）
   - 检索完成后过滤 `libraryId`，再取前 `topK`
   - 优点：改动小，向后兼容
   - 缺点：仍然检索不相关数据，只是减少了影响

**推荐实现**（方案 A）：
```typescript
// 修改 searchVectors 和 searchFulltext 支持 libraryId 过滤
export function searchVectors(
  queryEmbedding: Float32Array,
  topK: number,
  libraryId?: bigint
): VectorSearchResult[] {
  const db = getRagDatabase()
  let query = `
    SELECT rag_vector.rowid as chunkId, rag_vector.distance
    FROM rag_vector
  `
  
  if (libraryId) {
    query += `
      JOIN rag_chunk ON rag_vector.rowid = rag_chunk.id
      JOIN rag_document ON rag_chunk.document_id = rag_document.id
      WHERE rag_vector.embedding MATCH ?
        AND rag_document.library_id = ?
      ORDER BY rag_vector.distance
      LIMIT ?
    `
    return db.prepare(query).all(queryEmbedding, libraryId, topK) as VectorSearchResult[]
  } else {
    query += `
      WHERE rag_vector.embedding MATCH ?
      ORDER BY rag_vector.distance
      LIMIT ?
    `
    return db.prepare(query).all(queryEmbedding, topK) as VectorSearchResult[]
  }
}
```

### 1.2 数据库索引缺失 ✅ **已完成**

**问题描述**：
- 文档中提到应该添加索引，但代码中未实现
- 缺少索引会导致 JOIN 查询性能下降，特别是在数据量增大时

**缺失的索引**：
1. `rag_document.library_id`：用于库级过滤
2. `rag_document.status`：用于状态查询
3. `rag_chunk.document_id`：用于文档关联查询

**优化方案**：
在 `src/main/utils/rag-db.ts` 的 `createRagTables` 函数中添加索引：

```typescript
function createRagTables(db: Database.Database): void {
  // ... 现有表创建代码 ...
  
  // 添加索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rag_document_library_id 
    ON rag_document(library_id);
    
    CREATE INDEX IF NOT EXISTS idx_rag_document_status 
    ON rag_document(status);
    
    CREATE INDEX IF NOT EXISTS idx_rag_chunk_document_id 
    ON rag_chunk(document_id);
  `)
}
```

**实施状态**：✅ **已完成**
- 已在 `src/main/utils/rag-db.ts` 中添加三个索引
- 使用 `CREATE INDEX IF NOT EXISTS` 确保向后兼容
- 索引会在数据库初始化时自动创建
- 对于已有数据库，首次运行时会创建索引

### 1.3 检索并行化优化 ⚡ **中优先级**

**问题描述**：
- 向量搜索和全文搜索是串行执行的
- 两者互不依赖，可以并行执行以提升性能

**当前实现**：
```typescript
const vectorResults = searchVectors(query.embedding, topK)
const fulltextResults = searchFulltext(query.text, topK)
```

**优化方案**：
```typescript
const [vectorResults, fulltextResults] = await Promise.all([
  Promise.resolve(searchVectors(query.embedding, topK)),
  Promise.resolve(searchFulltext(query.text, topK))
])
```

**注意**：由于 `searchVectors` 和 `searchFulltext` 是同步函数，需要确保它们不会阻塞事件循环。如果它们执行时间较长，可以考虑：
- 使用 `setImmediate` 或 `process.nextTick` 包装
- 或者迁移到 Worker 线程执行

### 1.4 代码重复问题 🔄 **中优先级**

**问题描述**：
- `rag-handler.ts` 的 `rag:search` 和 `ai-handler.ts` 的 `buildRagContext` 中有大量重复的检索后处理逻辑
- 包括：chunk 查询、文档信息关联、结果组装等

**优化方案**：
抽取公共函数到 `src/main/utils/rag-search-helper.ts`：

```typescript
export interface RagSearchResult {
  chunkId: bigint
  score: number
  content: string
  metadata: Record<string, unknown>
  document: {
    documentId: bigint
    libraryId: bigint
    fileName: string
    filePath: string
  }
}

export function enrichSearchResults(
  results: HybridSearchResult[],
  libraryId: bigint
): RagSearchResult[] {
  // 统一的检索结果增强逻辑
  // ...
}
```

### 1.5 阈值过滤时机优化 🎯 **中优先级**

**问题描述**：
- 当前在 `buildRagContext` 中，threshold 过滤是在检索完成后进行的
- 这意味着即使设置了较高的 threshold，仍然会检索很多不相关的 chunk

**优化方案**：
1. **方案 A**：在融合评分后立即过滤，减少后续处理
   ```typescript
   const results = searchHybrid(...)
     .filter((item) => item.score >= threshold)
     .slice(0, topK)
   ```

2. **方案 B**：在检索阶段就应用阈值（需要修改 `searchHybrid` 接口）
   - 向量搜索和全文搜索都返回评分，可以在融合前就过滤低分结果
   - 但需要注意归一化后的阈值如何映射到原始距离/BM25 分数

**当前实现已接近方案 A**，但可以考虑在 `searchHybrid` 内部就支持阈值过滤。

### 1.6 TopK 放大问题 📊 **低优先级**

**问题描述**：
- 由于后处理过滤 `libraryId`，实际返回的结果可能少于 `topK`
- 例如：检索 5 条，但只有 2 条属于目标知识库，最终只返回 2 条

**优化方案**：
在检索时使用放大的 TopK：
```typescript
const searchTopK = Math.ceil(topK * 1.5) // 或根据知识库数量动态调整
const results = searchHybrid(..., { topK: searchTopK })
  .filter(/* libraryId 过滤 */)
  .slice(0, topK)
```

### 1.7 分块策略优化 📝 **低优先级（未来优化）**

**问题描述**：
- 当前使用固定长度分块（500 字符），没有考虑语义边界
- 可能导致句子、段落被截断，影响检索质量

**优化方案**（未来考虑）：
1. **语义分块**：基于句子、段落边界分块
2. **递归分块**：优先按段落，过大时再按句子
3. **重叠优化**：在语义边界处增加重叠，而非固定比例

**实现建议**：
- 可以引入 `langchain` 的 `RecursiveCharacterTextSplitter`
- 或自定义实现基于 Markdown 结构的智能分块

### 1.8 索引并发处理 ⚙️ **低优先级（已提及）**

**问题描述**：
- 文档中提到"执行线程：主线程"，索引过程可能阻塞 UI

**优化方案**：
- 已在文档的"可扩展点"中提及 Worker 化
- 当前实现通过 `runWorkerTask` 已经部分 Worker 化（parse/chunk/embed）
- 但数据库写入仍在主线程，可以考虑批量事务优化

## 二、性能优化建议

### 2.1 数据库查询优化

1. **批量查询优化**：
   - 当前 `getRagChunksByIds` 使用 `IN` 查询，对于大量 chunkId 可能性能不佳
   - 考虑分批查询或使用临时表 JOIN

2. **查询结果缓存**：
   - 对于频繁查询的文档信息，可以考虑短期缓存
   - 但需要注意缓存失效（文档更新/删除时）

### 2.2 Embedding 批处理优化

**当前实现**：
- `EMBEDDING_BATCH_SIZE = 15`，按批次处理

**优化建议**：
- 可以根据模型性能和内存情况动态调整批次大小
- 对于大文档，可以考虑流式处理，边生成边写入

### 2.3 检索结果去重

**问题**：
- 如果同一个 chunk 在向量搜索和全文搜索中都出现，融合时会合并
- 但如果两个不同的 chunk 内容相似，可能都返回，造成冗余

**优化建议**：
- 可以考虑基于内容相似度的去重（需要额外计算，可能影响性能）
- 或者在前端展示时去重

## 三、代码质量优化

### 3.1 类型安全

- 确保所有 `bigint` 类型处理正确（SQLite 返回可能是 `number`）
- 当前代码中已有类型转换，但可以进一步统一

### 3.2 错误处理

- 检索失败时的降级策略（例如：向量搜索失败时是否只使用全文搜索）
- 数据库连接异常的处理

### 3.3 日志和监控

- 添加检索性能指标（耗时、结果数量等）
- 记录检索失败的情况，便于排查问题

## 四、优化优先级总结

| 优先级 | 优化项 | 影响 | 实现难度 | 状态 |
|--------|--------|------|----------|------|
| 🔴 高 | 库级过滤优化 | 性能显著提升 | 中 | ⏳ 待实施 |
| 🔴 高 | 数据库索引 | 查询性能提升 | 低 | ✅ **已完成** |
| 🟡 中 | 检索并行化 | 性能小幅提升 | 低 | ⚠️ 评估后实施 |
| 🟡 中 | 代码重复消除 | 可维护性提升 | 中 | ✅ 建议实施 |
| 🟡 中 | 阈值过滤优化 | 检索精度提升 | 低 | ⚠️ 评估后实施 |
| 🟢 低 | TopK 放大 | 检索完整性提升 | 低 | ⚠️ 可选 |
| 🟢 低 | 分块策略优化 | 检索质量提升 | 高 | ⏸️ 未来考虑 |
| 🟢 低 | Worker 化 | UI 响应性提升 | 高 | ⏸️ 未来考虑 |

## 五、实施建议

### 第一阶段（立即实施）
1. ✅ **已完成** - 添加数据库索引
   - 已添加 `idx_rag_document_library_id`
   - 已添加 `idx_rag_document_status`
   - 已添加 `idx_rag_chunk_document_id`
2. ⏳ **待实施** - 实现库级过滤优化（方案 A 或 B）

### 第二阶段（短期优化）
1. 检索并行化
2. 代码重复消除
3. 阈值过滤优化

### 第三阶段（长期优化）
1. 分块策略优化
2. Worker 化完善
3. 其他性能监控和优化

## 六、实施状态追踪

### 已完成 ✅
- **数据库索引优化**（2024-01-XX）
  - 添加了三个关键索引以优化查询性能
  - 文件：`src/main/utils/rag-db.ts`
  - 影响：提升 JOIN 查询性能，特别是库级过滤和文档关联查询

### 进行中 ⏳
- 暂无

### 待实施 📋
- 库级过滤优化
- 检索并行化
- 代码重复消除
- 其他优化项

## 七、注意事项

1. **向后兼容性**：
   - 优化时需要考虑现有数据的兼容性
   - 索引添加是安全的，但查询逻辑修改需要测试

2. **测试覆盖**：
   - 优化后需要充分测试，特别是多知识库场景
   - 性能测试：对比优化前后的检索耗时

3. **渐进式优化**：
   - 建议分阶段实施，每次优化后验证效果
   - 避免一次性大改，降低风险
