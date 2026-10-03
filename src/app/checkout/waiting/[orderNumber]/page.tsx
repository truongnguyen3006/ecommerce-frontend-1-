'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { App, Button } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrderTracking } from '@/lib/useOrderTracking';
import { getOrderStatusMeta, getOrderTrackingSteps } from '@/lib/order-status';
import { useAuthStore } from '@/store/useAuthStore';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { paymentApi } from '@/services/paymentApi';
import { cartApi } from '@/services/cartApi';
import { apiErrorMessage, httpStatus } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';
import OrderSummary from '@/components/OrderSummary';
import OrderActions from '@/components/OrderActions';
import PageState from '@/components/ui/PageState';

export default function OrderWaitingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return <TrackedOrder key={orderNumber} orderNumber={orderNumber} />;
}
function TrackedOrder({ orderNumber }: { orderNumber: string }) {
  const userId = useAuthStore((state) => state.user?.keycloakId) || '';
  const receipt = useCheckoutStore((state) => state.attempts[userId]);
  const acceptedHere = receipt?.orderNumber === orderNumber;
  const query = useOrderTracking(orderNumber, acceptedHere);
  const { message } = App.useApp(), queryClient = useQueryClient(), params = useSearchParams();
  const [clearing, setClearing] = useState(false);
  const payment = useQuery({
    queryKey: ['payment', userId, orderNumber], queryFn: () => paymentApi.getPaymentByOrderNumber(orderNumber),
    enabled: query.data?.paymentMethod === 'VNPAY' && query.data?.userId === userId,
    staleTime: 10_000,
    refetchInterval: (state) => state.state.data?.status === 'SUCCESS_PENDING_ORDER' ? 3_000 : false,
  });
  useEffect(() => {
    if (acceptedHere && ['FAILED', 'PAYMENT_FAILED', 'CANCELLED'].includes(query.data?.status || '')) useCheckoutStore.getState().finish(userId);
  }, [acceptedHere, query.data?.status, userId]);
  const clearPurchased = async () => {
    setClearing(true);
    try {
      await freshAccessToken();
      const current = await cartApi.getMine();
      let changed = false;
      for (const item of receipt?.items || []) {
        const line = current.items.find((candidate) => candidate.skuCode === item.skuCode);
        // Retain a line if it changed after submission; never clear new items indiscriminately.
        if (line?.quantity === item.quantity) await cartApi.remove(item.skuCode);
        else if (line) changed = true;
      }
      useCheckoutStore.getState().finish(userId);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      message.info(changed ? 'Đã xóa sản phẩm đã mua. Các dòng có số lượng thay đổi được giữ lại.' : 'Đã cập nhật giỏ hàng.');
    } catch (error) { message.error(apiErrorMessage(error)); }
    finally { setClearing(false); }
  };
  if (!query.valid) return <PageState title="Mã đơn không hợp lệ" actionHref="/orders" actionLabel="Xem đơn hàng" />;
  if (query.isPending || (httpStatus(query.error) === 404 && acceptedHere && !query.paused)) return <div className="app-shell page"><PageState title="Đang ghi nhận đơn hàng" description="Đơn đã được gửi. Hệ thống cần thêm thời gian để cập nhật kết quả." /><Link href="/orders" className="text-link">Xem các đơn của tôi</Link></div>;
  if (query.isError || !query.data) return <div className="app-shell page"><PageState title="Chưa thể tải đơn hàng" description={apiErrorMessage(query.error)} retry={query.refresh} actionHref="/orders" actionLabel="Xem các đơn của tôi" /></div>;
  const order = query.data, meta = getOrderStatusMeta(order.status);
  return <div className="app-shell page"><div className="mx-auto max-w-[900px]"><div className="page-heading"><div><div className="eyebrow">Theo dõi đơn hàng</div><h1>{meta.label}</h1><p className="order-number">Mã đơn: {orderNumber}</p></div>
    <Button onClick={query.refresh} loading={query.isFetching}>Tải lại trạng thái</Button></div>
    <p aria-live="polite">{meta.description}</p>
    {query.paused && !['COMPLETED', 'FAILED', 'PAYMENT_FAILED', 'CANCELLED'].includes(order.status) && <p className="form-error mt-6">Chưa có kết quả cuối cùng. Bấm tải lại để tiếp tục theo dõi.</p>}
    <ol className="order-tracking">{getOrderTrackingSteps(order).map((step) => <li key={step.title} data-state={step.status}><strong>{step.title}</strong><small>{step.description}</small></li>)}</ol>
    {!['COMPLETED', 'FAILED', 'PAYMENT_FAILED', 'CANCELLED'].includes(order.status) && <p className="text-xs muted">{query.connected ? 'Đang nhận cập nhật trực tiếp.' : 'Trạng thái sẽ được tự động kiểm tra lại.'}</p>}
    {params.get('payment') && order.paymentMethod === 'VNPAY' && <p className="form-error mt-6" aria-live="polite">
      {payment.data?.status === 'RECONCILIATION_REQUIRED' ? 'Đã ghi nhận tiền; đơn hàng cần đối soát. Vui lòng liên hệ hỗ trợ.' : payment.data?.status === 'SUCCESS_PENDING_ORDER' ? 'Đã ghi nhận tiền; đang xác nhận quyết định đơn hàng.' : payment.data?.status === 'SUCCESS' ? 'Thanh toán đã được xác nhận từ dịch vụ.' : payment.data?.status === 'FAILED' ? 'Dịch vụ ghi nhận thanh toán thất bại.' : 'Đang kiểm tra kết quả thanh toán. Thông tin hiển thị theo trạng thái từ dịch vụ.'}
    </p>}
    {payment.isError && <p className="text-sm mt-6">Chưa tải được thông tin thanh toán. <button type="button" className="text-link" onClick={() => void payment.refetch()}>Thử lại</button></p>}
    <OrderSummary order={order} /><OrderActions order={order} />
    {order.status === 'COMPLETED' && acceptedHere && <section className="mt-6"><p className="text-sm muted">Sản phẩm đã mua vẫn còn trong giỏ. Bạn có thể xóa các dòng có số lượng khớp với đơn vừa xử lý.</p>
      <div className="order-actions"><Button type="primary" loading={clearing} onClick={() => void clearPurchased()}>Xóa sản phẩm đã mua khỏi giỏ</Button>
        <Button disabled={clearing} onClick={() => useCheckoutStore.getState().finish(userId)}>Giữ giỏ để mua tiếp</Button>
      </div>
    </section>}
    <div className="order-actions"><Link href="/orders" className="app-secondary-btn">Đơn hàng của tôi</Link><Link href="/checkout" className="app-secondary-btn">Xem giỏ hàng</Link></div>
  </div></div>;
}
