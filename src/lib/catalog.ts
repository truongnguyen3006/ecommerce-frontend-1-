import type { Product } from '@/types';
export const FALLBACK_IMAGE = '/product-placeholder.svg';
export function safeImageSource(value?: string): string {
  const source = value?.trim();
  if (!source) return FALLBACK_IMAGE;
  if (source.startsWith('/') && !source.startsWith('//') && !source.includes('\\')) return source;
  try {
    const url = new URL(source);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch { /* Invalid URLs use the local placeholder. */ }
  return FALLBACK_IMAGE;
}
export function productImage(product: Product): string {
  return product.imageUrl || product.variants?.find((variant) => variant.isActive !== false && variant.imageUrl)?.imageUrl || FALLBACK_IMAGE;
}
