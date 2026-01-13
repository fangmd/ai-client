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
