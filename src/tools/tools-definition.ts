import { ToolDefinition } from './tools.type';

export const tools: ToolDefinition[] = [
  {
    name: 'getOrderStatus',
    description: 'Returns the status of an order by its ID.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'getOrderItems',
    description: 'Returns the items contained in an order by its ID.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
      },
      required: ['orderId'],
    },
  },
];
