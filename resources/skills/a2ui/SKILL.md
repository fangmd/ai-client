# A2UI Skill

## 概述

A2UI (Agent to UI) Skill 用于根据用户需求生成符合 A2UI 规范的动态 UI 界面。该技能会先通过其他工具或技能获取所需数据，然后根据数据和 A2UI 规范生成消息发送给用户。

## 工作流程

1. **获取数据**：根据用户需求，使用 web_search tools 获取所需数据
2. **数据处理**：将 web_search 返回的数据处理成结构化的 JSON 格式，提取关键信息并组织成便于后续使用的数据结构
3. **生成 A2UI 消息**：根据处理后的 JSON 数据和 A2UI 规范，生成符合 `server_to_client.json` 格式的消息数组
4. **发送消息**：将消息数组作为纯 JSON 字符串，使用 `---BEGIN A2UI---` 和 `---END A2UI---` 分隔符包裹后发送给用户，系统会自动识别并渲染为 A2UI 界面

## A2UI 消息规范

A2UI 消息必须符合 `server_to_client.json` 规范。每个消息对象必须包含且仅包含以下四种操作之一：

### server_to_client.json

```json
{"title":"A2UI Message Schema","description":"Describes a JSON payload for an A2UI (Agent to UI) message, which is used to dynamically construct and update user interfaces. A message MUST contain exactly ONE of the action properties: 'beginRendering', 'surfaceUpdate', 'dataModelUpdate', or 'deleteSurface'.","type":"object","additionalProperties":false,"properties":{"beginRendering":{"type":"object","description":"Signals the client to begin rendering a surface with a root component and specific styles.","additionalProperties":false,"properties":{"surfaceId":{"type":"string","description":"The unique identifier for the UI surface to be rendered."},"catalogId":{"type":"string","description":"The identifier of the component catalog to use for this surface. If omitted, the client MUST default to the standard catalog for this A2UI version (a2ui.org:standard_catalog_0_8_0)."},"root":{"type":"string","description":"The ID of the root component to render."},"styles":{"type":"object","description":"Styling information for the UI.","additionalProperties":true}},"required":["root","surfaceId"]},"surfaceUpdate":{"type":"object","description":"Updates a surface with a new set of components.","additionalProperties":false,"properties":{"surfaceId":{"type":"string","description":"The unique identifier for the UI surface to be updated. If you are adding a new surface this *must* be a new, unique identified that has never been used for any existing surfaces shown."},"components":{"type":"array","description":"A list containing all UI components for the surface.","minItems":1,"items":{"type":"object","description":"Represents a *single* component in a UI widget tree. This component could be one of many supported types.","additionalProperties":false,"properties":{"id":{"type":"string","description":"The unique identifier for this component."},"weight":{"type":"number","description":"The relative weight of this component within a Row or Column. This corresponds to the CSS 'flex-grow' property. Note: this may ONLY be set when the component is a direct descendant of a Row or Column."},"component":{"type":"object","description":"A wrapper object that MUST contain exactly one key, which is the name of the component type. The value is an object containing the properties for that specific component.","additionalProperties":true}},"required":["id","component"]}}},"required":["surfaceId","components"]},"dataModelUpdate":{"type":"object","description":"Updates the data model for a surface.","additionalProperties":false,"properties":{"surfaceId":{"type":"string","description":"The unique identifier for the UI surface this data model update applies to."},"path":{"type":"string","description":"An optional path to a location within the data model (e.g., '/user/name'). If omitted, or set to '/', the entire data model will be replaced."},"contents":{"type":"array","description":"An array of data entries. Each entry must contain a 'key' and exactly one corresponding typed 'value*' property.","items":{"type":"object","description":"A single data entry. Exactly one 'value*' property should be provided alongside the key.","additionalProperties":false,"properties":{"key":{"type":"string","description":"The key for this data entry."},"valueString":{"type":"string"},"valueNumber":{"type":"number"},"valueBoolean":{"type":"boolean"},"valueMap":{"description":"Represents a map as an adjacency list.","type":"array","items":{"type":"object","description":"One entry in the map. Exactly one 'value*' property should be provided alongside the key.","additionalProperties":false,"properties":{"key":{"type":"string"},"valueString":{"type":"string"},"valueNumber":{"type":"number"},"valueBoolean":{"type":"boolean"}},"required":["key"]}}},"required":["key"]}}},"required":["contents","surfaceId"]},"deleteSurface":{"type":"object","description":"Signals the client to delete the surface identified by 'surfaceId'.","additionalProperties":false,"properties":{"surfaceId":{"type":"string","description":"The unique identifier for the UI surface to be deleted."}},"required":["surfaceId"]}}}
```

### 1. beginRendering

开始渲染一个 surface，指定根组件和样式。

```json
{
  "beginRendering": {
    "surfaceId": "string",  // surface 的唯一标识符
    "root": "string",        // 根组件的 ID（必需）
    "catalogId": "string",   // 组件目录 ID（可选，默认使用标准目录）
    "styles": {              // 样式信息（可选）
      "primaryColor": "#FF0000",
      "font": "Roboto"
    }
  }
}
```

### 2. surfaceUpdate

更新 surface 的组件列表。组件使用扁平列表（adjacency list）结构，通过 ID 引用建立树形关系。

```json
{
  "surfaceUpdate": {
    "surfaceId": "string",
    "components": [
      {
        "id": "string",      // 组件的唯一 ID
        "weight": 1,          // 可选，仅在 Row/Column 的直接子组件中使用
        "component": {
          "ComponentType": {   // 组件类型，如 Text, Image, Row, Column, Card 等
            // 组件特定的属性
          }
        }
      }
    ]
  }
}
```

### 3. dataModelUpdate

更新 surface 的数据模型。数据模型用于存储动态值，组件通过 `path` 引用数据。

```json
{
  "dataModelUpdate": {
    "surfaceId": "string",
    "path": "/",              // 数据路径，"/" 表示根路径
    "contents": [
      {
        "key": "string",
        "valueString": "string",    // 字符串值
        "valueNumber": 123,          // 数字值
        "valueBoolean": true,        // 布尔值
        "valueMap": [                // 映射值（数组形式）
          {
            "key": "string",
            "valueString": "string"
          }
        ]
      }
    ]
  }
}
```

### 4. deleteSurface

删除指定的 surface。

```json
{
  "deleteSurface": {
    "surfaceId": "string"
  }
}
```

## 标准组件类型

A2UI 支持以下标准组件类型（参考 `standard_catalog_definition.json`）：

- **Text**: 文本组件，支持 `text`（literalString 或 path）和 `usageHint`（h1-h5, caption, body）
- **Image**: 图片组件，支持 `url`（literalString 或 path）和 `usageHint`（icon, avatar, smallFeature 等）
- **Icon**: 图标组件，支持标准图标名称
- **Row**: 水平布局容器
- **Column**: 垂直布局容器
- **Card**: 卡片容器
- **Button**: 按钮组件，支持 `action` 定义用户交互
- **List**: 列表组件，支持 `template` 和数据绑定
- **TextField**: 文本输入框
- **Checkbox**: 复选框
- **RadioButton**: 单选按钮
- **Slider**: 滑块
- **Spacer**: 空白间距
- **Divider**: 分隔线

## 数据绑定

组件可以通过 `path` 引用数据模型中的值：

```json
{
  "Text": {
    "text": {
      "path": "title"  // 引用数据模型中 key 为 "title" 的值
    }
  }
}
```

也可以使用字面量：

```json
{
  "Text": {
    "text": {
      "literalString": "Hello World"
    }
  }
}
```

## 消息生成步骤

1. **确定 surfaceId**：为每个 UI 区域分配唯一的 surfaceId（通常使用 "default" 或基于上下文的唯一标识）

2. **设计组件树**：
   - 使用扁平列表结构定义所有组件
   - 每个组件必须有唯一的 `id`
   - 通过 `children.explicitList` 或 `children.template` 建立父子关系
   - 使用 `weight` 控制 Row/Column 中的布局比例

3. **准备数据模型**：
   - 根据组件中使用的 `path` 引用，准备对应的数据
   - 使用 `valueMap` 表示对象/映射结构
   - 使用 `valueString`、`valueNumber`、`valueBoolean` 表示基本类型

4. **生成消息数组**：
   - 通常先发送 `surfaceUpdate` 定义组件结构
   - 然后发送 `dataModelUpdate` 填充数据
   - 最后发送 `beginRendering` 触发渲染
   - 或者先发送 `beginRendering`，然后发送更新消息

## 示例

### 简单示例：显示标题和列表

```json
[{"beginRendering":{"surfaceId":"default","root":"root-column"}},{"surfaceUpdate":{"surfaceId":"default","components":[{"id":"root-column","component":{"Column":{"children":{"explicitList":["title","item-list"]}}}},{"id":"title","component":{"Text":{"usageHint":"h1","text":{"path":"title"}}}},{"id":"item-list","component":{"List":{"direction":"vertical","children":{"template":{"componentId":"item-template","dataBinding":"/items"}}}}},{"id":"item-template","component":{"Card":{"child":"item-text"}}},{"id":"item-text","component":{"Text":{"text":{"path":"name"}}}}]}},{"dataModelUpdate":{"surfaceId":"default","path":"/","contents":[{"key":"title","valueString":"My List"},{"key":"items","valueMap":[{"key":"item1","valueMap":[{"key":"name","valueString":"Item 1"}]},{"key":"item2","valueMap":[{"key":"name","valueString":"Item 2"}]}]}]}}]
```

### 示例：用户信息卡片

```json
[{"id":"root","component":{"Card":{"child":"main-column"}}},{"id":"main-column","component":{"Column":{"children":{"explicitList":["avatar-image","name","title","divider","contact-info","actions"]},"gap":"medium","alignment":"center"}}},{"id":"avatar-image","component":{"Image":{"url":{"path":"/avatar"},"altText":{"path":"/name"},"fit":"cover","usageHint":"avatar"}}},{"id":"name","component":{"Text":{"text":{"path":"/name"},"usageHint":"h2"}}},{"id":"title","component":{"Text":{"text":{"path":"/title"},"usageHint":"body"}}},{"id":"divider","component":{"Divider":{}}},{"id":"contact-info","component":{"Column":{"children":{"explicitList":["phone-row","email-row","location-row"]},"gap":"small"}}},{"id":"phone-row","component":{"Row":{"children":{"explicitList":["phone-icon","phone-text"]},"gap":"small","alignment":"center"}}},{"id":"phone-icon","component":{"Icon":{"name":{"literalString":"phone"}}}},{"id":"phone-text","component":{"Text":{"text":{"path":"/phone"},"usageHint":"body"}}},{"id":"email-row","component":{"Row":{"children":{"explicitList":["email-icon","email-text"]},"gap":"small","alignment":"center"}}},{"id":"email-icon","component":{"Icon":{"name":{"literalString":"mail"}}}},{"id":"email-text","component":{"Text":{"text":{"path":"/email"},"usageHint":"body"}}},{"id":"location-row","component":{"Row":{"children":{"explicitList":["location-icon","location-text"]},"gap":"small","alignment":"center"}}},{"id":"location-icon","component":{"Icon":{"name":{"literalString":"location_on"}}}},{"id":"location-text","component":{"Text":{"text":{"path":"/location"},"usageHint":"body"}}},{"id":"actions","component":{"Row":{"children":{"explicitList":["call-btn","message-btn"]},"gap":"small"}}},{"id":"call-btn-text","component":{"Text":{"text":{"literalString":"Call"}}}},{"id":"call-btn","component":{"Button":{"child":"call-btn-text","action":"call"}}},{"id":"message-btn-text","component":{"Text":{"text":{"literalString":"Message"}}}},{"id":"message-btn","component":{"Button":{"child":"message-btn-text","action":"message"}}}]
```


## 使用指南

### 何时使用 A2UI

- 用户需要展示结构化数据（列表、卡片、表格等）
- 需要交互式 UI（按钮、表单等）
- 需要动态更新 UI 内容
- 需要美观的、组件化的界面展示

### 数据获取策略

1. **使用 web_search 工具**：使用 `web_search` 工具搜索网络信息
   - **重要**：从 web_search 获取的数据中，**必须过滤掉所有网址、URL、参考链接等引用信息**
   - 只提取和保留实际的内容信息（文本、数据等），不要包含来源网址
   - 确保输出到 A2UI 消息中的数据是纯净的内容，不包含任何 URL 或链接引用
2. **直接使用用户提供的数据**：如果用户已经在对话中提供了数据

### 消息发送格式

生成消息数组后，需要：

1. **生成 JSON 数组**：将消息数组序列化为有效的 JSON 字符串
2. **添加分隔符**：使用 `---BEGIN A2UI---` 和 `---END A2UI---` 包裹 JSON 字符串
3. **直接发送**：在回复中直接输出带分隔符的 JSON 数组字符串，不要添加额外的说明文字或 Markdown 代码块
4. **确保格式正确**：JSON 必须严格符合 `server_to_client.json` 规范，必须是有效的 JSON 数组

**重要提示**：
- 消息内容必须是**纯 JSON 数组字符串**，用 `---BEGIN A2UI---` 和 `---END A2UI---` 分隔符包裹
- 不要使用 Markdown 代码块包裹（如 \`\`\`json ... \`\`\`）
- 不要添加额外的说明文字
- **严格遵守格式规范**：每个消息对象必须且仅包含四种操作之一（`beginRendering`、`surfaceUpdate`、`dataModelUpdate`、`deleteSurface`）
- 所有字段必须符合 `server_to_client.json` 中定义的类型和约束
- 系统会自动检测分隔符和 JSON 格式并渲染为 A2UI 界面

**示例输出格式**：
```
---BEGIN A2UI---
[{"beginRendering":{"surfaceId":"default","root":"root-column"}},{"surfaceUpdate":{"surfaceId":"default","components":[...]}},{"dataModelUpdate":{"surfaceId":"default","path":"/","contents":[...]}}]
---END A2UI---
```

## 注意事项

1. **组件 ID 唯一性**：每个 surface 内的组件 ID 必须唯一
2. **surfaceId 唯一性**：如果要创建新的 surface，必须使用新的、未使用过的 surfaceId
3. **数据路径**：确保 `dataModelUpdate` 中的数据路径与组件中使用的 `path` 匹配
4. **组件类型**：只能使用标准目录中定义的组件类型
5. **消息顺序**：虽然消息顺序通常不重要，但建议先发送组件定义，再发送数据，最后发送 `beginRendering`
6. **错误处理**：如果数据获取失败，应该向用户说明错误，而不是生成不完整的 UI
7. **web_search 数据过滤**：使用 `web_search` 工具时，必须从搜索结果中移除所有网址、URL、参考链接等信息，只保留实际内容数据
8. **格式严格遵守**：输出消息必须严格遵循 `server_to_client.json` 规范，每个消息对象必须且仅包含一种操作类型，所有字段必须符合规范定义

## 参考资源

- A2UI 规范文件：`resources/skills/a2ui/0.8/json/server_to_client.json`
- 标准组件目录：`resources/skills/a2ui/0.8/json/standard_catalog_definition.json`
- 完整规范（含组件定义）：`resources/skills/a2ui/0.8/json/server_to_client_with_standard_catalog.json`
- A2UI 协议文档：`resources/skills/a2ui/0.8/docs/a2ui_protocol.md`
- 示例代码：`src/renderer/src/a2ui/example.ts`
