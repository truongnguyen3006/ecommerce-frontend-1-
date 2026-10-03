'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { apiErrorMessage } from '@/lib/api-error';
import ProductEditor from '@/components/admin/ProductEditor';
import PageState from '@/components/ui/PageState';
export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ['product', id], queryFn: () => productApi.getById(id) });
  if (query.isPending) return <PageState title="Đang tải sản phẩm…" />;
  if (query.isError) return <PageState title="Chưa thể tải sản phẩm" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} />;
  return <ProductEditor key={id} product={query.data} />;
}
