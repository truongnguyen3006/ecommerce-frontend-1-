'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import { productApi } from '@/services/productApi';
import { formatMoney } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api-error';
import { productImage } from '@/lib/catalog';
import ProductImage from '@/components/ui/ProductImage';
import PageState from '@/components/ui/PageState';
export default function AdminProductDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ['product', id], queryFn: () => productApi.getById(id) });
  if (query.isPending) return <PageState title="Đang tải sản phẩm…" />;
  if (query.isError) return <PageState title="Chưa thể tải sản phẩm" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} />;
  const product = query.data;
  return <section><div className="page-heading"><div><Link href="/admin/products" className="text-link text-sm">Danh sách sản phẩm</Link><h1 className="mt-4">{product.name}</h1><p>{product.category}</p></div><Link href={`/admin/products/edit/${id}`} className="app-primary-btn">Chỉnh sửa</Link></div>
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]"><div className="product-media"><ProductImage src={productImage(product)} alt={product.name} sizes="280px" /></div><div><h2>{formatMoney(product.price)}</h2><p className="muted mt-4">{product.description || 'Chưa có mô tả.'}</p></div></div>
    <div className="mt-8 table-wrap"><Table dataSource={product.variants} rowKey="skuCode" scroll={{ x: 620 }} columns={[
      { title: 'SKU', dataIndex: 'skuCode' }, { title: 'Màu', dataIndex: 'color' }, { title: 'Kích cỡ', dataIndex: 'size' },
      { title: 'Giá', dataIndex: 'price', render: (price: number) => formatMoney(price) },
      { title: 'Trạng thái', dataIndex: 'isActive', render: (active: boolean) => active ? 'Đang bán' : 'Đang ẩn' },
    ]} /></div>
  </section>;
}
