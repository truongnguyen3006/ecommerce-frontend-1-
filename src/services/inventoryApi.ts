import axiosClient from '@/lib/axiosClient';
export interface InventoryResponse { skuCode: string; quantity: number }
export const inventoryApi = {
  getStock: (skuCode: string): Promise<InventoryResponse> =>
    axiosClient.get<InventoryResponse, InventoryResponse>(`/api/inventory/${encodeURIComponent(skuCode)}`),
  adjust: (skuCode: string, adjustmentQuantity: number) =>
    axiosClient.post<{ status: 'queued'; skuCode: string }, { status: 'queued'; skuCode: string }>('/api/inventory/adjust', { skuCode, adjustmentQuantity, reason: 'Admin adjustment' }),
};
