'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/services/orderApi';
import { userManagementApi } from '@/services/userManagementApi';
import { productApi } from '@/services/productApi';
import { formatMoney, formatDate } from '@/lib/format';
import { getOrderStatusMeta } from '@/lib/order-status';
import PageState from '@/components/ui/PageState';
export default function AdminDashboard() {
  const users = useQuery({ queryKey: ['admin-users'], queryFn: userManagementApi.getAll });
  const orders = useQuery({ queryKey: ['admin-orders'], queryFn: orderApi.getAdminOrders });
  const products = useQuery({ queryKey: ['catalog'], queryFn: productApi.getAll });
  const today = new Date().toLocaleDateString('en-CA');
  const completedToday = orders.data?.filter((order) => order.status === 'COMPLETED' && new Date(order.orderDate.replace(' ', 'T')).toLocaleDateString('en-CA') === today);
  const loading = users.isPending || orders.isPending || products.isPending;
  return <section><div className="page-heading"><div><div className="eyebrow">Quản trị</div><h1>Tổng quan</h1><p>Dữ liệu từ danh mục, tài khoản và đơn hàng hiện có.</p></div></div>
    {loading ? <PageState title="Đang tải tổng quan…" /> : users.isError || orders.isError || products.isError ? <PageState title="Chưa thể tải đầy đủ tổng quan" description="Thử tải lại các nguồn dữ liệu." retry={() => { void users.refetch(); void orders.refetch(); void products.refetch(); }} /> :
      <><dl className="admin-stats"><div><dt>Sản phẩm</dt><dd>{products.data.length}</dd></div><div><dt>Tài khoản</dt><dd>{users.data.length}</dd></div><div><dt>Đơn hàng</dt><dd>{orders.data.length}</dd></div></dl>
        <div className="mb-12"><h2>Giá trị đơn hoàn tất hôm nay</h2><p className="text-3xl mt-4">{formatMoney(completedToday?.reduce((sum, order) => sum + order.totalPrice, 0) || 0)}</p><p className="text-sm muted mt-3">Chỉ tính đơn ở trạng thái hoàn tất xử lý; không phải xác nhận giao hàng hay tiền đã thu từ COD.</p></div>
        <div className="section-header"><h2>Đơn gần đây</h2><Link href="/admin/orders" className="text-link text-sm">Xem tất cả</Link></div>
        {!orders.data.length ? <PageState title="Chưa có đơn hàng" /> : <div className="order-list">{[...orders.data].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 5).map((order) => <article key={order.orderNumber} className="order-row"><div className="order-row-header"><div><p className="order-number">{order.orderNumber}</p><p className="text-sm muted mt-2">{formatDate(order.orderDate)}</p></div><div><p>{getOrderStatusMeta(order.status).label}</p><p className="mt-2">{formatMoney(order.totalPrice)}</p></div></div></article>)}</div>}
      </>}
  </section>;
}
