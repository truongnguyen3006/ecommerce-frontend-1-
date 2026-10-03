'use client';
import { App, Button } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi, type OrderResponse } from '@/services/orderApi';
import { paymentApi, paymentDestination } from '@/services/paymentApi';
import { canCancelOrder, canPayOrder } from '@/lib/order-status';
import { freshAccessToken } from '@/lib/axiosClient';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/store/useAuthStore';

export default function OrderActions({ order }: { order: OrderResponse }) {
  const { user } = useAuthStore(), { modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['order'] }), queryClient.invalidateQueries({ queryKey: ['orders'] }), queryClient.invalidateQueries({ queryKey: ['admin-orders'] }), queryClient.invalidateQueries({ queryKey: ['payment'] })]);
  };
  const cancel = useMutation({
    mutationFn: async () => { await freshAccessToken(); return orderApi.cancelOrder(order.orderNumber, 'Khách hàng hủy đơn'); },
    onSuccess: async () => { message.success('Đã hủy đơn.'); await refresh(); },
    onError: (error) => { message.error(apiErrorMessage(error)); void refresh(); },
  });
  const pay = useMutation({
    mutationFn: async () => { await freshAccessToken(); return paymentApi.createVnpayPayment(order.orderNumber); },
    onSuccess: async (payment) => {
      if (payment.status === 'SUCCESS') { message.info('Thanh toán đã được ghi nhận.'); await refresh(); return; }
      const destination = paymentDestination(payment.paymentUrl);
      if (destination) window.location.assign(destination); else message.error('Chưa có đường dẫn thanh toán hợp lệ.');
    },
    onError: (error) => { message.error(apiErrorMessage(error)); void refresh(); },
  });
  const busy = cancel.isPending || pay.isPending;
  if (!canCancelOrder(order) && !canPayOrder(order, user?.keycloakId)) return null;
  return <div className="order-actions">
    {canPayOrder(order, user?.keycloakId) && <Button type="primary" loading={pay.isPending} disabled={busy} onClick={() => pay.mutate()}>Thanh toán VNPay</Button>}
    {canCancelOrder(order) && <Button loading={cancel.isPending} disabled={busy} onClick={() => modal.confirm({
      title: 'Hủy đơn hàng?', content: 'Đơn sẽ được hủy ở trạng thái hiện tại. Thao tác này không thể hoàn tác.',
      okText: 'Xác nhận hủy', cancelText: 'Giữ đơn', onOk: () => cancel.mutateAsync(),
    })}>Hủy đơn hàng</Button>}
  </div>;
}
