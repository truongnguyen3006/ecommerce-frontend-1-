'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, Card, Empty, Modal, Result, Skeleton, Steps, Tag, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { orderApi } from '@/services/orderApi';
import { paymentApi } from '@/services/paymentApi';
import { getOrderStatusMeta, getOrderTrackingSteps } from '@/lib/order-status';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
}

function formatOrderDate(value?: string) {
  if (!value) return 'Đang cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [busyOrderNumber, setBusyOrderNumber] = useState<string | null>(null);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.getAllOrders(),
    enabled: isAuthenticated,
    retry: 0,
  });

  const sortedOrders = useMemo(
    () => [...(orders ?? [])].sort((a, b) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime()),
    [orders],
  );

  const orderStats = useMemo(() => {
    const totalOrders = sortedOrders.length;
    const completedOrders = sortedOrders.filter((order) => ['COMPLETED', 'DELIVERED'].includes(order.status)).length;
    const activeOrders = sortedOrders.filter((order) => !['COMPLETED', 'DELIVERED', 'FAILED', 'PAYMENT_FAILED', 'CANCELLED'].includes(order.status)).length;
    const totalSpent = sortedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    return {
      totalOrders,
      completedOrders,
      activeOrders,
      totalSpent,
    };
  }, [sortedOrders]);

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleCancelOrder = (orderNumber: string) => {
    Modal.confirm({
      title: 'Hủy đơn hàng này?',
      content: 'Đơn đã xác nhận hoặc thanh toán thất bại sẽ được hủy và hoàn lại tồn kho. Thao tác này không thể hoàn tác.',
      okText: 'Xác nhận hủy đơn',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        setBusyOrderNumber(orderNumber);
        try {
          await orderApi.cancelOrder(orderNumber, 'Khách hàng chủ động hủy đơn');
          message.success('Đã hủy đơn hàng thành công.');
          await refreshOrders();
        } catch (error) {
          console.error(error);
          message.error('Không thể hủy đơn hàng này ở trạng thái hiện tại.');
        } finally {
          setBusyOrderNumber(null);
        }
      },
    });
  };

  const handleCreatePayment = async (orderNumber: string) => {
    setBusyOrderNumber(orderNumber);
    try {
      const payment = await paymentApi.createVnpayPayment(orderNumber);
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
        return;
      }
      message.warning('Chưa tạo được đường dẫn thanh toán VNPAY.');
    } catch (error) {
      console.error(error);
      message.error('Không thể tạo giao dịch VNPAY cho đơn hàng này.');
    } finally {
      setBusyOrderNumber(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app-shell animate-fade-in py-8 md:py-10">
        <div className="app-surface px-6 py-10 md:px-8">
          <Result
            status="info"
            title="Đăng nhập để theo dõi đơn hàng"
            subTitle="Sau khi đăng nhập, bạn có thể xem lại lịch sử mua hàng và tiến độ xử lý của từng đơn."
            extra={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/login" className="app-primary-btn">
                  Đăng nhập
                </Link>
                <Link href="/products" className="app-secondary-btn">
                  Tiếp tục mua sắm
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell animate-fade-in py-8 md:py-10">
      <div className="mb-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="app-surface overflow-hidden border-0 bg-[linear-gradient(135deg,#111111_0%,#2b2b31_100%)] px-6 py-7 text-white md:px-8 md:py-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Đơn hàng của tôi</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Quản lý lịch sử mua sắm trong một màn hình</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
            Theo dõi tiến độ từng đơn hàng, địa chỉ giao hàng đã lưu, thanh toán VNPAY nếu cần và hủy đơn trong trạng thái cho phép.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/90">
              <ShoppingCartOutlined /> {orderStats.totalOrders} đơn hàng
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/90">
              <TruckOutlined /> {orderStats.activeOrders} đơn đang xử lý
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/90">
              <CheckCircleOutlined /> {orderStats.completedOrders} đơn hoàn tất
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div className="app-surface p-6">
            <div className="text-sm text-[var(--color-secondary)]">Tổng chi tiêu</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(orderStats.totalSpent)}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-secondary)]">Tổng giá trị các đơn hàng đã ghi nhận trong tài khoản của bạn.</p>
          </div>
          <div className="app-surface p-6">
            <div className="text-sm text-[var(--color-secondary)]">Tiếp tục mua sắm</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">Khám phá thêm sản phẩm mới</div>
            <Link href="/products" className="app-primary-btn mt-4">
              Mở danh mục sản phẩm
            </Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="app-surface border-0">
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="app-surface px-6 py-10">
          <Result status="warning" title="Chưa thể tải danh sách đơn hàng" subTitle="Vui lòng thử lại sau hoặc tải lại trang để đồng bộ dữ liệu mới nhất." />
        </div>
      ) : sortedOrders.length > 0 ? (
        <div className="grid gap-6">
          {sortedOrders.map((order) => {
            const meta = getOrderStatusMeta(order.status);
            const steps = getOrderTrackingSteps(order);
            const processIndex = steps.findIndex((step) => step.status === 'process');
            const errorIndex = steps.findIndex((step) => step.status === 'error');
            const currentStep = processIndex >= 0 ? processIndex : errorIndex >= 0 ? errorIndex : Math.max(meta.step - 1, 0);
            const itemCount = order.orderLineItemsList?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0;
            const canCancel = ['VALIDATED', 'PAYMENT_FAILED'].includes((order.status || '').toUpperCase());
            const canPayOnline = (order.paymentMethod || '').toUpperCase() === 'VNPAY' && ['VALIDATED', 'PAYMENT_FAILED'].includes((order.status || '').toUpperCase());
            const isBusy = busyOrderNumber === order.orderNumber;

            return (
              <Card key={String(order.id || order.orderNumber)} className="app-surface overflow-hidden border-0">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Mã đơn hàng</div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-primary)]">{order.orderNumber}</div>
                      <div className="mt-2 text-sm text-[var(--color-secondary)]">{formatOrderDate(order.orderDate)}</div>
                    </div>

                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Tag color={meta.color} className="!mr-0">{meta.label}</Tag>
                      <div className="text-2xl font-semibold tracking-tight">{formatMoney(order.totalPrice || 0)}</div>
                      <div className="text-sm text-[var(--color-secondary)]">{itemCount} sản phẩm • {(order.paymentMethod || 'COD').toUpperCase()}</div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                        <ClockCircleOutlined /> Tiến độ đơn hàng
                      </div>
                      <Steps current={currentStep} items={steps} responsive />
                      <p className="mt-4 text-sm leading-6 text-[var(--color-secondary)]">{meta.description}</p>
                    </div>

                    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                      <div className="text-sm font-semibold text-[var(--color-primary)]">Thao tác nhanh</div>
                      <div className="mt-4 flex flex-col gap-3">
                        <Link href={`/checkout/waiting/${order.orderNumber}`} className="app-primary-btn w-full">
                          Theo dõi trạng thái
                        </Link>
                        {canPayOnline ? (
                          <Button icon={<CreditCardOutlined />} loading={isBusy} className="!h-11 !rounded-full" onClick={() => void handleCreatePayment(order.orderNumber)}>
                            Thanh toán VNPAY
                          </Button>
                        ) : null}
                        {canCancel ? (
                          <Button danger loading={isBusy} className="!h-11 !rounded-full" onClick={() => handleCancelOrder(order.orderNumber)}>
                            Hủy đơn hàng
                          </Button>
                        ) : null}
                        <Link href="/products" className="app-secondary-btn w-full">
                          Mua lại sản phẩm khác
                        </Link>
                      </div>
                    </div>
                  </div>

                  {(order.shippingAddressLine || order.shippingRecipientName) ? (
                    <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                        <EnvironmentOutlined /> Giao hàng đến
                      </div>
                      <div className="text-sm leading-6 text-[var(--color-secondary)]">
                        <div>{order.shippingRecipientName} • {order.shippingRecipientPhone}</div>
                        <div>{order.shippingAddressLine}</div>
                        {order.shippingAddressLabel ? <div>Nhãn: {order.shippingAddressLabel}</div> : null}
                        {order.cancelReason ? <div className="text-[var(--color-danger)]">Lý do hủy: {order.cancelReason}</div> : null}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                      <ShoppingOutlined /> Sản phẩm trong đơn
                    </div>
                    {order.orderLineItemsList.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {order.orderLineItemsList.map((item) => (
                          <div key={String(item.id || item.skuCode)} className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                            <div className="text-sm font-semibold text-[var(--color-primary)]">{item.productName || 'Sản phẩm'}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-secondary)]">
                              {item.color ? <span className="app-status-pill">{item.color}</span> : null}
                              {item.size ? <span className="app-status-pill">Size {item.size}</span> : null}
                              <span className="app-status-pill">SL {item.quantity}</span>
                            </div>
                            <div className="mt-3 text-sm text-[var(--color-secondary)]">SKU: {item.skuCode || '—'}</div>
                            <div className="mt-2 text-base font-semibold text-[var(--color-primary)]">{formatMoney(item.price * item.quantity)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty description="Chưa có chi tiết sản phẩm" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="app-surface px-6 py-12">
          <Empty image={<ShoppingOutlined className="text-6xl text-[var(--color-muted)]" />} description="Bạn chưa có đơn hàng nào">
            <Link href="/products" className="app-primary-btn">
              Bắt đầu mua sắm
            </Link>
          </Empty>
        </div>
      )}
    </div>
  );
}
