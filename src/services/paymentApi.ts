import axiosClient from '@/lib/axiosClient';
export interface PaymentTransactionResponse {
  orderNumber: string; provider: string; status: 'NOT_CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED';
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
