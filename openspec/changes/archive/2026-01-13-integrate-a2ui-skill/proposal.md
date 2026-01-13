# 变更：集成 A2UI Skill

## 为什么

A2UI (Agent to UI) Skill 已经存在于 `resources/skills/a2ui/SKILL.md`，但系统缺少自动识别和渲染 A2UI 消息的能力。根据 A2UI Skill 的规范，AI 会返回符合 A2UI 规范的 JSON 数组消息，系统需要：

1. 自动检测 AI 返回的消息是否符合 A2UI 消息格式
2. 如果符合，自动将消息的 `contentType` 设置为 `'a2ui'`
3. 确保 A2UI 消息能够被正确渲染为动态 UI 界面

当前系统虽然已经支持渲染 `contentType === 'a2ui'` 的消息，但缺少自动检测机制，需要手动设置 `contentType`，这不符合 A2UI Skill 的使用场景。

## 改什么

- **新增 A2UI 消息自动检测机制**：在 AI 消息完成时，检测消息内容是否为有效的 A2UI JSON 数组格式
- **自动设置消息类型**：如果检测到 A2UI 格式，自动将消息的 `contentType` 设置为 `'a2ui'`
- **验证 A2UI 消息格式**：确保消息符合 `server_to_client.json` 规范（包含 `beginRendering`、`surfaceUpdate`、`dataModelUpdate` 或 `deleteSurface` 之一）
- **确保 A2UI Skill 可用**：验证 a2ui skill 可以被正确发现和加载（技能系统已实现，只需验证）

## 影响

- **受影响的规范**：SKILLS 规范（修改，添加 A2UI 消息自动检测需求）
- **受影响的代码**：
  - `src/main/handlers/ai-handler.ts` - 在 `onDone` 回调中添加 A2UI 消息检测逻辑
  - `src/main/utils/` - 可能需要新增 A2UI 消息验证工具函数
  - `src/types/` - 可能需要新增 A2UI 消息类型定义（如果尚未存在）
