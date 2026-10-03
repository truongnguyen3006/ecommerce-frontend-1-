'use client';
import Link from 'next/link';
import { Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { orderApi } from '@/services/orderApi';
import { getOrderStatusMeta } from '@/lib/order-status';
import { formatDate, formatMoney } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api-error';
import AccountNav from '@/components/AccountNav';
import OrderSummary from '@/components/OrderSummary';
import OrderActions from '@/components/OrderActions';
import PageState from '@/components/ui/PageState';

export default function OrdersPage() {
  const userId = useAuthStore((state) => state.user?.keycloakId);
  const query = useQuery({ queryKey: ['orders', userId], queryFn: orderApi.getAllOrders });
  return <div className="app-shell page"><div className="page-heading"><div><h1>Đơn hàng của tôi</h1><p>Lịch sử mua hàng và kết quả xử lý từng đơn.</p></div><Button loading={query.isFetching} onClick={() => void query.refetch()}>Tải lại</Button></div>
    <div className="account-layout"><AccountNav /><section>
      {query.isPending ? <PageState title="Đang tải đơn hàng…" /> : query.isError ? <PageState title="Chưa thể tải đơn hàng" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
        !query.data.length ? <PageState title="Chưa có đơn hàng" description="Đơn mua của bạn sẽ xuất hiện tại đây." actionHref="/products" actionLabel="Khám phá sản phẩm" /> :
          <div className="order-list">{query.data.map((order) => <article key={order.orderNumber} className="order-row">
            <div className="order-row-header"><div><h2 className="order-number">{order.orderNumber}</h2><p className="text-sm muted mt-2">{formatDate(order.orderDate)}</p></div>
              <div><span className="app-status-pill">{getOrderStatusMeta(order.status).label}</span><p className="mt-3">{formatMoney(order.totalPrice)}</p></div></div>
            <p className="text-sm muted mt-4">{order.orderLineItemsList.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm · {order.paymentMethod}</p>
            <details className="mt-6"><summary className="text-link cursor-pointer">Chi tiết sản phẩm & giao hàng</summary><OrderSummary order={order} /></details>
            <div className="order-actions"><Link href={`/checkout/waiting/${order.orderNumber}`} className="app-secondary-btn">Theo dõi đơn hàng</Link></div>
            <OrderActions order={order} />
          </article>)}</div>}
    </section></div>
  </div>;
}
