import { OrderRepository } from '../order/order.repository';
import { ToolExecutorService } from './tool-executor.service';

describe('ToolExecutorService', () => {
  let service: ToolExecutorService;
  let orderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    orderRepository = {
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
