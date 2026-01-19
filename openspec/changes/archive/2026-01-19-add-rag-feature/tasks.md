# RAG 功能实施清单

## 1. 依赖安装与配置

- [x] 1.1 安装 `sqlite-vec` 依赖
- [x] 1.2 安装 Embedding 相关依赖（`@xenova/transformers`）
- [x] 1.3 初始化 sqlite-vec 扩展（在数据库初始化时加载）

## 2. 数据库设计

- [x] 2.1 设计 SQLite 表结构（rag_library, rag_document, rag_chunk）
- [x] 2.2 实现独立 SQLite 数据库初始化
- [x] 2.3 创建基础表（知识库、文档、切片）
- [x] 2.4 实现 sqlite-vec 虚拟表创建（在初始化脚本中）
- [x] 2.5 实现 FTS5 全文搜索表创建
- [x] 2.6 验证表结构

## 3. Worker Thread 基础设施

- [x] 3.1 创建 Worker Thread 管理器（`src/main/utils/worker-manager.ts`）
- [x] 3.2 实现 Worker 消息传递协议
- [x] 3.3 实现 Worker 生命周期管理（创建、销毁、错误处理）

## 4. 文档解析模块

- [x] 4.1 实现 Markdown 解析器（`src/main/utils/document-parser/markdown.ts`）
- [x] 4.2 实现 TXT 解析器（`src/main/utils/document-parser/txt.ts`）
- [x] 4.3 实现统一解析接口（`src/main/utils/document-parser/index.ts`）
- [x] 4.4 添加错误处理和日志记录

## 5. 文本切片模块

- [x] 5.1 实现文本切片工具（`src/main/utils/text-chunker.ts`）
- [x] 5.2 支持固定大小切片（~500 字符）
- [x] 5.3 支持重叠切片（10% 重叠）
- [x] 5.4 保留元数据（页码、行号等）

## 6. Embedding 服务

- [x] 6.1 实现本地 Embedding Provider（`src/main/providers/embedding/local.ts`）
  - [x] 6.1.1 集成 `@xenova/transformers`
  - [x] 6.1.2 实现模型下载和缓存
  - [x] 6.1.3 实现批量向量化
  - [x] 6.1.4 添加错误处理和日志记录

## 7. Repository 层

- [x] 7.1 实现 `RagLibraryRepository`（`src/main/repository/rag-library.ts`，基于 SQLite 原生 SQL）
  - [x] 7.1.1 创建知识库
  - [x] 7.1.2 查询知识库列表
  - [x] 7.1.3 更新知识库名称
  - [x] 7.1.4 删除知识库（级联删除文档和向量）
- [x] 7.2 实现 `RagDocumentRepository`（`src/main/repository/rag-document.ts`，基于 SQLite 原生 SQL）
  - [x] 7.2.1 创建文档记录
  - [x] 7.2.2 更新文档状态
  - [x] 7.2.3 查询文档列表
  - [x] 7.2.4 删除文档
- [x] 7.3 实现 `RagChunkRepository`（`src/main/repository/rag-chunk.ts`，基于 SQLite 原生 SQL）
  - [x] 7.3.1 批量插入文档片段
  - [x] 7.3.2 查询片段（按文档 ID）
  - [x] 7.3.3 删除片段（级联删除向量）

## 8. 向量存储与检索

- [x] 8.1 实现向量存储工具（`src/main/utils/vector-store.ts`）
  - [x] 8.1.1 批量插入向量到 sqlite-vec
  - [x] 8.1.2 实现向量搜索（相似度搜索）
- [x] 8.2 实现全文搜索工具（`src/main/utils/fulltext-search.ts`）
  - [x] 8.2.1 使用 FTS5 执行全文搜索
  - [x] 8.2.2 结果排序和评分
- [x] 8.3 实现混合搜索工具（`src/main/utils/hybrid-search.ts`）
  - [x] 8.3.1 合并向量搜索和全文搜索结果
  - [x] 8.3.2 去重和排序
  - [x] 8.3.3 返回 Top-K 结果

## 9. RAG Handler

- [x] 9.1 创建 `RagHandler`（`src/main/handlers/rag-handler.ts`）
  - [x] 9.1.1 实现知识库管理 IPC（创建、列表、更新、删除）
  - [x] 9.1.2 实现文档上传 IPC（接收文件路径，启动索引流程）
  - [x] 9.1.3 实现文档状态查询 IPC
  - [x] 9.1.4 实现文档删除 IPC
- [x] 9.2 实现文档索引流程（在 Worker Thread 中执行）
  - [x] 9.2.1 文件解析
  - [x] 9.2.2 文本切片
  - [x] 9.2.3 向量化
  - [x] 9.2.4 批量存储
- [x] 9.3 实现检索 IPC（供 AI Handler 调用）

## 10. AI Handler 集成

- [x] 10.1 在 `AIHandler` 中添加 RAG 检索逻辑
  - [x] 10.1.1 检查是否启用 RAG
  - [x] 10.1.2 调用 RAG 检索获取上下文
  - [x] 10.1.3 组装上下文 Prompt
  - [x] 10.1.4 注入到系统消息或上下文消息
- [ ] 10.2 实现引用标记解析
  - [ ] 10.2.1 解析 LLM 回答中的引用标记（如 `[1]`, `[2]`）
  - [ ] 10.2.2 提取引用 ID 和对应 chunk 信息
- [ ] 10.3 在流式响应中支持引用标记（实时解析）

## 11. IPC 通道定义

- [x] 11.1 在 `src/common/constants/ipc.ts` 中添加 RAG 相关 IPC 通道
  - [x] 11.1.1 `rag:createLibrary`
  - [x] 11.1.2 `rag:listLibraries`
  - [x] 11.1.3 `rag:updateLibrary`
  - [x] 11.1.4 `rag:deleteLibrary`
  - [x] 11.1.5 `rag:uploadDocument`
  - [x] 11.1.6 `rag:listDocuments`
  - [x] 11.1.7 `rag:deleteDocument`
  - [x] 11.1.8 `rag:getDocumentStatus`
  - [x] 11.1.9 `rag:search`（内部使用）
- [x] 11.2 更新 IPC 类型定义（`src/types/ipc-type.ts`）

## 12. 前端：知识库管理 UI（设置界面）

- [x] 12.1 在设置页面添加知识库管理模块（`src/renderer/src/components/RagLibrarySettings.tsx`）
  - [x] 12.1.1 知识库列表展示
  - [x] 12.1.2 创建知识库对话框
  - [x] 12.1.3 重命名知识库
  - [x] 12.1.4 删除知识库确认
- [x] 12.2 创建文档管理组件（`src/renderer/src/components/rag/document-list.tsx`）
  - [x] 12.2.1 文档列表展示（带状态）
  - [x] 12.2.2 文档上传（拖拽或选择文件）
  - [x] 12.2.3 文档删除
  - [x] 12.2.4 索引进度显示
- [x] 12.3 将知识库管理模块集成到设置页面（`src/renderer/src/page/settings.tsx`）

## 13. 前端：聊天界面知识库选择

- [x] 13.1 在聊天界面添加知识库选择功能（`src/renderer/src/page/chat.tsx`）
  - [x] 13.1.1 添加知识库选择下拉框（显示所有可用知识库）
  - [x] 13.1.2 支持选择"无"（不使用知识库）
  - [x] 13.1.3 显示当前选中的知识库名称
  - [ ] 13.1.4 保存选择的知识库到会话状态
- [ ] 13.2 创建 RAG 配置组件（`src/renderer/src/components/rag/rag-config.tsx`，可选，用于高级配置）
  - [ ] 13.2.1 Top-K 数量配置（滑块）
  - [ ] 13.2.2 相关性阈值配置（滑块）
- [x] 13.3 在聊天界面集成知识库选择（可放在聊天输入区域上方或侧边栏）

## 14. 前端：引用溯源 UI

- [ ] 14.1 在消息组件中解析引用标记（`src/renderer/src/chat/message-item.tsx`）
  - [ ] 14.1.1 识别引用标记（如 `[1]`, `[2]`）
  - [ ] 14.1.2 渲染为可点击链接
- [ ] 14.2 创建引用侧边栏组件（`src/renderer/src/components/rag/citation-sidebar.tsx`）
  - [ ] 14.2.1 显示引用列表
  - [ ] 14.2.2 点击引用显示原始文本片段
  - [ ] 14.2.3 高亮显示匹配内容
  - [ ] 14.2.4 显示文档来源信息
- [ ] 14.3 实现引用查询 IPC 调用

## 15. 状态管理

- [x] 15.1 创建 RAG Store（`src/renderer/src/stores/ragStore.ts`）
  - [x] 15.1.1 知识库列表状态
  - [x] 15.1.2 当前选中的知识库
  - [x] 15.1.3 RAG 配置（启用状态、Top-K、阈值等）
  - [x] 15.1.4 文档状态映射
- [ ] 15.2 集成到 Chat Store（可选，或保持独立）

## 16. 测试与优化

- [ ] 16.1 单元测试：文档解析器
- [ ] 16.2 单元测试：文本切片工具
- [ ] 16.3 单元测试：向量搜索
- [ ] 16.4 集成测试：完整索引流程
- [ ] 16.5 集成测试：RAG 检索流程
- [ ] 16.6 性能测试：大量文档索引性能
- [ ] 16.7 性能测试：检索响应时间
- [ ] 16.8 错误处理测试：文件解析失败、向量化失败等

## 17. 文档与配置

- [ ] 17.1 更新 README，添加 RAG 功能说明
- [ ] 17.2 添加 RAG 使用文档
- [ ] 17.3 添加 sqlite-vec 安装说明（针对不同平台）
- [ ] 17.4 添加 Embedding 模型下载说明（本地模式）
- [ ] 17.5 更新技术设计文档
