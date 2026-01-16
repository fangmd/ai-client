# 变更：适配 A2UI JSONL 格式支持

## 为什么

根据 A2UI Skill 的最新规范，A2UI 消息现在使用 JSONL（JSON Lines）格式输出，即每行一个独立的 JSON 对象，而不是之前的 JSON 数组格式。当前系统的 A2UI 消息检测和解析逻辑仍然期望 JSON 数组格式，需要更新以支持新的 JSONL 格式。

## 改什么

- **修改 A2UI 消息检测逻辑**：更新 `isA2UIMessage` 函数，支持检测 JSONL 格式（每行一个 JSON 对象）
- **修改 A2UI 消息提取逻辑**：更新 `extractA2UIJSON` 函数，将 JSONL 格式转换为 JSON 数组格式（因为渲染器期望数组格式）
- **提前检测消息类型**：在流式输出过程中检测 `---BEGIN A2UI---` 标记，立即设置 `contentType = 'a2ui'`，而不是等到消息完成（`onDone`）才设置。这样前端可以更早知道消息类型，提前准备 A2UI 渲染器，支持流式渲染。
- **更新规范**：更新 SKILLS 规范中的 A2UI 消息格式描述，仅支持 JSONL 格式，并明确提前检测消息类型的要求

## 影响

- **受影响的规范**：SKILLS 规范（修改，更新 A2UI 消息格式要求）
- **受影响的代码**：
  - `src/main/utils/a2ui-detector.ts` - 修改检测和提取逻辑以支持 JSONL 格式
  - `src/main/handlers/ai-handler.ts` - 在流式输出过程中提前检测 `---BEGIN A2UI---` 标记并设置 `contentType`
  - `openspec/specs/skills/spec.md` - 更新 A2UI 消息格式规范，明确提前检测消息类型的要求
