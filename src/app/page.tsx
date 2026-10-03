'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ui/ProductImage';
import PageState, { ProductSkeleton } from '@/components/ui/PageState';
import { productApi } from '@/services/productApi';
import { productImage } from '@/lib/catalog';
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function HomePage() {
  // Header and body hydrate in separate Suspense boundaries. A fast shared
  // catalog response must not change the body's initial server snapshot.
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const query = useQuery({ queryKey: ['catalog'], queryFn: productApi.getAll, staleTime: 300_000, enabled: hydrated });
  const products = hydrated ? query.data || [] : [];
  const hero = products[0];
  const categories = Array.from(new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category)))).slice(0, 3);
  return <div className="pb-12">
    <section className="hero"><div className="hero-copy"><div className="eyebrow">Flash Store</div>
      <h1>Lựa chọn cho mỗi ngày.</h1><p>Khám phá danh mục. Chọn màu, kích cỡ và sản phẩm phù hợp với bạn.</p>
      <Link href="/products" className="app-primary-btn">Khám phá sản phẩm</Link>
    </div>{hero && <Link href={`/product/${hero.id}`} className="hero-media" aria-label={`Xem ${hero.name}`}>
      <ProductImage src={productImage(hero)} alt={hero.name} priority sizes="(max-width: 767px) 100vw, 55vw" />
    </Link>}</section>
    <section className="app-shell home-section"><div className="section-header"><h2>Trong danh mục</h2><Link href="/products" className="text-link text-sm">Xem tất cả</Link></div>
      {!hydrated || query.isPending ? <ProductSkeleton count={8} /> : query.isError ? <PageState title="Chưa thể tải sản phẩm" description="Danh mục đang không kết nối được. Hãy thử tải lại." retry={() => void query.refetch()} /> :
        products.length ? <div className="product-grid">{products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}</div> :
          <PageState title="Danh mục chưa có sản phẩm" description="Sản phẩm sẽ xuất hiện khi cửa hàng cập nhật danh mục." />}
    </section>
    {categories.length > 0 && <section className="app-shell home-section"><div className="section-header"><h2>Khám phá theo danh mục</h2></div>
      <div className="category-grid">{categories.map((category) => {
        const product = products.find((item) => item.category === category)!;
        return <Link key={category} href={`/products?category=${encodeURIComponent(category)}`} className="category-tile">
          <div className="product-media"><ProductImage src={productImage(product)} alt={category} sizes="(max-width: 767px) 100vw, 33vw" /></div>
          <div><h3>{category}</h3><span className="text-link text-sm">Khám phá</span></div>
        </Link>;
      })}</div>
    </section>}
  </div>;
}
