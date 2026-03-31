import type { OrderResponse } from '@/services/orderApi';

export interface OrderStatusMeta {
  color: 'green' | 'gold' | 'blue' | 'red' | 'default' | 'magenta' | 'purple' | 'cyan';
  label: string;
  step: number;
  description: string;
}

export interface TrackingStepItem {
  title: string;
  description?: string;
  status: 'wait' | 'process' | 'finish' | 'error';
}

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  switch ((status || '').toUpperCase()) {
    case 'CREATED':
    case 'PENDING':
      return {
        color: 'gold',
        label: 'Mới đặt hàng',
        step: 1,
        description: 'Đơn hàng đã được ghi nhận và đang chờ hệ thống xác nhận.',
      };
    case 'VALIDATED':
      return {
        color: 'blue',
        label: 'Đã xác nhận',
        step: 2,
        description: 'Đơn hàng đã được xác nhận tồn kho. Nếu bạn chọn VNPAY, đây là lúc có thể tiếp tục thanh toán.',
      };
    case 'PROCESSING':
    case 'PAID':
      return {
        color: 'cyan',
        label: 'Đang xử lý',
        step: 3,
        description: 'Hệ thống đang xử lý đơn hàng và cập nhật các bước tiếp theo.',
      };
    case 'CONFIRMED':
      return {
        color: 'purple',
        label: 'Đã xác nhận hoàn tất',
        step: 4,
        description: 'Đơn hàng đã được xác nhận thành công và đang chuẩn bị bàn giao.',
      };
    case 'SHIPPING':
      return {
        color: 'blue',
        label: 'Đang giao hàng',
        step: 4,
        description: 'Đơn hàng đã được chuyển sang giai đoạn giao hàng.',
      };
    case 'COMPLETED':
    case 'DELIVERED':
      return {
        color: 'green',
        label: 'Hoàn tất',
        step: 5,
        description: 'Đơn hàng đã hoàn tất thành công.',
      };
    case 'PAYMENT_FAILED':
      return {
        color: 'magenta',
        label: 'Thanh toán thất bại',
        step: 3,
        description: 'Thanh toán chưa thành công. Bạn có thể thử lại hoặc hủy đơn ở trạng thái phù hợp.',
      };
    case 'FAILED':
      return {
        color: 'red',
        label: 'Xử lý thất bại',
        step: 3,
        description: 'Hệ thống không thể hoàn tất đơn hàng ở bước xử lý.',
      };
    case 'CANCELLED':
      return {
        color: 'red',
        label: 'Đã hủy',
        step: 2,
        description: 'Đơn hàng đã bị hủy trước khi hoàn tất.',
      };
    default:
      return {
        color: 'default',
        label: status || 'Đang cập nhật',
        step: 1,
        description: 'Trạng thái đơn hàng đang được cập nhật.',
      };
  }
}

export function getOrderTrackingSteps(order: Pick<OrderResponse, 'status'>): TrackingStepItem[] {
  const normalizedStatus = (order.status || '').toUpperCase();

  const steps: TrackingStepItem[] = [
    { title: 'Đã đặt hàng', description: 'Hệ thống ghi nhận đơn hàng của bạn.', status: 'wait' },
    { title: 'Xác nhận đơn', description: 'Kiểm tra đơn hàng và thông tin sản phẩm.', status: 'wait' },
    { title: 'Đang xử lý', description: 'Hoàn tất các bước xử lý nội bộ của đơn hàng.', status: 'wait' },
    { title: 'Đang giao hàng', description: 'Đơn hàng sẵn sàng giao hoặc đang trên đường đến bạn.', status: 'wait' },
    { title: 'Hoàn tất', description: 'Đơn hàng đã được chốt thành công.', status: 'wait' },
  ];

  switch (normalizedStatus) {
    case 'CREATED':
    case 'PENDING':
      steps[0].status = 'process';
      break;
    case 'VALIDATED':
      steps[0].status = 'finish';
      steps[1].status = 'process';
      break;
    case 'PROCESSING':
    case 'PAID':
      steps[0].status = 'finish';
      steps[1].status = 'finish';
      steps[2].status = 'process';
      break;
    case 'CONFIRMED':
      steps[0].status = 'finish';
      steps[1].status = 'finish';
      steps[2].status = 'finish';
      steps[3].status = 'process';
      break;
    case 'SHIPPING':
      steps[0].status = 'finish';
      steps[1].status = 'finish';
      steps[2].status = 'finish';
      steps[3].status = 'process';
      break;
    case 'COMPLETED':
    case 'DELIVERED':
      return steps.map((step) => ({ ...step, status: 'finish' }));
    case 'PAYMENT_FAILED':
      steps[0].status = 'finish';
      steps[1].status = 'finish';
      steps[2].status = 'error';
      steps[3].status = 'wait';
      steps[4].status = 'wait';
      return steps;
    case 'FAILED':
      steps[0].status = 'finish';
      steps[1].status = 'finish';
      steps[2].status = 'error';
      steps[3].status = 'wait';
      steps[4].status = 'wait';
      return steps;
    case 'CANCELLED':
      steps[0].status = 'finish';
      steps[1].status = 'error';
      steps[2].status = 'wait';
      steps[3].status = 'wait';
      steps[4].status = 'wait';
      return steps;
    default:
      steps[0].status = 'process';
      break;
  }

  return steps;
}
