'use client';
import { useQueries } from '@tanstack/react-query';
import ProductCard from '@/components/ProductCard';
import PageState, { ProductSkeleton } from '@/components/ui/PageState';
import { useWishlistStore } from '@/store/useWishlistStore';
import { productApi } from '@/services/productApi';
export default function WishlistPage() {
  const { ids, toggle, hasHydrated } = useWishlistStore();
  const queries = useQueries({ queries: ids.map((id) => ({ queryKey: ['product', String(id)], queryFn: () => productApi.getById(id) })) });
  return <div className="app-shell page"><div className="page-heading"><div><h1>Yêu thích</h1><p>Danh sách được lưu trên trình duyệt này, chưa đồng bộ với tài khoản.</p></div></div>
    {!hasHydrated ? <ProductSkeleton count={2} /> : !ids.length ? <PageState title="Chưa có sản phẩm yêu thích" description="Lưu sản phẩm từ trang chi tiết để xem lại tại đây." actionHref="/products" actionLabel="Khám phá sản phẩm" /> :
      <div className="product-grid">{queries.map((query, index) => <div key={ids[index]}>
        {query.isPending ? <div className="product-media" role="status" aria-label="Đang tải sản phẩm" /> : query.data ? <ProductCard product={query.data} /> :
          <PageState title="Sản phẩm chưa sẵn sàng" retry={() => void query.refetch()} />}
        <button type="button" className="text-link text-sm mt-4" aria-label={`Bỏ yêu thích ${query.data?.name || ids[index]}`} onClick={() => toggle(ids[index])}>Bỏ lưu</button>
      </div>)}</div>}
  </div>;
}
