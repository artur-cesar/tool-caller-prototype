type MockOrder = {
  status: string;
  items: string[];
};

const mockOrders: Record<string, MockOrder> = {
  '123': {
    status: 'PAID',
    items: ['Keyboard', 'Mouse'],
  },
  '456': {
    status: 'PREPARING',
    items: ['Monitor'],
  },
  '789': {
    status: 'DELIVERED',
    items: ['Laptop', 'USB-C Cable', 'Dock'],
  },
};

export class OrderRepository {
  getOrderStatus(orderId: string) {
    return {
      orderId,
      status: mockOrders[orderId]?.status ?? 'NOT_FOUND',
    };
  }

  getOrderItems(orderId: string) {
    return {
      orderId,
      found: Boolean(mockOrders[orderId]),
      items: mockOrders[orderId]?.items ?? [],
    };
  }
}
