import axiosClient from '@/lib/axiosClient';
import { isRecord, readNumber, readString } from '@/lib/api-normalizers';

export interface PaymentTransactionResponse {
  orderNumber: string;
  provider: string;
  status: string;
  amount: number;
  paymentUrl?: string;
  txnRef?: string;
  gatewayMessage?: string;
}

function normalizePayment(payload: unknown): PaymentTransactionResponse {
  if (!isRecord(payload)) {
    return {
      orderNumber: '',
      provider: '',
      status: '',
      amount: 0,
    };
  }

  return {
    orderNumber: readString(payload.orderNumber),
    provider: readString(payload.provider),
    status: readString(payload.status),
    amount: readNumber(payload.amount),
    paymentUrl: readString(payload.paymentUrl),
    txnRef: readString(payload.txnRef),
    gatewayMessage: readString(payload.gatewayMessage),
  };
}

export const paymentApi = {
  createVnpayPayment: async (orderNumber: string): Promise<PaymentTransactionResponse> => {
    const response = await axiosClient.post<unknown, unknown>('/api/payment/vnpay/create', { orderNumber });
    return normalizePayment(response);
  },
  getPaymentByOrderNumber: async (orderNumber: string): Promise<PaymentTransactionResponse> => {
    const response = await axiosClient.get<unknown, unknown>(`/api/payment/order/${orderNumber}`);
    return normalizePayment(response);
  },
};
