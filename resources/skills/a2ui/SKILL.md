# A2UI Skill

## 概述

A2UI (Agent to UI) Skill 用于根据用户需求生成符合 A2UI 规范的动态 UI 界面。该技能会先通过其他工具或技能获取所需数据，然后根据数据和 A2UI 规范生成消息发送给用户。

## 工作流程

1. **获取数据**：根据用户需求，使用 web_search tools 获取所需数据
2. **数据处理**：将 web_search 返回的数据处理成结构化的 JSON 格式，提取关键信息并组织成便于后续使用的数据结构
3. **流式生成 A2UI 消息**：根据处理后的 JSON 数据和 A2UI 规范，按照 JSONL（JSON Lines）格式流式生成符合 `server_to_client.json` 格式的消息。每个消息是独立的 JSON 对象，每行一个
4. **流式发送消息**：使用 `---BEGIN A2UI---` 和 `---END A2UI---` 分隔符包裹 JSONL 流，逐行输出每个消息对象。系统会自动识别并流式渲染为 A2UI 界面

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

### 组件协议 standard_catalog_definition.json

```
{"components":{"Text":{"type":"object","additionalProperties":false,"properties":{"text":{"type":"object","description":"The text content to display. This can be a literal string or a reference to a value in the data model ('path', e.g., '/doc/title'). While simple Markdown formatting is supported (i.e. without HTML, images, or links), utilizing dedicated UI components is generally preferred for a richer and more structured presentation.","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"usageHint":{"type":"string","description":"A hint for the base text style. One of:\n- `h1`: Largest heading.\n- `h2`: Second largest heading.\n- `h3`: Third largest heading.\n- `h4`: Fourth largest heading.\n- `h5`: Fifth largest heading.\n- `caption`: Small text for captions.\n- `body`: Standard body text.","enum":["h1","h2","h3","h4","h5","caption","body"]}},"required":["text"]},"Image":{"type":"object","additionalProperties":false,"properties":{"url":{"type":"object","description":"The URL of the image to display. This can be a literal string ('literal') or a reference to a value in the data model ('path', e.g. '/thumbnail/url').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"fit":{"type":"string","description":"Specifies how the image should be resized to fit its container. This corresponds to the CSS 'object-fit' property.","enum":["contain","cover","fill","none","scale-down"]},"usageHint":{"type":"string","description":"A hint for the image size and style. One of:\n- `icon`: Small square icon.\n- `avatar`: Circular avatar image.\n- `smallFeature`: Small feature image.\n- `mediumFeature`: Medium feature image.\n- `largeFeature`: Large feature image.\n- `header`: Full-width, full bleed, header image.","enum":["icon","avatar","smallFeature","mediumFeature","largeFeature","header"]}},"required":["url"]},"Icon":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"object","description":"The name of the icon to display. This can be a literal string or a reference to a value in the data model ('path', e.g. '/form/submit').","additionalProperties":false,"properties":{"literalString":{"type":"string","enum":["accountCircle","add","arrowBack","arrowForward","attachFile","calendarToday","call","camera","check","close","delete","download","edit","event","error","favorite","favoriteOff","folder","help","home","info","locationOn","lock","lockOpen","mail","menu","moreVert","moreHoriz","notificationsOff","notifications","payment","person","phone","photo","print","refresh","search","send","settings","share","shoppingCart","star","starHalf","starOff","upload","visibility","visibilityOff","warning"]},"path":{"type":"string"}}}},"required":["name"]},"Video":{"type":"object","additionalProperties":false,"properties":{"url":{"type":"object","description":"The URL of the video to display. This can be a literal string or a reference to a value in the data model ('path', e.g. '/video/url').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}}},"required":["url"]},"AudioPlayer":{"type":"object","additionalProperties":false,"properties":{"url":{"type":"object","description":"The URL of the audio to be played. This can be a literal string ('literal') or a reference to a value in the data model ('path', e.g. '/song/url').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"description":{"type":"object","description":"A description of the audio, such as a title or summary. This can be a literal string or a reference to a value in the data model ('path', e.g. '/song/title').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}}},"required":["url"]},"Row":{"type":"object","additionalProperties":false,"properties":{"children":{"type":"object","description":"Defines the children. Use 'explicitList' for a fixed set of children, or 'template' to generate children from a data list.","additionalProperties":false,"properties":{"explicitList":{"type":"array","items":{"type":"string"}},"template":{"type":"object","description":"A template for generating a dynamic list of children from a data model list. `componentId` is the component to use as a template, and `dataBinding` is the path to the map of components in the data model. Values in the map will define the list of children.","additionalProperties":false,"properties":{"componentId":{"type":"string"},"dataBinding":{"type":"string"}},"required":["componentId","dataBinding"]}}},"distribution":{"type":"string","description":"Defines the arrangement of children along the main axis (horizontally). This corresponds to the CSS 'justify-content' property.","enum":["center","end","spaceAround","spaceBetween","spaceEvenly","start"]},"alignment":{"type":"string","description":"Defines the alignment of children along the cross axis (vertically). This corresponds to the CSS 'align-items' property.","enum":["start","center","end","stretch"]}},"required":["children"]},"Column":{"type":"object","additionalProperties":false,"properties":{"children":{"type":"object","description":"Defines the children. Use 'explicitList' for a fixed set of children, or 'template' to generate children from a data list.","additionalProperties":false,"properties":{"explicitList":{"type":"array","items":{"type":"string"}},"template":{"type":"object","description":"A template for generating a dynamic list of children from a data model list. `componentId` is the component to use as a template, and `dataBinding` is the path to the map of components in the data model. Values in the map will define the list of children.","additionalProperties":false,"properties":{"componentId":{"type":"string"},"dataBinding":{"type":"string"}},"required":["componentId","dataBinding"]}}},"distribution":{"type":"string","description":"Defines the arrangement of children along the main axis (vertically). This corresponds to the CSS 'justify-content' property.","enum":["start","center","end","spaceBetween","spaceAround","spaceEvenly"]},"alignment":{"type":"string","description":"Defines the alignment of children along the cross axis (horizontally). This corresponds to the CSS 'align-items' property.","enum":["center","end","start","stretch"]}},"required":["children"]},"List":{"type":"object","additionalProperties":false,"properties":{"children":{"type":"object","description":"Defines the children. Use 'explicitList' for a fixed set of children, or 'template' to generate children from a data list.","additionalProperties":false,"properties":{"explicitList":{"type":"array","items":{"type":"string"}},"template":{"type":"object","description":"A template for generating a dynamic list of children from a data model list. `componentId` is the component to use as a template, and `dataBinding` is the path to the map of components in the data model. Values in the map will define the list of children.","additionalProperties":false,"properties":{"componentId":{"type":"string"},"dataBinding":{"type":"string"}},"required":["componentId","dataBinding"]}}},"direction":{"type":"string","description":"The direction in which the list items are laid out.","enum":["vertical","horizontal"]},"alignment":{"type":"string","description":"Defines the alignment of children along the cross axis.","enum":["start","center","end","stretch"]}},"required":["children"]},"Card":{"type":"object","additionalProperties":false,"properties":{"child":{"type":"string","description":"The ID of the component to be rendered inside the card."}},"required":["child"]},"Tabs":{"type":"object","additionalProperties":false,"properties":{"tabItems":{"type":"array","description":"An array of objects, where each object defines a tab with a title and a child component.","items":{"type":"object","additionalProperties":false,"properties":{"title":{"type":"object","description":"The tab title. Defines the value as either a literal value or a path to data model value (e.g. '/options/title').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"child":{"type":"string"}},"required":["title","child"]}}},"required":["tabItems"]},"Divider":{"type":"object","additionalProperties":false,"properties":{"axis":{"type":"string","description":"The orientation of the divider.","enum":["horizontal","vertical"]}}},"Modal":{"type":"object","additionalProperties":false,"properties":{"entryPointChild":{"type":"string","description":"The ID of the component that opens the modal when interacted with (e.g., a button)."},"contentChild":{"type":"string","description":"The ID of the component to be displayed inside the modal."}},"required":["entryPointChild","contentChild"]},"Button":{"type":"object","additionalProperties":false,"properties":{"child":{"type":"string","description":"The ID of the component to display in the button, typically a Text component."},"primary":{"type":"boolean","description":"Indicates if this button should be styled as the primary action."},"action":{"type":"object","description":"The client-side action to be dispatched when the button is clicked. It includes the action's name and an optional context payload.","additionalProperties":false,"properties":{"name":{"type":"string"},"context":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"key":{"type":"string"},"value":{"type":"object","description":"Defines the value to be included in the context as either a literal value or a path to a data model value (e.g. '/user/name').","additionalProperties":false,"properties":{"path":{"type":"string"},"literalString":{"type":"string"},"literalNumber":{"type":"number"},"literalBoolean":{"type":"boolean"}}}},"required":["key","value"]}}},"required":["name"]}},"required":["child","action"]},"CheckBox":{"type":"object","additionalProperties":false,"properties":{"label":{"type":"object","description":"The text to display next to the checkbox. Defines the value as either a literal value or a path to data model ('path', e.g. '/option/label').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"value":{"type":"object","description":"The current state of the checkbox (true for checked, false for unchecked). This can be a literal boolean ('literalBoolean') or a reference to a value in the data model ('path', e.g. '/filter/open').","additionalProperties":false,"properties":{"literalBoolean":{"type":"boolean"},"path":{"type":"string"}}}},"required":["label","value"]},"TextField":{"type":"object","additionalProperties":false,"properties":{"label":{"type":"object","description":"The text label for the input field. This can be a literal string or a reference to a value in the data model ('path, e.g. '/user/name').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"text":{"type":"object","description":"The value of the text field. This can be a literal string or a reference to a value in the data model ('path', e.g. '/user/name').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"textFieldType":{"type":"string","description":"The type of input field to display.","enum":["date","longText","number","shortText","obscured"]},"validationRegexp":{"type":"string","description":"A regular expression used for client-side validation of the input."}},"required":["label"]},"DateTimeInput":{"type":"object","additionalProperties":false,"properties":{"value":{"type":"object","description":"The selected date and/or time value in ISO 8601 format. This can be a literal string ('literalString') or a reference to a value in the data model ('path', e.g. '/user/dob').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"enableDate":{"type":"boolean","description":"If true, allows the user to select a date."},"enableTime":{"type":"boolean","description":"If true, allows the user to select a time."}},"required":["value"]},"MultipleChoice":{"type":"object","additionalProperties":false,"properties":{"selections":{"type":"object","description":"The currently selected values for the component. This can be a literal array of strings or a path to an array in the data model('path', e.g. '/hotel/options').","additionalProperties":false,"properties":{"literalArray":{"type":"array","items":{"type":"string"}},"path":{"type":"string"}}},"options":{"type":"array","description":"An array of available options for the user to choose from.","items":{"type":"object","additionalProperties":false,"properties":{"label":{"type":"object","description":"The text to display for this option. This can be a literal string or a reference to a value in the data model (e.g. '/option/label').","additionalProperties":false,"properties":{"literalString":{"type":"string"},"path":{"type":"string"}}},"value":{"type":"string","description":"The value to be associated with this option when selected."}},"required":["label","value"]}},"maxAllowedSelections":{"type":"integer","description":"The maximum number of options that the user is allowed to select."}},"required":["selections","options"]},"Slider":{"type":"object","additionalProperties":false,"properties":{"value":{"type":"object","description":"The current value of the slider. This can be a literal number ('literalNumber') or a reference to a value in the data model ('path', e.g. '/restaurant/cost').","additionalProperties":false,"properties":{"literalNumber":{"type":"number"},"path":{"type":"string"}}},"minValue":{"type":"number","description":"The minimum value of the slider."},"maxValue":{"type":"number","description":"The maximum value of the slider."}},"required":["value"]}},"styles":{"font":{"type":"string","description":"The primary font for the UI."},"primaryColor":{"type":"string","description":"The primary UI color as a hexadecimal code (e.g., '#00BFFF').","pattern":"^#[0-9a-fA-F]{6}$"}}}
```

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

4. **流式生成消息**：
   - 按照 JSONL 格式，每行输出一个独立的 JSON 消息对象
   - 通常先流式输出 `surfaceUpdate` 消息定义组件结构（可以分多次发送不同的组件）
   - 然后流式输出 `dataModelUpdate` 消息填充数据
   - 最后输出 `beginRendering` 消息触发渲染
   - 消息可以按任意顺序发送，只要在 `beginRendering` 之前所有必需的组件和数据都已发送

## 示例

### 简单示例：显示标题和列表（JSONL 格式）

```jsonl
{"surfaceUpdate":{"surfaceId":"default","components":[{"id":"root-column","component":{"Column":{"children":{"explicitList":["title","item-list"]}}}},{"id":"title","component":{"Text":{"usageHint":"h1","text":{"path":"title"}}}},{"id":"item-list","component":{"List":{"direction":"vertical","children":{"template":{"componentId":"item-template","dataBinding":"/items"}}}}},{"id":"item-template","component":{"Card":{"child":"item-text"}}},{"id":"item-text","component":{"Text":{"text":{"path":"name"}}}}]}}
{"dataModelUpdate":{"surfaceId":"default","path":"/","contents":[{"key":"title","valueString":"My List"},{"key":"items","valueMap":[{"key":"item1","valueMap":[{"key":"name","valueString":"Item 1"}]},{"key":"item2","valueMap":[{"key":"name","valueString":"Item 2"}]}]}]}}
{"beginRendering":{"surfaceId":"default","root":"root-column"}}
```

### 示例：用户信息卡片（JSONL 格式）

```jsonl
{"surfaceUpdate":{"surfaceId":"profile","components":[{"id":"root","component":{"Card":{"child":"main-column"}}},{"id":"main-column","component":{"Column":{"children":{"explicitList":["avatar-image","name","title","divider","contact-info","actions"]},"alignment":"center"}}},{"id":"avatar-image","component":{"Image":{"url":{"path":"/avatar"},"fit":"cover","usageHint":"avatar"}}},{"id":"name","component":{"Text":{"text":{"path":"/name"},"usageHint":"h2"}}},{"id":"title","component":{"Text":{"text":{"path":"/title"},"usageHint":"body"}}},{"id":"divider","component":{"Divider":{}}},{"id":"contact-info","component":{"Column":{"children":{"explicitList":["phone-row","email-row","location-row"]}}}},{"id":"phone-row","component":{"Row":{"children":{"explicitList":["phone-icon","phone-text"]},"alignment":"center"}}},{"id":"phone-icon","component":{"Icon":{"name":{"literalString":"phone"}}}},{"id":"phone-text","component":{"Text":{"text":{"path":"/phone"},"usageHint":"body"}}},{"id":"email-row","component":{"Row":{"children":{"explicitList":["email-icon","email-text"]},"alignment":"center"}}},{"id":"email-icon","component":{"Icon":{"name":{"literalString":"mail"}}}},{"id":"email-text","component":{"Text":{"text":{"path":"/email"},"usageHint":"body"}}},{"id":"location-row","component":{"Row":{"children":{"explicitList":["location-icon","location-text"]},"alignment":"center"}}},{"id":"location-icon","component":{"Icon":{"name":{"literalString":"locationOn"}}}},{"id":"location-text","component":{"Text":{"text":{"path":"/location"},"usageHint":"body"}}},{"id":"actions","component":{"Row":{"children":{"explicitList":["call-btn","message-btn"]}}}},{"id":"call-btn-text","component":{"Text":{"text":{"literalString":"Call"}}}},{"id":"call-btn","component":{"Button":{"child":"call-btn-text","action":{"name":"call"}}}},{"id":"message-btn-text","component":{"Text":{"text":{"literalString":"Message"}}}},{"id":"message-btn","component":{"Button":{"child":"message-btn-text","action":{"name":"message"}}}}]}}
{"dataModelUpdate":{"surfaceId":"profile","path":"/","contents":[{"key":"name","valueString":"John Doe"},{"key":"title","valueString":"Software Engineer"},{"key":"phone","valueString":"+1 234-567-8900"},{"key":"email","valueString":"john@example.com"},{"key":"location","valueString":"San Francisco, CA"},{"key":"avatar","valueString":"https://example.com/avatar.jpg"}]}}
{"beginRendering":{"surfaceId":"profile","root":"root"}}
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

A2UI 协议使用 **JSONL（JSON Lines）格式**进行流式输出。每个消息是独立的 JSON 对象，每行一个。

**流式输出步骤**：

1. **使用分隔符开始**：首先输出 `---BEGIN A2UI---`
2. **流式输出 JSONL 消息**：每行输出一个独立的 JSON 对象，符合 `server_to_client.json` 规范
   - 每个消息对象必须且仅包含四种操作之一：`beginRendering`、`surfaceUpdate`、`dataModelUpdate`、`deleteSurface`
   - 每行必须是有效的 JSON 对象，不能是数组
   - 消息可以按任意顺序发送，但通常先发送组件定义，再发送数据，最后发送 `beginRendering`
3. **使用分隔符结束**：最后输出 `---END A2UI---`
4. **直接发送**：在回复中直接输出，不要添加额外的说明文字或 Markdown 代码块

**重要提示**：
- 消息格式必须是 **JSONL（每行一个 JSON 对象）**，不是 JSON 数组
- 使用 `---BEGIN A2UI---` 和 `---END A2UI---` 分隔符包裹整个 JSONL 流
- 不要使用 Markdown 代码块包裹（如 \`\`\`json ... \`\`\`）
- 不要添加额外的说明文字
- **严格遵守格式规范**：每个消息对象必须且仅包含四种操作之一
- 所有字段必须符合 `server_to_client.json` 中定义的类型和约束
- 系统会自动检测分隔符和 JSONL 格式并流式渲染为 A2UI 界面

**示例输出格式**：
```
---BEGIN A2UI---
{"surfaceUpdate":{"surfaceId":"default","components":[...]}}
{"dataModelUpdate":{"surfaceId":"default","path":"/","contents":[...]}}
{"beginRendering":{"surfaceId":"default","root":"root-column"}}
---END A2UI---
```

## 注意事项

1. **组件 ID 唯一性**：每个 surface 内的组件 ID 必须唯一
2. **surfaceId 唯一性**：如果要创建新的 surface，必须使用新的、未使用过的 surfaceId
3. **数据路径**：确保 `dataModelUpdate` 中的数据路径与组件中使用的 `path` 匹配
4. **组件类型**：只能使用标准目录中定义的组件类型
5. **消息顺序**：虽然消息顺序通常不重要，但建议先流式输出组件定义（`surfaceUpdate`），再输出数据（`dataModelUpdate`），最后输出 `beginRendering` 触发渲染
6. **流式输出**：消息应该流式输出，不需要等待所有消息生成完成。每生成一个消息就立即输出一行 JSON
7. **JSONL 格式**：每行必须是一个独立的 JSON 对象，不能是 JSON 数组。每行以换行符分隔
8. **错误处理**：如果数据获取失败，应该向用户说明错误，而不是生成不完整的 UI
9. **web_search 数据过滤**：使用 `web_search` 工具时，必须从搜索结果中移除所有网址、URL、参考链接等信息，只保留实际内容数据
10. **格式严格遵守**：输出消息必须严格遵循 `server_to_client.json` 规范，每个消息对象必须且仅包含一种操作类型，所有字段必须符合规范定义

## 参考资源

- A2UI 规范文件：`resources/skills/a2ui/0.8/json/server_to_client.json`
- 标准组件目录：`resources/skills/a2ui/0.8/json/standard_catalog_definition.json`
- 完整规范（含组件定义）：`resources/skills/a2ui/0.8/json/server_to_client_with_standard_catalog.json`
- A2UI 协议文档：`resources/skills/a2ui/0.8/docs/a2ui_protocol.md`
- 示例代码：`src/renderer/src/a2ui/example.ts`
