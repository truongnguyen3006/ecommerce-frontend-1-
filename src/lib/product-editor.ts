import type { CreateVariantRequest } from '@/types';
export function skuPart(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D').toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
}
export function validateVariants(variants: CreateVariantRequest[]): string | null {
  if (variants.length > 100) return 'Một sản phẩm có tối đa 100 biến thể.';
  const seen = new Set<string>();
  for (const variant of variants) {
    const sku = variant.skuCode.trim().toLowerCase();
    if (!sku || sku.length > 255 || seen.has(sku)) return 'Mã SKU phải hợp lệ và không trùng.';
    if (!Number.isFinite(variant.price) || variant.price < 0 || !Number.isSafeInteger(variant.initialQuantity) || variant.initialQuantity < 0) return 'Giá và số lượng khởi tạo phải hợp lệ.';
    seen.add(sku);
  }
  return null;
}
