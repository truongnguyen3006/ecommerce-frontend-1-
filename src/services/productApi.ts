import axiosClient from '@/lib/axiosClient';
import type { Product, ProductPage, CreateProductRequest, CatalogItem } from '@/types';

export interface ProductSearch {
  keyword?: string; category?: string; minPrice?: number; maxPrice?: number;
  color?: string; size?: string; page?: number; pageSize?: number; sort?: string;
}
export const productApi = {
  getAll: (): Promise<Product[]> => axiosClient.get<Product[], Product[]>('/api/product'),
  search: (params: ProductSearch, signal?: AbortSignal): Promise<ProductPage> =>
    axiosClient.get<ProductPage, ProductPage>('/api/product/search', { params, signal }),
  getById: (id: number | string): Promise<Product> => axiosClient.get<Product, Product>(`/api/product/${encodeURIComponent(id)}`),
  getSku: (sku: string): Promise<CatalogItem> => axiosClient.get<CatalogItem, CatalogItem>(`/api/product/sku/${encodeURIComponent(sku)}`),
  create: (data: CreateProductRequest): Promise<Product> => axiosClient.post<Product, Product>('/api/product', data),
  update: (id: number | string, data: Partial<CreateProductRequest>): Promise<Product> => axiosClient.put<Product, Product>(`/api/product/${id}`, data),
  delete: (id: number | string): Promise<void> => axiosClient.delete<void, void>(`/api/product/${id}`),
};
