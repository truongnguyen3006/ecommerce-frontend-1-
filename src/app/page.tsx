'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Result, Skeleton } from 'antd';
import ProductCard from '@/components/ProductCard';
import { productApi } from '@/services/productApi';
import { Product } from '@/types';

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="app-surface overflow-hidden p-4">
          <Skeleton.Image active className="!h-[320px] !w-full !rounded-[24px]" />
          <Skeleton active paragraph={{ rows: 3 }} title={{ width: '70%' }} className="mt-5" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data: products, isLoading, isError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const highlightedProducts = useMemo(() => products?.slice(0, 6) ?? [], [products]);
  const categories = useMemo(() => {
    const source = products ?? [];
    return Array.from(new Set(source.map((item) => item.category?.trim()).filter((value): value is string => Boolean(value)))).slice(0, 4);
  }, [products]);

  return (
    <div className="animate-fade-in pb-20 pt-8 md:pt-10">
      <section className="app-shell">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="app-surface overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(17,17,17,0.08),_transparent_42%),linear-gradient(135deg,#fff_0%,#f7f7f7_100%)] px-6 py-8 md:px-10 md:py-12">
            <div className="max-w-2xl">
              <span className="app-status-pill">New arrivals • theo dõi đơn hàng trực quan</span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--color-primary)] md:text-6xl">
                Chọn nhanh sản phẩm phù hợp và theo dõi đơn hàng rõ ràng hơn.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-secondary)] md:text-lg">
                Flash Store tập trung vào những gì người mua cần nhất: danh mục dễ lọc, chi tiết sản phẩm rõ ràng, giỏ hàng gọn và trạng thái đơn hàng dễ nắm bắt.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="app-primary-btn">
                  Mua sắm ngay
                </Link>
                <Link href="/orders" className="app-secondary-btn">
                  Theo dõi đơn hàng
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="app-surface px-6 py-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Danh mục nổi bật</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(categories.length > 0 ? categories : ['Nam', 'Nữ', 'Phụ kiện']).map((category) => (
                  <Link
                    key={category}
                    href={`/products?category=${encodeURIComponent(category)}`}
                    className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
            <div className="app-surface px-6 py-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Lý do khách hàng quay lại</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-secondary)]">
                <li>• Danh mục dễ lọc theo nhu cầu.</li>
                <li>• Giỏ hàng và thanh toán rõ ràng trên mọi màn hình.</li>
                <li>• Có khu vực theo dõi đơn hàng với thanh tiến độ trực quan.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="app-shell mt-14">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="app-section-title">Sản phẩm mới nhất</h2>
            <p className="app-section-subtitle">Khám phá các lựa chọn nổi bật đang có trong hệ thống.</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70">
            Xem toàn bộ danh mục
          </Link>
        </div>

        {isLoading ? (
          <ProductGridSkeleton />
        ) : isError ? (
          <div className="app-surface px-6 py-10">
            <Result status="500" title="Không thể tải danh sách sản phẩm" subTitle="Vui lòng thử lại sau hoặc kiểm tra kết nối hệ thống." />
          </div>
        ) : highlightedProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {highlightedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="app-surface px-6 py-14 text-center">
            <h3 className="text-xl font-semibold">Chưa có sản phẩm để hiển thị</h3>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">Danh sách sản phẩm sẽ xuất hiện tại đây khi có dữ liệu.</p>
          </div>
        )}
      </section>
    </div>
  );
}
