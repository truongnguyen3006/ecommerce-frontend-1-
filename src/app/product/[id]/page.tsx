'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import { productApi } from '@/services/productApi';
import { inventoryApi } from '@/services/inventoryApi';
import { cartApi } from '@/services/cartApi';
import { useAuthStore } from '@/store/useAuthStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import ProductImage from '@/components/ui/ProductImage';
import QuantityStepper from '@/components/ui/QuantityStepper';
import PageState, { ProductSkeleton } from '@/components/ui/PageState';
import { formatMoney } from '@/lib/format';
import { facetLabel, facetKey, facetLabels } from '@/lib/facets';
import { FALLBACK_IMAGE } from '@/lib/catalog';
import { apiErrorMessage, httpStatus } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetail key={id} id={id} />;
}
function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { isAuthenticated } = useAuthStore();
  const wishlist = useWishlistStore();
  const [color, setColor] = useState<string | null>(null);
  const [sku, setSku] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const query = useQuery({ queryKey: ['product', id], queryFn: () => productApi.getById(id), enabled: /^\d+$/.test(id) });
  const product = query.data;
  const variants = useMemo(() => (product?.variants || []).filter((variant) => variant.isActive !== false), [product?.variants]);
  const colors = [...facetLabels(variants.map((variant) => variant.color)), ...(variants.some((variant) => !facetKey(variant.color)) ? [''] : [])];
  const selectedColor = color ?? colors[0];
  const options = variants.filter((variant) => facetKey(variant.color) === facetKey(selectedColor || ''));
  const stocks = useQueries({ queries: options.map((variant) => ({
    queryKey: ['stock', variant.skuCode], queryFn: () => inventoryApi.getStock(variant.skuCode), staleTime: 15_000,
  })) });
  const currentVariant = options.find((variant) => variant.skuCode === sku);
  const stockQuery = stocks[options.findIndex((variant) => variant.skuCode === sku)];
  const stock = stockQuery?.data?.quantity;
  const safeQuantity = stock !== undefined && stock > 0 ? Math.min(quantity, stock) : quantity;
  const representative = currentVariant || options[0];
  const gallery = Array.from(new Set([...(representative?.galleryImages || []), representative?.imageUrl, product?.imageUrl].filter((source): source is string => Boolean(source))));
  if (!gallery.length) gallery.push(FALLBACK_IMAGE);
  const add = useMutation({
    mutationFn: async () => {
      await freshAccessToken();
      if (!useAuthStore.getState().isAuthenticated) throw new Error('Session expired');
      await cartApi.add(currentVariant!.skuCode, safeQuantity);
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['cart'] }); message.success('Đã thêm vào giỏ hàng.'); },
    onError: (error) => {
      message.error(apiErrorMessage(error));
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
  if (!/^\d+$/.test(id) || httpStatus(query.error) === 404) return <PageState title="Không tìm thấy sản phẩm" actionHref="/products" actionLabel="Xem sản phẩm" />;
  if (query.isPending) return <div className="app-shell page"><ProductSkeleton count={2} /></div>;
  if (query.isError || !product) return <PageState title="Chưa thể tải sản phẩm" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} />;
  const selectedImage = Math.min(imageIndex, gallery.length - 1);
  return <div className="app-shell page"><div className="mb-6 text-sm muted"><Link href="/products" className="text-link">Sản phẩm</Link>{product.category && <> / {product.category}</>}</div>
    <div className="detail-layout"><section className="detail-gallery" aria-label="Ảnh sản phẩm">
      <div className="gallery-thumbs">{gallery.map((image, index) => <button key={image} type="button" aria-label={`Ảnh ${index + 1}`} aria-pressed={selectedImage === index} onClick={() => setImageIndex(index)}>
        <ProductImage src={image} alt={`${product.name} — ảnh ${index + 1}`} sizes="80px" />
      </button>)}</div>
      <div className="gallery-main"><ProductImage src={gallery[selectedImage]} alt={product.name} priority sizes="(max-width: 767px) 100vw, 55vw" /></div>
    </section><section className="detail-copy"><h1>{product.name}</h1><p className="muted mt-2">{product.category}</p>
      <div className="price">{formatMoney(currentVariant?.price ?? product.price)}</div>
      {variants.length ? <>
        <fieldset><legend>Màu sắc: {selectedColor || 'Chưa chọn'}</legend><div className="variant-colors">{colors.map((value) => {
          const variant = variants.find((item) => facetKey(item.color) === facetKey(value))!;
          return <button key={value} type="button" aria-pressed={selectedColor === value} aria-label={`Màu ${value || 'không ghi nhãn'}`} onClick={() => { setColor(value); setSku(null); setQuantity(1); setImageIndex(0); }}>
            <div className="product-media"><ProductImage src={variant.imageUrl || product.imageUrl} alt="" sizes="80px" /></div><span>{value || 'Không ghi nhãn'}</span>
          </button>;
        })}</div></fieldset>
        <fieldset><legend>Kích cỡ</legend><div className="variant-sizes">{options.map((variant, index) => <button key={variant.skuCode} type="button"
          aria-pressed={sku === variant.skuCode} aria-label={`Size ${facetLabel(variant.size)}${stocks[index].data?.quantity === 0 ? ' — hết hàng' : ''}`}
          disabled={stocks[index].data?.quantity === 0} onClick={() => { setSku(variant.skuCode); setQuantity(1); }}>
          {facetLabel(variant.size) || 'Một cỡ'}{stocks[index].data?.quantity === 0 && <span className="sr-only">Hết hàng</span>}
        </button>)}</div></fieldset>
        <div className="detail-stock" aria-live="polite">{!currentVariant ? 'Chọn kích cỡ để kiểm tra tồn kho.' : stockQuery?.isPending ? 'Đang kiểm tra tồn kho…' :
          stockQuery?.isError ? <><span>Chưa thể kiểm tra tồn kho. </span><button type="button" className="text-link" onClick={() => void stockQuery.refetch()}>Thử lại</button></> :
          stock === 0 ? 'Hết hàng ở kích cỡ này.' : `Còn ${stock} sản phẩm.`}</div>
        <div className="mt-4"><QuantityStepper value={safeQuantity} max={stock} onChange={setQuantity} disabled={!stock || add.isPending} /></div>
      </> : <p className="mt-6">Sản phẩm hiện chưa có biến thể có thể đặt.</p>}
      <div className="detail-actions"><button type="button" className="app-primary-btn" disabled={!currentVariant || !stock || stockQuery?.isError || add.isPending}
        onClick={() => isAuthenticated ? add.mutate() : router.push(`/login?next=${encodeURIComponent('/product/' + id)}`)}>
        {add.isPending ? 'Đang thêm…' : !currentVariant ? 'Chọn kích cỡ' : stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
      </button><button type="button" className="app-secondary-btn" aria-pressed={wishlist.ids.includes(product.id)} onClick={() => wishlist.toggle(product.id)}>
        {wishlist.ids.includes(product.id) ? <HeartFilled /> : <HeartOutlined />}{wishlist.ids.includes(product.id) ? 'Đã lưu yêu thích' : 'Lưu yêu thích'}
      </button></div>
      <p className="text-xs muted mt-3">Yêu thích được lưu trên trình duyệt này.</p>
      <section className="detail-description"><h2>Mô tả sản phẩm</h2><p>{product.description?.trim() || 'Chưa có mô tả từ cửa hàng.'}</p></section>
    </section></div>
  </div>;
}
