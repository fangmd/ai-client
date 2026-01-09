## 1. 技能文件格式和目录结构
- [x] 1.1 定义 SKILL.md 文件格式（纯 Markdown 内容）
- [x] 1.2 创建 `resources/skills/` 目录用于存储内置技能
- [x] 1.3 定义技能元数据结构（name 从目录名获取，location 为文件路径）

## 2. 技能发现和加载模块
- [x] 2.1 创建 `src/main/utils/skill-loader.ts`，实现技能发现和加载逻辑
- [x] 2.2 实现扫描 `resources/skills/` 目录的功能
- [x] 2.3 实现读取 SKILL.md 文件的 Markdown 内容
- [x] 2.4 实现从目录名获取技能名称的逻辑

## 3. Skill 工具定义
- [x] 3.1 创建 `src/main/providers/tools/skill-tool.ts`，定义 skill 工具
- [x] 3.2 实现工具描述生成（包含可用技能列表）
- [x] 3.3 实现工具执行逻辑（根据名称加载技能内容）
- [x] 3.4 实现错误处理（技能不存在、解析失败等）

## 4. 工具集成
- [x] 4.1 修改 `src/main/providers/openai-provider.ts`，将 skill 工具添加到工具列表
- [x] 4.2 确保 skill 工具在 AI 对话中可用
- [x] 4.3 实现工具调用处理逻辑

## 5. 类型定义
- [x] 5.1 在 `src/types/` 中新增技能相关的类型定义
- [x] 5.2 定义技能元数据接口
- [x] 5.3 定义技能工具参数类型

## 6. 测试技能创建
- [x] 6.1 创建测试技能目录 `resources/skills/test-skill/`
- [x] 6.2 创建 `resources/skills/test-skill/SKILL.md` 文件
- [x] 6.3 编写测试技能内容（纯 Markdown 内容）

## 7. 测试和验证
- [ ] 7.1 验证技能发现功能正常工作
- [ ] 7.2 验证技能工具在 AI 对话中可用
- [ ] 7.3 验证 AI 可以成功调用 skill 工具加载技能内容
- [ ] 7.4 验证错误处理（技能不存在、格式错误等）
