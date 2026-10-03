import axiosClient from '@/lib/axiosClient';
export interface PaymentTransactionResponse {
  orderNumber: string; provider: string; status: 'NOT_CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'SUCCESS_PENDING_ORDER' | 'RECONCILIATION_REQUIRED' | 'EXPIRED_RECONCILIATION_REQUIRED';
  providerSuccessReceived?: boolean; expiresAt?: string; retryAvailable?: boolean;
  amount: number; paymentUrl?: string; txnRef?: string; gatewayMessage?: string;
}
export function paymentDestination(value?: string): string | null {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export const paymentApi = {
  createVnpayPayment: (orderNumber: string): Promise<PaymentTransactionResponse> =>
    axiosClient.post<PaymentTransactionResponse, PaymentTransactionResponse>('/api/payment/vnpay/create', { orderNumber }),
  getPaymentByOrderNumber: (orderNumber: string): Promise<PaymentTransactionResponse> =>
    axiosClient.get<PaymentTransactionResponse, PaymentTransactionResponse>(`/api/payment/order/${encodeURIComponent(orderNumber)}`),
};

export function paymentStateMessage(payment: PaymentTransactionResponse): string {
  switch (payment.status) {
    case 'PENDING': return 'Liên kết thanh toán đang hoạt động. Đơn chưa thể hủy trong khi chờ kết quả.';
    case 'EXPIRED_RECONCILIATION_REQUIRED': return 'Liên kết thanh toán đã hết hạn. Cần đối soát trước khi tạo lượt mới; vui lòng liên hệ hỗ trợ.';
    case 'RECONCILIATION_REQUIRED': return 'Thanh toán cần đối soát. Vui lòng liên hệ hỗ trợ trước khi thử lại.';
    case 'SUCCESS_PENDING_ORDER': return 'Đã ghi nhận tiền; đang xác nhận quyết định đơn hàng.';
    case 'SUCCESS': return 'Thanh toán đã được xác nhận từ dịch vụ.';
    case 'FAILED': return 'Dịch vụ ghi nhận thanh toán thất bại.';
    default: return payment.retryAvailable ? 'Chưa tạo thanh toán. Bạn có thể tạo liên kết VNPay.' : 'Đang kiểm tra kết quả thanh toán.';
  }
}
