import { OrderRepository } from '../order/order.repository';
import { ToolExecutorService } from './tool-executor.service';

describe('ToolExecutorService', () => {
  let service: ToolExecutorService;
  let orderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    orderRepository = {
      getOrderItems: jest.fn(),
      getOrderStatus: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    service = new ToolExecutorService(orderRepository);
  });

  it('should execute getOrderStatus', () => {
    orderRepository.getOrderStatus.mockReturnValue({
      orderId: '123',
      status: 'PAID',
    });

    const result = service.execute('getOrderStatus', {
      orderId: '123',
    });

    expect(orderRepository.getOrderStatus).toHaveBeenCalledWith('123');
    expect(result).toEqual({
      supported: true,
      result: {
        orderId: '123',
        status: 'PAID',
      },
    });
  });

  it('should execute getOrderItems', () => {
    orderRepository.getOrderItems.mockReturnValue({
      orderId: '123',
      found: true,
      items: ['Keyboard', 'Mouse'],
    });

    const result = service.execute('getOrderItems', {
      orderId: '123',
    });

    expect(orderRepository.getOrderItems).toHaveBeenCalledWith('123');
    expect(result).toEqual({
      supported: true,
      result: {
        orderId: '123',
        found: true,
        items: ['Keyboard', 'Mouse'],
      },
    });
  });

  it('should mark unsupported tools explicitly', () => {
    expect(
      service.execute('unknownTool', {
        orderId: '123',
      }),
    ).toEqual({
      supported: false,
    });
  });
});
