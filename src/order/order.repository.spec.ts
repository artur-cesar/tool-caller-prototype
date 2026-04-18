import { OrderRepository } from './order.repository';

describe('OrderRepository', () => {
  let repository: OrderRepository;

  beforeEach(() => {
    repository = new OrderRepository();
  });

  it('should return order status from the shared mock data', () => {
    expect(repository.getOrderStatus('123')).toEqual({
      orderId: '123',
      status: 'PAID',
    });
  });

  it('should return order items from the shared mock data', () => {
    expect(repository.getOrderItems('123')).toEqual({
      orderId: '123',
      found: true,
      items: ['Keyboard', 'Mouse'],
    });
  });

  it('should return a predictable result for an unknown order item lookup', () => {
    expect(repository.getOrderItems('999')).toEqual({
      orderId: '999',
      found: false,
      items: [],
    });
  });
});
