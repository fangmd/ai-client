## 1. A2UI 消息检测工具函数
- [x] 1.1 创建 `src/main/utils/a2ui-detector.ts`，实现 A2UI 消息格式检测函数
- [x] 1.2 实现 JSON 解析和验证逻辑
- [x] 1.3 验证消息数组中的每个对象是否符合 A2UI 消息格式（包含且仅包含 `beginRendering`、`surfaceUpdate`、`dataModelUpdate` 或 `deleteSurface` 之一）
- [x] 1.4 处理解析错误和格式错误的情况

## 2. AI Handler 集成
- [x] 2.1 修改 `src/main/handlers/ai-handler.ts`，在 `onDone` 回调中调用 A2UI 检测函数
- [x] 2.2 如果检测到 A2UI 格式，更新消息的 `contentType` 为 `'a2ui'`
- [x] 2.3 确保在消息状态更新为 `'sent'` 之前完成检测和类型设置
- [x] 2.4 添加日志记录，便于调试和追踪

## 3. 类型定义（如需要）
- [x] 3.1 检查是否已有 A2UI 消息类型定义
- [x] 3.2 如需要，在 `src/types/` 中添加 A2UI 消息相关的类型定义

## 4. 验证和测试
- [ ] 4.1 验证 a2ui skill 可以被正确发现（通过 skill 工具）
- [ ] 4.2 测试 AI 返回 A2UI JSON 消息时，系统能自动检测并设置 contentType
- [ ] 4.3 测试 A2UI 消息能够正确渲染为 UI 界面
- [ ] 4.4 测试非 A2UI 格式的消息不会被误判
- [ ] 4.5 测试格式错误的 JSON 消息不会导致系统崩溃
