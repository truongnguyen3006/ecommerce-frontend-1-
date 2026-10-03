'use client';
import Link from 'next/link';
import { App, Button, Popconfirm, Table } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import type { Product } from '@/types';
import { formatMoney } from '@/lib/format';
import { productImage } from '@/lib/catalog';
import { apiErrorMessage } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';
import PageState from '@/components/ui/PageState';
import ProductImage from '@/components/ui/ProductImage';
export default function AdminProductList() {
  const query = useQuery({ queryKey: ['catalog'], queryFn: productApi.getAll }), queryClient = useQueryClient(), { message } = App.useApp();
  const remove = useMutation({
    mutationFn: async (id: number) => { await freshAccessToken(); await productApi.delete(id); },
    onSuccess: async () => { message.success('Đã xóa sản phẩm.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['catalog'] }), queryClient.invalidateQueries({ queryKey: ['products'] }), queryClient.invalidateQueries({ queryKey: ['product'] }), queryClient.invalidateQueries({ queryKey: ['sku'] })]); },
    onError: (error) => message.error(apiErrorMessage(error)),
  });
  return <div><div className="page-heading"><div><h1>Sản phẩm</h1><p>Danh mục, giá và biến thể đang có trong hệ thống.</p></div><Link href="/admin/products/create" className="app-primary-btn">Thêm sản phẩm</Link></div>
    {query.isError ? <PageState title="Chưa thể tải sản phẩm" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
      <div className="table-wrap"><Table<Product> dataSource={query.data || []} loading={query.isPending} rowKey="id" scroll={{ x: 760 }} pagination={{ pageSize: 10 }} locale={{ emptyText: 'Chưa có sản phẩm' }} columns={[
        { title: 'Sản phẩm', width: 320, render: (_, product) => <div className="flex items-center gap-4"><div className="product-media w-16 shrink-0"><ProductImage src={productImage(product)} alt={product.name} sizes="64px" /></div><div><Link href={`/admin/products/${product.id}`} className="text-link">{product.name}</Link><p className="text-sm muted">{product.category}</p></div></div> },
        { title: 'Giá niêm yết', dataIndex: 'price', render: (value: number) => formatMoney(value) },
        { title: 'Biến thể', render: (_, product) => product.variants.length },
        { title: 'Thao tác', width: 210, render: (_, product) => <div className="flex gap-3"><Link href={`/admin/products/edit/${product.id}`} className="text-link">Chỉnh sửa</Link>
          <Popconfirm title="Xóa sản phẩm?" description="Các biến thể của sản phẩm cũng sẽ bị xóa." okText="Xóa" cancelText="Hủy" onConfirm={() => remove.mutateAsync(product.id)}><Button disabled={remove.isPending} aria-label={`Xóa ${product.name}`}>Xóa</Button></Popconfirm></div> },
      ]} /></div>}
  </div>;
}
