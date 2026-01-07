## 1. 数据库和类型定义
- [x] 1.1 在 `src/types/config-frontend-type.ts` 中新增 MCP 配置相关的类型定义
- [x] 1.2 定义 MCP 配置的数据结构（server_label, server_description, server_url, require_approval, enabled）

## 2. IPC 接口
- [x] 2.1 在 `src/common/constants/ipc.ts` 中新增 MCP 配置相关的 IPC 通道（list, create, update, delete）
- [x] 2.2 在 `src/types/config-db-type.ts` 中新增 MCP 配置相关的 IPC 类型定义

## 3. 后端实现
- [x] 3.1 修改 `src/main/providers/tools/mcp-config.ts`，从数据库读取配置而非硬编码
- [x] 3.2 新增 `src/main/handlers/mcp-config-handler.ts`，处理 MCP 配置的 CRUD 操作
- [x] 3.3 在 `src/main/handlers/index.ts` 中注册新的 MCP 配置 handler
- [x] 3.4 修改 `src/main/providers/mcp/client.ts` 和 `src/main/providers/openai-provider.ts`，支持配置热更新（当配置变更时重新初始化连接）

## 4. 前端实现
- [x] 4.1 在 `src/renderer/src/stores/mcp-config-store.ts` 中新增 store 用于管理 MCP 配置状态
- [x] 4.2 在 `src/renderer/src/page/settings.tsx` 中新增 MCP 配置管理 UI 组件
- [x] 4.3 实现 MCP 配置的列表展示、添加、编辑、删除功能（`McpConfigList.tsx` 和 `McpConfigDialog.tsx`）
- [x] 4.4 实现配置验证（URL 格式、必填字段等）

## 5. 测试和验证
- [x] 5.1 验证添加 MCP 配置后能正常连接
- [x] 5.2 验证修改配置后能热更新连接
- [x] 5.3 验证删除配置后能断开连接
- [x] 5.4 验证配置持久化存储

