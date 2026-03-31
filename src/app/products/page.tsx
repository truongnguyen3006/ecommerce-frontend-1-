'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Empty, Input, Select, Skeleton } from 'antd';
import ProductCard from '@/components/ProductCard';
import { productApi } from '@/services/productApi';
import { Product } from '@/types';

export default function ProductsPage() {
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('category') || 'Tất cả';
  const initialKeyword = searchParams.get('q') || '';
  const pageKey = searchParams.toString();

  return (
    <ProductsCatalog
      key={pageKey}
      initialCategory={initialCategory}
      initialKeyword={initialKeyword}
    />
  );
}

function ProductsCatalog({
  initialCategory,
  initialKeyword,
}: {
  initialCategory: string;
  initialKeyword: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products-catalog'],
    queryFn: () => productApi.getAll(),
  });

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        (products ?? [])
          .map((item) => item.category?.trim())
          .filter(Boolean),
      ),
    ) as string[];

    return ['Tất cả', ...values];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (products ?? []).filter((product) => {
      const matchesCategory =
        selectedCategory === 'Tất cả' ||
        product.category?.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesKeyword =
        !normalizedKeyword ||
        product.name.toLowerCase().includes(normalizedKeyword) ||
        product.description?.toLowerCase().includes(normalizedKeyword) ||
        product.category?.toLowerCase().includes(normalizedKeyword);

      return matchesCategory && matchesKeyword;
    });
  }, [keyword, products, selectedCategory]);

  return (
    <div className="app-shell animate-fade-in py-8 md:py-10">
      <div className="app-surface px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Danh mục sản phẩm
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Tất cả sản phẩm
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-secondary)] md:text-base">
              Tìm kiếm nhanh theo tên sản phẩm, mô tả hoặc danh mục để rút ngắn thời gian ra quyết định mua hàng.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:w-[420px] md:flex-row">
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên sản phẩm"
              allowClear
            />
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categories.map((item) => ({ label: item, value: item }))}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="app-surface p-4">
                <Skeleton.Image active className="!h-[320px] !w-full !rounded-[24px]" />
                <Skeleton active paragraph={{ rows: 3 }} className="mt-4" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="app-surface px-6 py-14">
            <Empty description="Không tìm thấy sản phẩm phù hợp" />
          </div>
        )}
      </div>
    </div>
  );
}