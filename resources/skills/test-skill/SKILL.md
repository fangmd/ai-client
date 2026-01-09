# Git 提交信息规范

帮助生成符合规范的 Git 提交信息，确保提交历史清晰、可读。

## 提交信息格式

Git 提交信息应该遵循以下格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（必需）

提交类型，必须是以下之一：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档变更
- `style`: 代码格式变更（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是 bug 修复）
- `perf`: 性能优化
- `test`: 测试相关变更
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI 配置文件和脚本的变更

### Scope（可选）

影响范围，例如：
- `ui`: 用户界面
- `api`: API 相关
- `db`: 数据库
- `auth`: 认证相关
- `config`: 配置相关

### Subject（必需）

简短描述，不超过 50 个字符：
- 使用祈使句，现在时态（如 "change" 而不是 "changed" 或 "changes"）
- 首字母小写
- 结尾不加句号

### Body（可选）

详细描述：
- 说明代码变更的动机
- 与之前行为的对比
- 每行不超过 72 个字符

### Footer（可选）

- 关闭的 Issue：`Closes #123`
- 破坏性变更：`BREAKING CHANGE: <description>`

## 示例

### 示例 1：新功能

```
feat(auth): add OAuth2 login support

Implement OAuth2 authentication flow for Google and GitHub.
Users can now log in using their social media accounts.

Closes #42
```

### 示例 2：Bug 修复

```
fix(api): resolve null pointer exception in user endpoint

When user ID is invalid, the API was throwing a null pointer
exception. Now it returns a proper 404 error with error message.

Fixes #123
```

### 示例 3：文档更新

```
docs(readme): update installation instructions

Add Node.js version requirement and fix broken links.
```

### 示例 4：重构

```
refactor(db): extract database connection logic

Move database connection initialization to a separate module
to improve code organization and testability.
```

## 最佳实践

1. **保持简洁**：Subject 应该简洁明了，一眼就能看出做了什么
2. **使用祈使句**：使用 "add" 而不是 "added" 或 "adds"
3. **说明原因**：在 Body 中解释"为什么"而不仅仅是"做了什么"
4. **关联 Issue**：如果修复了 Issue，在 Footer 中引用
5. **一行一个想法**：Body 中每行表达一个想法，便于阅读

## 常见错误

❌ **错误示例**：
```
fix bug
update code
changed something
```

✅ **正确示例**：
```
fix(api): handle null user gracefully
refactor(utils): extract common validation logic
feat(ui): add dark mode toggle
```

## 使用场景

当你需要提交代码时，可以：

1. 描述你的变更内容
2. 我会根据你的描述生成符合规范的提交信息
3. 你可以直接使用生成的提交信息进行提交

## 注意事项

- 提交信息是项目历史的一部分，应该认真对待
- 好的提交信息可以帮助团队理解代码变更的原因
- 遵循规范可以让提交历史更加清晰和可维护
