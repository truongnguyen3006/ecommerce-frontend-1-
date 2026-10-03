import type { ProductSearch } from '@/services/productApi';
export const SORT_OPTIONS = [
  ['id,asc', 'Mặc định'], ['id,desc', 'Mới thêm'], ['price,asc', 'Giá tăng dần'], ['price,desc', 'Giá giảm dần'], ['name,asc', 'Tên A–Z'],
];
export function parseProductFilters(params: URLSearchParams): { filters: ProductSearch; error: string | null } {
  const price = (name: string) => {
    const value = params.get(name)?.trim();
    return value ? Number(value) : undefined;
  };
  const minPrice = price('minPrice'), maxPrice = price('maxPrice');
  const invalid = [minPrice, maxPrice].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0));
  const range = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice;
  const pageValue = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue - 1 : 0;
  const requestedSort = params.get('sort') || 'id,asc';
  const sort = SORT_OPTIONS.some(([value]) => value === requestedSort) ? requestedSort : 'id,asc';
  return { filters: {
    keyword: params.get('keyword')?.trim() || params.get('q')?.trim() || undefined,
    category: params.get('category')?.trim() || undefined, color: params.get('color')?.trim() || undefined,
    size: params.get('size')?.trim() || undefined, minPrice, maxPrice, page, pageSize: 12, sort,
  }, error: invalid ? 'Giá phải là số không âm.' : range ? 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.' : null };
}
