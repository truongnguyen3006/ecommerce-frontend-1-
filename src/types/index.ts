export interface ProductVariant {
  skuCode: string; color: string; size: string; price: number; imageUrl: string;
  galleryImages: string[]; isActive: boolean;
}
export interface Product {
  id: number; revision: number; name: string; description?: string; price: number;
  category?: string; imageUrl?: string; variants: ProductVariant[];
}
export interface ProductPage { content: Product[]; page: number; size: number; totalElements: number; totalPages: number }
export interface CatalogItem {
  skuCode: string; name: string; price: number; imageUrl?: string; color?: string; size?: string; isActive: boolean;
}
export interface CartItem {
  revision?: string; id?: number; skuCode: string; quantity: number; productName: string; imageUrl?: string; price: number }
export interface Cart { userId: string; items: CartItem[] }
export interface CreateVariantRequest {
  skuCode: string; color: string; size: string; price: number; imageUrl: string;
  galleryImages: string[]; initialQuantity: number; isActive: boolean;
}
export interface CreateProductRequest {
  revision?: number;
  name: string; description: string; category: string; basePrice: number;
  imageUrl: string; variants: CreateVariantRequest[];
}
