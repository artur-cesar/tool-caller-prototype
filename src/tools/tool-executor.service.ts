import { Injectable } from '@nestjs/common';

import { OrderRepository } from '../order/order.repository';

type ToolExecutionResult =
  | { supported: true; result: unknown }
  | { supported: false };

@Injectable()
export class ToolExecutorService {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(
    toolName: string,
    argumentsInput: Record<string, unknown>,
  ): ToolExecutionResult {
    if (toolName === 'getOrderStatus') {
      return {
        supported: true,
        result: this.orderRepository.getOrderStatus(
          String(argumentsInput.orderId),
        ),
      };
    }

    if (toolName === 'getOrderItems') {
      return {
        supported: true,
        result: this.orderRepository.getOrderItems(
          String(argumentsInput.orderId),
        ),
      };
    }

    return { supported: false };
  }
}
