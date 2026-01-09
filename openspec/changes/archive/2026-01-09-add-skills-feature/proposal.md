# 变更：添加 SKILLS 功能

## 为什么

当前 ai-client 的工具系统只支持固定的工具（terminal、read、MCP），用户无法定义和加载自定义的技能（SKILLS）。SKILLS 功能允许用户通过定义 SKILL.md 文件来创建可重用的指令和知识库，AI 可以通过 `skill` 工具按需加载这些技能内容，从而扩展 AI 的能力范围。

参考第三方实现（OpenCode），SKILLS 功能可以：
- 提供简单的技能定义格式（纯 Markdown 内容）
- 支持技能发现和自动加载
- 通过工具调用机制暴露给 AI
- 支持从应用内置目录加载技能

## 改什么

- **新增 SKILLS 发现和加载机制**：扫描指定目录下的 SKILL.md 文件，从目录名获取技能名称
- **新增 skill 工具**：将技能功能暴露为 AI 可调用的工具，支持按名称加载技能内容
- **新增技能目录结构**：支持从应用内置目录加载技能（暂不考虑项目级和全局目录）
- **新增技能文件格式**：定义 SKILL.md 文件的格式（纯 Markdown 内容，技能名称从目录名获取）
- **创建测试技能**：创建一个示例技能用于验证功能

## 影响

- **受影响的规范**：SKILLS 规范（新增）
- **受影响的代码**：
  - `src/main/providers/tools/` - 新增 skill-tool.ts
  - `src/main/providers/openai-provider.ts` - 集成 skill 工具到工具列表
  - `src/main/handlers/ai-handler.ts` - 可能需要处理技能相关的工具调用
  - `src/main/utils/` - 可能需要新增技能发现和解析的工具函数
  - `resources/skills/` - 新增内置技能目录（新建）
  - `src/types/` - 可能需要新增技能相关的类型定义
