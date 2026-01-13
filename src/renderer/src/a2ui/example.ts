import { Types } from '@a2ui/react'

export const Example_One: Types.ServerToClientMessage[] = [
  {
    beginRendering: {
      surfaceId: 'default',
      root: 'root-column',
      styles: { primaryColor: '#FF0000', font: 'Roboto' }
    }
  },
  {
    surfaceUpdate: {
      surfaceId: 'default',
      components: [
        {
          id: 'root-column',
          component: {
            Column: {
              children: { explicitList: ['title-heading', 'item-list'] }
            }
          }
        },
        {
          id: 'title-heading',
          component: {
            Text: { usageHint: 'h1', text: { path: 'title' } }
          }
        },
        {
          id: 'item-list',
          component: {
            List: {
              direction: 'vertical',
              children: {
                template: {
                  componentId: 'item-card-template',
                  dataBinding: '/items'
                }
              }
            }
          }
        },
        {
          id: 'item-card-template',
          component: { Card: { child: 'card-layout' } }
        },
        {
          id: 'card-layout',
          component: {
            Row: {
              children: { explicitList: ['template-image', 'card-details'] }
            }
          }
        },
        {
          id: 'template-image',
          weight: 1,
          component: { Image: { url: { path: 'imageUrl' } } }
        },
        {
          id: 'card-details',
          weight: 2,
          component: {
            Column: {
              children: {
                explicitList: [
                  'template-name',
                  'template-detail',
                  'template-link',
                  'template-book-button'
                ]
              }
            }
          }
        },
        {
          id: 'template-name',
          component: { Text: { usageHint: 'h3', text: { path: 'name' } } }
        },
        {
          id: 'template-detail',
          component: { Text: { text: { path: 'detail' } } }
        },
        {
          id: 'template-link',
          component: { Text: { text: { path: 'infoLink' } } }
        },
        {
          id: 'template-book-button',
          component: {
            Button: {
              child: 'book-now-text',
              primary: true,
              action: {
                name: 'book_restaurant',
                context: [
                  { key: 'restaurantName', value: { path: 'name' } },
                  { key: 'imageUrl', value: { path: 'imageUrl' } },
                  { key: 'address', value: { path: 'address' } }
                ]
              }
            }
          }
        },
        {
          id: 'book-now-text',
          component: { Text: { text: { literalString: 'Book Now' } } }
        }
      ]
    }
  },
  {
    dataModelUpdate: {
      surfaceId: 'default',
      path: '/',
      contents: [
        {
          key: 'items',
          valueMap: [
            {
              key: 'item1',
              valueMap: [
                { key: 'name', valueString: 'The Fancy Place' },
                { key: 'detail', valueString: 'Fine dining experience' },
                { key: 'infoLink', valueString: 'https://example.com/fancy' },
                { key: 'imageUrl', valueString: 'https://picsum.photos/200/300' },
                { key: 'address', valueString: '123 Main St' }
              ]
            },
            {
              key: 'item2',
              valueMap: [
                { key: 'name', valueString: 'Quick Bites' },
                { key: 'detail', valueString: 'Casual and fast' },
                { key: 'infoLink', valueString: 'https://example.com/quick' },
                { key: 'imageUrl', valueString: 'https://picsum.photos/200/300' },
                { key: 'address', valueString: '456 Oak Ave' }
              ]
            }
          ]
        }
      ]
    }
  }
]

export const Example_Two: Types.ServerToClientMessage[] = [
  {
    surfaceUpdate: {
      surfaceId: 'default',
      components: [
        {
          id: 'root',
          component: {
            Column: {
              children: { explicitList: ['title', 'card-today', 'divider1', 'card-tomorrow'] }
            }
          }
        },
        {
          id: 'title',
          component: { Text: { usageHint: 'h1', text: { literalString: '北京天气' } } }
        },
        { id: 'card-today', component: { Card: { child: 'today-col' } } },
        {
          id: 'today-col',
          component: {
            Column: { children: { explicitList: ['today-title', 'today-row1', 'today-row2'] } }
          }
        },
        {
          id: 'today-title',
          component: { Text: { usageHint: 'h3', text: { path: 'today/title' } } }
        },
        {
          id: 'today-row1',
          component: { Row: { children: { explicitList: ['today-temp', 'today-cond'] } } }
        },
        {
          id: 'today-temp',
          weight: 1,
          component: { Text: { usageHint: 'body', text: { path: 'today/temp' } } }
        },
        {
          id: 'today-cond',
          weight: 1,
          component: { Text: { usageHint: 'body', text: { path: 'today/cond' } } }
        },
        {
          id: 'today-row2',
          component: { Row: { children: { explicitList: ['today-wind', 'today-humidity'] } } }
        },
        {
          id: 'today-wind',
          weight: 1,
          component: { Text: { usageHint: 'caption', text: { path: 'today/wind' } } }
        },
        {
          id: 'today-humidity',
          weight: 1,
          component: { Text: { usageHint: 'caption', text: { path: 'today/humidity' } } }
        },
        { id: 'divider1', component: { Divider: {} } },
        { id: 'card-tomorrow', component: { Card: { child: 'tomorrow-col' } } },
        {
          id: 'tomorrow-col',
          component: {
            Column: {
              children: { explicitList: ['tomorrow-title', 'tomorrow-temp', 'tomorrow-note'] }
            }
          }
        },
        {
          id: 'tomorrow-title',
          component: { Text: { usageHint: 'h3', text: { path: 'tomorrow/title' } } }
        },
        {
          id: 'tomorrow-temp',
          component: { Text: { usageHint: 'body', text: { path: 'tomorrow/temp' } } }
        },
        {
          id: 'tomorrow-note',
          component: { Text: { usageHint: 'caption', text: { path: 'tomorrow/note' } } }
        }
      ]
    }
  },
  {
    dataModelUpdate: {
      surfaceId: 'default',
      path: '/',
      contents: [
        {
          key: 'today',
          valueMap: [
            { key: 'title', valueString: '今天（北京时间）' },
            { key: 'temp', valueString: '最高约 5°C，最低约 -1°C' },
            { key: 'cond', valueString: '晴到少云，降水概率低' },
            { key: 'wind', valueString: '风：偏北到偏南，微风（阵风可更强）' },
            { key: 'humidity', valueString: '湿度：约 20%–35%（偏干）' }
          ]
        },
        {
          key: 'tomorrow',
          valueMap: [
            { key: 'title', valueString: '明天（北京时间）' },
            { key: 'temp', valueString: '最高约 1°C，最低约 -4°C' },
            { key: 'note', valueString: '整体偏冷偏干，注意防风保暖、补水护肤' }
          ]
        }
      ]
    }
  },
  {
    beginRendering: {
      surfaceId: 'default',
      root: 'root',
      styles: { primaryColor: '#2F6FED', font: 'Roboto' }
    }
  }
]


let a= [{
  "surfaceUpdate": {
    "surfaceId": "beijing-weather",
    "components": [{
      "id": "root",
      "component": {
        "Column": {
          "children": {
            "explicitList": ["title", "card"]
          },
          "spacing": "m"
        }
      }
    }, {
      "id": "title",
      "component": {
        "Text": {
          "usageHint": "h2",
          "text": {
            "literalString": "北京天气"
          }
        }
      }
    }, {
      "id": "card",
      "component": {
        "Card": {
          "child": "card-col"
        }
      }
    }, {
      "id": "card-col",
      "component": {
        "Column": {
          "children": {
            "explicitList": ["date", "summary", "temp-row", "wind", "precip", "note"]
          },
          "spacing": "s"
        }
      }
    }, {
      "id": "date",
      "component": {
        "Text": {
          "usageHint": "caption",
          "text": {
            "path": "date"
          }
        }
      }
    }, {
      "id": "summary",
      "component": {
        "Text": {
          "usageHint": "body",
          "text": {
            "path": "summary"
          }
        }
      }
    }, {
      "id": "temp-row",
      "component": {
        "Row": {
          "children": {
            "explicitList": ["temp-high", "temp-low"]
          },
          "spacing": "m"
        }
      }
    }, {
      "id": "temp-high",
      "weight": 1,
      "component": {
        "Text": {
          "usageHint": "body",
          "text": {
            "path": "tempHigh"
          }
        }
      }
    }, {
      "id": "temp-low",
      "weight": 1,
      "component": {
        "Text": {
          "usageHint": "body",
          "text": {
            "path": "tempLow"
          }
        }
      }
    }, {
      "id": "wind",
      "component": {
        "Text": {
          "usageHint": "body",
          "text": {
            "path": "wind"
          }
        }
      }
    }, {
      "id": "precip",
      "component": {
        "Text": {
          "usageHint": "body",
          "text": {
            "path": "precip"
          }
        }
      }
    }, {
      "id": "note",
      "component": {
        "Text": {
          "usageHint": "caption",
          "text": {
            "path": "note"
          }
        }
      }
    }]
  }
}, {
  "dataModelUpdate": {
    "surfaceId": "beijing-weather",
    "path": "/",
    "contents": [{
      "key": "date",
      "valueString": "更新于：2026-01-11（北京当地时间）"
    }, {
      "key": "summary",
      "valueString": "晴"
    }, {
      "key": "tempHigh",
      "valueString": "最高温：约 6°C（42°F）"
    }, {
      "key": "tempLow",
      "valueString": "最低温：约 -11°C（12°F）"
    }, {
      "key": "wind",
      "valueString": "风：西北风 约 18 km/h（11 mph）"
    }, {
      "key": "precip",
      "valueString": "降水概率：0%（雨/雪 0）"
    }, {
      "key": "note",
      "valueString": "提示：昼夜温差大，出门记得外套；空气偏干可备润唇膏。"
    }]
  }
}, {
  "beginRendering": {
    "surfaceId": "beijing-weather",
    "root": "root",
    "styles": {
      "primaryColor": "#1E88E5",
      "font": "Roboto"
    }
  }}]