# AI 聊天客户端 - 技术方案

## 技术栈

### 核心框架
- **Electron**: 跨平台桌面应用框架
- **React 19**: UI 框架
- **TypeScript**: 类型安全

### 状态管理
- **Zustand**: 轻量级状态管理库，适合聊天场景

### UI 组件库
- **shadcn/ui**: 基于 Radix UI 的组件库
- **Tailwind CSS v4**: 原子化 CSS 框架

### 功能库
- **react-markdown**: Markdown 渲染
- **remark-gfm**: GitHub Flavored Markdown 支持
- **dayjs**: 日期格式化
- **electron-store**: 本地配置存储

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   └── index.ts            # 窗口管理
├── preload/                 # 预加载脚本
│   └── index.ts            # IPC 桥接
└── renderer/                # 渲染进程（React）
    └── src/
        ├── App.tsx         # 根组件
        ├── components/     # React 组件
        │   ├── ui/         # shadcn/ui 基础组件
        │   ├── ChatWindow.tsx
        │   ├── MessageList.tsx
        │   ├── MessageItem.tsx
        │   ├── InputArea.tsx
        │   └── Settings.tsx
        ├── stores/         # Zustand 状态管理
        │   └── chatStore.ts
        ├── services/        # 业务服务
        │   └── aiService.ts
        ├── types/          # TypeScript 类型定义
        │   └── chat.ts
        └── lib/            # 工具函数
            └── utils.ts
```

## 核心功能模块

### 1. 状态管理 (chatStore)
- 会话管理：创建、切换、删除会话
- 消息管理：添加、更新、流式追加消息
- AI 配置：API Key、模型选择等
- 发送状态：管理请求状态

### 2. AI 服务 (aiService)
- 支持多 AI 提供商：
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Custom (自定义 API)
- 流式响应处理
- 错误处理和重试
- 请求取消支持

### 3. UI 组件

#### ChatWindow
- 主聊天窗口容器
- 顶部工具栏（新建会话、设置）

#### MessageList
- 消息列表展示
- 自动滚动到底部
- 空状态提示

#### MessageItem
- 单条消息渲染
- 用户/助手消息区分
- Markdown 渲染
- 时间显示

#### InputArea
- 多行文本输入
- 发送/停止按钮
- 快捷键支持（Enter 发送，Shift+Enter 换行）

#### Settings
- AI 配置对话框
- 提供商选择
- API Key 配置
- 模型参数调整

## 数据流

```
用户输入
  ↓
InputArea 组件
  ↓
chatStore.addMessage() (用户消息)
  ↓
aiService.streamChat()
  ↓
SSE/Stream 响应
  ↓
chatStore.appendToMessage() (流式更新)
  ↓
MessageList 组件渲染
```

## 设计模式

1. **策略模式**: AI 服务支持多提供商，通过策略模式切换
2. **观察者模式**: 流式响应通过回调函数处理
3. **单例模式**: AI 服务实例管理

## 安全考虑

- API Key 存储在内存中（未来可加密存储到 electron-store）
- 输入验证和 XSS 防护（通过 React 自动转义）
- 不在 renderer 直接暴露敏感信息

## 使用说明

1. **配置 AI 设置**
   - 点击右上角 "Settings" 按钮
   - 选择 AI 提供商（OpenAI/Anthropic/Custom）
   - 输入 API Key
   - 配置模型和其他参数
   - 点击 "Save" 保存

2. **开始聊天**
   - 配置完成后，在输入框输入消息
   - 按 Enter 发送，Shift+Enter 换行
   - AI 回复会以流式方式显示

3. **管理会话**
   - 点击 "New Chat" 创建新会话
   - 会话历史保存在内存中（未来可持久化）

## 开发命令

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm typecheck
```

## 未来扩展

- [ ] 会话持久化（electron-store）
- [ ] 消息搜索功能
- [ ] 导出聊天记录
- [ ] 多窗口支持
- [ ] 主题切换（深色/浅色）
- [ ] 代码高亮支持
- [ ] 图片上传和显示
- [ ] 本地模型支持（Ollama 等）
