export class OrderRepository {
  getOrderStatus(orderId: string) {
    const mockOrders: Record<string, string> = {
      '123': 'PAID',
      '456': 'PREPARING',
      '789': 'DELIVERED',
    };

    return {
      orderId,
      status: mockOrders[orderId] ?? 'NOT_FOUND',
    };
  }
}
