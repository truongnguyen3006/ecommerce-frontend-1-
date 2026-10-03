import axiosClient from '@/lib/axiosClient';
export interface InventoryResponse { skuCode: string; quantity: number }
export interface StockOperation { operationId: string; skuCode?: string; adjustmentQuantity?: number; status: 'ACCEPTED' | 'PENDING' | 'APPLIED' | 'REJECTED'; quantity?: number; code?: string }
export const inventoryApi = {
  getStock: (skuCode: string): Promise<InventoryResponse> =>
    axiosClient.get<InventoryResponse, InventoryResponse>(`/api/inventory/${encodeURIComponent(skuCode)}`),
  adjust: (skuCode: string, adjustmentQuantity: number, operationId: string): Promise<StockOperation> =>
    axiosClient.post<StockOperation,StockOperation>('/api/inventory/adjust', {skuCode,adjustmentQuantity,reason:'Admin adjustment'}, {headers:{'Idempotency-Key':operationId}}),
  operation: (operationId: string): Promise<StockOperation> =>
    axiosClient.get<StockOperation,StockOperation>(`/api/inventory/operations/${encodeURIComponent(operationId)}`),
};
