import axiosClient from '@/lib/axiosClient';

export interface InventoryResponse {
  skuCode: string;
  quantity: number;
}

export const inventoryApi = {
  getStock: (skuCode: string) =>
    axiosClient.get<InventoryResponse, InventoryResponse>(`/api/inventory/${skuCode}`),
};
