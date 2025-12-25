# TODO

## 已完成

- [x] chat 支持上传文件 (设计文档 → [04.FILE_UPLOAD_DESIGN.md](./04.FILE_UPLOAD_DESIGN.md))
- [x] 数据库初始化流程优化 - 解决 SQLite 锁定问题 (设计文档 → [05.DATABASE_INITIALIZATION_DESIGN.md](./05.DATABASE_INITIALIZATION_DESIGN.md))

## 小问题

- [x] Error: OpenAI API error: 400 Unsupported parameter: 'temperature' is not supported with this model. gpt-5.1-codex
- [x] SQLite database is locked - 数据库初始化时锁定问题
- [ ] 聊天界面滚动到底部功能不稳定

## 待开发

- [ ] tools support openai 内置 tools
- [ ] tools support 客户端 自定义 tools
- [ ] 增加 project 概念
- [ ] memory
- [ ] 支持 claude 模型
- [ ] 支持 gemini 模型
- [ ] chat-input 输入框自定义 cursor，优化UI
