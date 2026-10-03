import axiosClient from '@/lib/axiosClient';
import type { Cart } from '@/types';
export const cartApi = {
  getMine: (): Promise<Cart> => axiosClient.get<Cart, Cart>('/api/cart/me'),
  add: (skuCode: string, quantity: number): Promise<void> => axiosClient.post<void, void>('/api/cart/items', { skuCode, quantity }),
  update: (skuCode: string, quantity: number): Promise<void> => axiosClient.put<void, void>(`/api/cart/items/${encodeURIComponent(skuCode)}`, { skuCode, quantity }),
  remove: (skuCode: string): Promise<void> => axiosClient.delete<void, void>(`/api/cart/items/${encodeURIComponent(skuCode)}`),
  clear: (): Promise<void> => axiosClient.delete<void, void>('/api/cart/me'),
};
