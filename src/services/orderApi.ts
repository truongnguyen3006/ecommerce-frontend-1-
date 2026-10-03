import axiosClient from '@/lib/axiosClient';
export type OrderStatus = 'PENDING' | 'VALIDATED' | 'COMPLETED' | 'FAILED' | 'PAYMENT_FAILED' | 'CANCELLED';
export interface OrderRequest {
  items: { skuCode: string; quantity: number }[];
  paymentMethod: 'COD' | 'VNPAY';
  shippingAddressLabel?: string; shippingRecipientName?: string; shippingRecipientPhone?: string; shippingAddressLine?: string;
}
export interface OrderPlacementResponse { orderNumber: string; message: string }
export interface OrderLineItem { id: number; skuCode: string; price: number; quantity: number; productName: string; color?: string; size?: string }
export interface OrderResponse {
  id: number; orderNumber: string; status: OrderStatus; totalPrice: number; orderDate: string;
  orderLineItemsList: OrderLineItem[]; userId: string; paymentMethod: 'COD' | 'VNPAY';
  shippingAddressLabel?: string; shippingRecipientName?: string; shippingRecipientPhone?: string; shippingAddressLine?: string;
  cancelReason?: string; cancelledAt?: string;
  onlinePaymentInFlight?: boolean; paymentReconciliationRequired?: boolean;
}
export const orderApi = {
  placeOrder: (data: OrderRequest, idempotencyKey: string): Promise<OrderPlacementResponse> =>
    axiosClient.post<OrderPlacementResponse, OrderPlacementResponse>('/api/order', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  getAllOrders: (): Promise<OrderResponse[]> => axiosClient.get<OrderResponse[], OrderResponse[]>('/api/order/me'),
  getAdminOrders: (): Promise<OrderResponse[]> => axiosClient.get<OrderResponse[], OrderResponse[]>('/api/order/admin'),
  getOrderById: (orderNumber: string): Promise<OrderResponse> => axiosClient.get<OrderResponse, OrderResponse>(`/api/order/${encodeURIComponent(orderNumber)}`),
  cancelOrder: (orderNumber: string, reason?: string): Promise<OrderResponse> =>
    axiosClient.post<OrderResponse, OrderResponse>(`/api/order/${encodeURIComponent(orderNumber)}/cancel`, { reason }),
};
