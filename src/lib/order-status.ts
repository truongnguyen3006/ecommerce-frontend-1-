import type { OrderResponse } from '@/services/orderApi';
export interface OrderStatusMeta { color: 'default'; label: string; step: number; description: string }
const meta: Record<string, Omit<OrderStatusMeta, 'color'>> = {
  PENDING: { label: 'Đang xác nhận', step: 1, description: 'Đơn đã được tiếp nhận và đang kiểm tra tồn kho.' },
  VALIDATED: { label: 'Đã xác nhận', step: 2, description: 'Tồn kho đã được xác nhận. Đơn đang chờ bước thanh toán.' },
  COMPLETED: { label: 'Đã hoàn tất xử lý', step: 3, description: 'Hệ thống đã hoàn tất xử lý đơn hàng.' },
  FAILED: { label: 'Không thể xử lý', step: 2, description: 'Đơn không vượt qua bước kiểm tra tồn kho. Kiểm tra lại giỏ hàng trước khi đặt lại.' },
  PAYMENT_FAILED: { label: 'Thanh toán thất bại', step: 3, description: 'Thanh toán chưa thành công. Bạn có thể hủy đơn và kiểm tra lại giỏ.' },
  CANCELLED: { label: 'Đã hủy', step: 2, description: 'Đơn hàng đã được hủy.' },
};
export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return { color: 'default', ...(meta[status] || { label: status || 'Chưa có trạng thái', step: 1, description: 'Hãy tải lại để kiểm tra trạng thái đơn hàng.' }) };
}
export function isTerminalOrder(status?: string): boolean { return ['COMPLETED', 'FAILED', 'PAYMENT_FAILED', 'CANCELLED'].includes(status || ''); }
export function canCancelOrder(order: Pick<OrderResponse, 'status' | 'onlinePaymentInFlight' | 'paymentReconciliationRequired'>): boolean {
  return !order.paymentReconciliationRequired && !order.onlinePaymentInFlight && ['VALIDATED', 'PAYMENT_FAILED'].includes(order.status);
}
export function canPayOrder(order: OrderResponse, ownerId?: string): boolean {
  return !order.paymentReconciliationRequired && order.userId === ownerId && order.paymentMethod === 'VNPAY' && order.status === 'VALIDATED' && order.totalPrice > 0;
}
export function getOrderTrackingSteps(order: Pick<OrderResponse, 'status'>) {
  const failure = ['FAILED', 'CANCELLED', 'PAYMENT_FAILED'].includes(order.status);
  const current = getOrderStatusMeta(order.status).step - 1;
  return [
    { title: 'Tiếp nhận', description: 'Ghi nhận đơn hàng.' },
    { title: 'Xác nhận tồn kho', description: 'Kiểm tra từng biến thể.' },
    { title: 'Hoàn tất xử lý', description: 'Kết quả xử lý và thanh toán.' },
  ].map((step, index) => ({ ...step, status: order.status === 'COMPLETED' || index < current ? 'finish' : index === current ? failure ? 'error' : 'process' : 'wait' }));
}
