'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Drawer, Pagination } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import ProductCard from '@/components/ProductCard';
import PageState, { ProductSkeleton } from '@/components/ui/PageState';
import { productApi } from '@/services/productApi';
import { parseProductFilters, SORT_OPTIONS } from '@/lib/product-filters';
import { apiErrorMessage } from '@/lib/api-error';

export default function ProductsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const params = new URLSearchParams(search.toString());
  const { filters, error } = parseProductFilters(params);
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: productApi.getAll, staleTime: 300_000 });
  const categories = Array.from(new Set((catalog.data || []).map((product) => product.category).filter((category): category is string => Boolean(category))));
  const query = useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => productApi.search(filters, signal),
    enabled: !error,
  });
  const navigate = (next: URLSearchParams) => {
    router.push(`/products${next.size ? '?' + next.toString() : ''}`, { scroll: false });
    setOpen(false); setFormError('');
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    const data = new FormData(event.currentTarget);
    data.forEach((value, key) => { if (String(value).trim()) next.set(key, String(value).trim()); });
    if (filters.sort !== 'id,asc') next.set('sort', filters.sort!);
    const parsed = parseProductFilters(next);
    if (parsed.error) { setFormError(parsed.error); return; }
    navigate(next);
  };
  const filterForm = <form key={search.toString()} onSubmit={submit} className="filter-form" aria-label="Bộ lọc sản phẩm">
    <label className="field">Từ khóa<input name="keyword" defaultValue={filters.keyword} placeholder="Tên sản phẩm" maxLength={255} /></label>
    <label className="field">Danh mục{catalog.isError ? <input name="category" defaultValue={filters.category} placeholder="Nhập danh mục" /> :
      <select name="category" defaultValue={filters.category || ''}><option value="">Tất cả</option>
        {filters.category && !categories.includes(filters.category) && <option value={filters.category}>{filters.category}</option>}
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>}</label>
    <fieldset><legend>Khoảng giá (đ)</legend><div className="field-pair">
      <label className="field"><span className="sr-only">Giá tối thiểu</span><input aria-label="Giá tối thiểu" name="minPrice" type="number" min={0} step="any" defaultValue={params.get('minPrice') || ''} placeholder="Từ" /></label>
      <label className="field"><span className="sr-only">Giá tối đa</span><input aria-label="Giá tối đa" name="maxPrice" type="number" min={0} step="any" defaultValue={params.get('maxPrice') || ''} placeholder="Đến" /></label>
    </div></fieldset>
    <label className="field">Màu sắc<input name="color" defaultValue={filters.color} placeholder="Tên màu" maxLength={255} /></label>
    <label className="field">Kích cỡ<input name="size" defaultValue={filters.size} placeholder="Size" maxLength={255} /></label>
    {(formError || error) && <p role="alert" className="text-sm">{formError || error}</p>}
    <button type="submit" className="app-primary-btn">Áp dụng</button>
    <button type="button" className="text-link text-sm" onClick={() => navigate(new URLSearchParams())}>Xóa bộ lọc</button>
  </form>;
  return <div className="app-shell page"><div className="page-heading"><div><div className="eyebrow">Khám phá</div><h1>Sản phẩm</h1></div></div>
    <div className="catalog-toolbar"><p className="filter-count" aria-live="polite">{query.data ? `${query.data.totalElements} sản phẩm` : query.isFetching ? 'Đang tải…' : 'Danh mục sản phẩm'}</p>
      <div className="flex items-center gap-4">
        <button type="button" className="app-secondary-btn mobile-filter-button" aria-label="Lọc" onClick={() => setOpen(true)}><FilterOutlined aria-hidden />Lọc</button>
        <label className="field"><span className="sr-only">Sắp xếp</span><select aria-label="Sắp xếp" value={filters.sort} onChange={(event) => {
          const next = new URLSearchParams(search.toString()); next.set('sort', event.target.value); next.delete('page'); navigate(next);
        }}>{SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </div>
    <div className="catalog-layout"><aside className="catalog-sidebar">{filterForm}</aside><section aria-label="Kết quả sản phẩm">
      {error ? <PageState title="Kiểm tra bộ lọc" description={error} /> : query.isPending ? <ProductSkeleton /> : query.isError ?
        <PageState title="Chưa thể tải sản phẩm" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
        query.data.content.length ? <><div className="product-grid">{query.data.content.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          <div className="mt-12 flex justify-center"><Pagination current={query.data.page + 1} total={query.data.totalElements} pageSize={query.data.size} showSizeChanger={false} onChange={(page) => {
            const next = new URLSearchParams(search.toString()); next.set('page', String(page)); navigate(next); window.scrollTo({ top: 0 });
          }} /></div></> :
          <PageState title="Không tìm thấy sản phẩm" description="Thử đổi từ khóa hoặc xóa một vài bộ lọc." actionHref="/products" actionLabel="Xem toàn bộ" />}
    </section></div>
    <Drawer title="Bộ lọc sản phẩm" width={320} open={open} onClose={() => setOpen(false)} destroyOnHidden>{filterForm}</Drawer>
  </div>;
}
