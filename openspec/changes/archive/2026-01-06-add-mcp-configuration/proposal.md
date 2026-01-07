# 变更：增加 MCP 可配置功能

## 为什么

当前 MCP 服务器配置是写死在代码中的（`src/main/providers/tools/mcp-config.ts`），用户无法通过界面添加、修改或删除 MCP 服务器配置。这限制了用户使用自定义 MCP 服务器的能力，每次添加新的 MCP 服务器都需要修改代码并重新编译。

## 改什么

- **新增 MCP 配置管理功能**：允许用户通过设置界面添加、编辑、删除 MCP 服务器配置
- **将配置存储到数据库**：使用现有的 Config 表存储 MCP 配置（JSON 格式）
- **修改 MCP 客户端初始化逻辑**：从数据库读取配置而非硬编码
- **新增设置界面**：在设置页面添加 MCP 配置管理 UI
- **新增 IPC 接口**：为 MCP 配置管理提供专门的 IPC 通道

## 影响

- **受影响的规范**：MCP 集成规范（新增）
- **受影响的代码**：
  - `src/main/providers/tools/mcp-config.ts` - 修改为从数据库读取配置
  - `src/main/providers/mcp/client.ts` - 可能需要支持配置热更新
  - `src/main/handlers/config-handler.ts` - 可能需要扩展或新增 MCP 专用 handler
  - `src/renderer/src/page/settings.tsx` - 新增 MCP 配置管理 UI
  - `src/common/constants/ipc.ts` - 新增 MCP 配置相关的 IPC 通道
  - `src/types/config-frontend-type.ts` - 新增 MCP 配置类型定义

