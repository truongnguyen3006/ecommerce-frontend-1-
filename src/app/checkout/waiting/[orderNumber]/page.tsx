'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Button, Card, Result, Steps, Tag, Typography, message } from 'antd';
import {
  CreditCardOutlined,
  HomeOutlined,
  ReloadOutlined,
  SyncOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { orderApi, type OrderResponse } from '@/services/orderApi';
import { paymentApi, type PaymentTransactionResponse } from '@/services/paymentApi';
import { getOrderStatusMeta, getOrderTrackingSteps } from '@/lib/order-status';

const { Text, Title } = Typography;

type OrderStatus =
  | 'PENDING'
  | 'VALIDATED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAYMENT_FAILED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CREATED'
  | 'PAID'
  | 'DELIVERED';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
type SyncSource = 'api' | 'realtime' | 'initial';

const TERMINAL_STATUSES = new Set<OrderStatus>(['COMPLETED', 'FAILED', 'PAYMENT_FAILED', 'CANCELLED', 'DELIVERED']);
const POLLING_INTERVAL_MS = 3000;
const STALE_RECHECK_MS = 12000;

interface NotificationMessage {
  status: OrderStatus;
  message: string;
}

function getCurrentStepIndex(status: string, steps: ReturnType<typeof getOrderTrackingSteps>) {
  const processIndex = steps.findIndex((step) => step.status === 'process');
  if (processIndex >= 0) return processIndex;

  const errorIndex = steps.findIndex((step) => step.status === 'error');
  if (errorIndex >= 0) return errorIndex;

  const lastFinishedIndex = [...steps].reverse().findIndex((step) => step.status === 'finish');
  if (lastFinishedIndex >= 0) {
    return steps.length - 1 - lastFinishedIndex;
  }

  return status === 'COMPLETED' ? steps.length - 1 : 0;
}

function getConnectionTag(state: ConnectionState) {
  switch (state) {
    case 'connected':
      return (
        <Tag color="green" icon={<WifiOutlined />}>
          Đã kết nối realtime
        </Tag>
      );
    case 'reconnecting':
      return (
        <Tag color="gold" icon={<SyncOutlined spin />}>
          Đang kết nối lại
        </Tag>
      );
    case 'disconnected':
      return <Tag>Đã ngắt kết nối</Tag>;
    default:
      return (
        <Tag color="blue" icon={<SyncOutlined spin />}>
          Đang thiết lập kết nối
        </Tag>
      );
  }
}

function isTerminalStatus(status: OrderStatus) {
  return TERMINAL_STATUSES.has(status);
}

export default function OrderWaitingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = params.orderNumber as string;

  const stompClientRef = useRef<Client | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const watchdogTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const inflightStatusRef = useRef(false);
  const latestStatusRef = useRef<OrderStatus>('PENDING');

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastSyncSource, setLastSyncSource] = useState<SyncSource>('initial');
  const [isPollingSync, setIsPollingSync] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentTransactionResponse | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const status = (order?.status || 'PENDING') as OrderStatus;
  const trackingSteps = useMemo(() => getOrderTrackingSteps({ status } as Pick<OrderResponse, 'status'>), [status]);
  const currentStepIndex = useMemo(() => getCurrentStepIndex(status, trackingSteps), [status, trackingSteps]);
  const meta = useMemo(() => getOrderStatusMeta(status), [status]);
  const paymentMethod = (order?.paymentMethod || 'COD').toUpperCase();
  const needsOnlinePayment = paymentMethod === 'VNPAY' && (status === 'VALIDATED' || status === 'PAYMENT_FAILED');

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      message.success('Thanh toán VNPAY thành công. Đơn hàng sẽ được cập nhật trong giây lát.');
    }
    if (searchParams.get('payment') === 'failed') {
      message.error('Thanh toán VNPAY chưa thành công hoặc đã bị hủy.');
    }
  }, [searchParams]);

  useEffect(() => {
    latestStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!orderNumber) return;

    const clearPollingInterval = () => {
      if (pollingIntervalRef.current !== null) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const clearWatchdogTimeout = () => {
      if (watchdogTimeoutRef.current !== null) {
        window.clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = null;
      }
    };

    const applyOrder = (data: OrderResponse, source: SyncSource) => {
      if (!mountedRef.current) return;
      latestStatusRef.current = (data.status || 'PENDING') as OrderStatus;
      setOrder(data);
      setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
      setLastSyncSource(source);
    };

    const syncPaymentInfo = async (data: OrderResponse) => {
      if ((data.paymentMethod || '').toUpperCase() !== 'VNPAY') {
        setPaymentInfo(null);
        return;
      }
      try {
        const payment = await paymentApi.getPaymentByOrderNumber(orderNumber);
        setPaymentInfo(payment);
      } catch {
        setPaymentInfo(null);
      }
    };

    const fetchStatus = async (source: SyncSource = 'api') => {
      if (!orderNumber || inflightStatusRef.current) return;
      if (isTerminalStatus(latestStatusRef.current) && source !== 'initial') return;

      inflightStatusRef.current = true;
      if (source === 'api') {
        setIsPollingSync(true);
      }

      try {
        const data = await orderApi.getOrderById(orderNumber);
        if (!data?.status) return;
        applyOrder(data, source);
        await syncPaymentInfo(data);
      } catch (error) {
        console.error('Không thể đồng bộ trạng thái đơn hàng:', error);
      } finally {
        inflightStatusRef.current = false;
        if (source === 'api' && mountedRef.current) {
          setIsPollingSync(false);
        }
      }
    };

    const scheduleWatchdog = () => {
      clearWatchdogTimeout();
      if (isTerminalStatus(latestStatusRef.current)) return;
      watchdogTimeoutRef.current = window.setTimeout(() => {
        if (!isTerminalStatus(latestStatusRef.current)) {
          void fetchStatus('api');
        }
      }, STALE_RECHECK_MS);
    };

    const startPolling = () => {
      clearPollingInterval();
      pollingIntervalRef.current = window.setInterval(() => {
        if (isTerminalStatus(latestStatusRef.current)) {
          clearPollingInterval();
          return;
        }
        void fetchStatus('api');
      }, POLLING_INTERVAL_MS);
    };

    const connectWebSocket = () => {
      if (stompClientRef.current?.active) return;

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8087/ws';
      setConnectionState('connecting');

      const client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        reconnectDelay: 5000,
        onConnect: () => {
          setConnectionState('connected');
          client.subscribe(`/topic/order/${orderNumber}`, (event) => {
            if (!event.body) return;
            try {
              const notification = JSON.parse(event.body) as NotificationMessage;
              if (mountedRef.current) {
                setOrder(
                  (prev) =>
                    ({
                      ...(prev ?? { orderNumber, orderLineItemsList: [], totalPrice: 0, orderDate: '', id: orderNumber }),
                      status: notification.status,
                    }) as OrderResponse,
                );
                latestStatusRef.current = notification.status;
                setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
                setLastSyncSource('realtime');
              }
              if (isTerminalStatus(notification.status)) {
                clearPollingInterval();
                clearWatchdogTimeout();
              } else {
                scheduleWatchdog();
              }
              void fetchStatus('api');
            } catch (error) {
              console.error('Không parse được notification realtime:', error);
            }
          });

          void fetchStatus('api');
          scheduleWatchdog();
        },
        onWebSocketClose: () => {
          setConnectionState('reconnecting');
          scheduleWatchdog();
        },
        onStompError: () => {
          setConnectionState('reconnecting');
          scheduleWatchdog();
        },
        onDisconnect: () => {
          setConnectionState('disconnected');
        },
      });

      client.activate();
      stompClientRef.current = client;
    };

    void fetchStatus('initial');
    connectWebSocket();
    startPolling();
    scheduleWatchdog();

    return () => {
      clearPollingInterval();
      clearWatchdogTimeout();
      if (stompClientRef.current?.active) {
        setConnectionState('disconnected');
        void stompClientRef.current.deactivate();
      }
      stompClientRef.current = null;
    };
  }, [orderNumber]);

  const handleCreatePayment = async () => {
    setIsCreatingPayment(true);
    try {
      const payment = await paymentApi.createVnpayPayment(orderNumber);
      setPaymentInfo(payment);
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
        return;
      }
      message.warning('Chưa tạo được đường dẫn thanh toán VNPAY.');
    } catch (error) {
      console.error(error);
      message.error('Không thể khởi tạo thanh toán VNPAY cho đơn hàng này.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const syncHint = lastSyncedAt
    ? `Đồng bộ gần nhất: ${lastSyncedAt}${lastSyncSource === 'realtime' ? ' • realtime' : ' • API/polling'}`
    : 'Đang khởi tạo trạng thái đơn hàng';

  const isFailure = ['FAILED', 'PAYMENT_FAILED', 'CANCELLED'].includes(status);

  if (status === 'COMPLETED' || status === 'DELIVERED') {
    return (
      <div className="app-shell animate-fade-in py-10">
        <Card className="app-surface border-0">
          <Result
            status="success"
            title={<span className="text-3xl font-semibold tracking-tight">Đơn hàng đã hoàn tất</span>}
            subTitle={`Mã đơn hàng ${orderNumber} đã được xử lý thành công.`}
            extra={
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="primary"
                  size="large"
                  className="!bg-[var(--color-primary)] !shadow-none"
                  onClick={() => router.push('/products')}
                >
                  Tiếp tục mua sắm
                </Button>
                <Button size="large" onClick={() => router.push('/orders')}>
                  Xem đơn hàng của tôi
                </Button>
              </div>
            }
          />
          <div className="space-y-4 px-6 pb-8 md:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {getConnectionTag(connectionState)}
              <Tag color="blue">{syncHint}</Tag>
            </div>
            <Steps current={trackingSteps.length - 1} items={trackingSteps} responsive />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-shell animate-fade-in py-10">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="app-surface border-0 overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-6 py-6 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Theo dõi đơn hàng
                </div>
                <Title level={2} className="!mb-2 !mt-2 !font-semibold !tracking-tight">
                  {orderNumber}
                </Title>
                <Text className="text-[var(--color-secondary)]">{meta.description}</Text>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {getConnectionTag(connectionState)}
                <Tag color={meta.color}>{meta.label}</Tag>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 md:px-8">
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--color-primary)]">Tiến độ đơn hàng</div>
                <Tag color="blue">{syncHint}</Tag>
              </div>
              <Steps current={currentStepIndex} items={trackingSteps} responsive />
              {isPollingSync ? (
                <div className="mt-3 text-xs text-[var(--color-muted)]">Hệ thống đang đồng bộ thêm bằng API…</div>
              ) : null}
            </div>

            {order?.shippingAddressLine ? (
              <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                <div className="text-sm font-semibold text-[var(--color-primary)]">Thông tin giao hàng</div>
                <div className="mt-3 space-y-1 text-sm text-[var(--color-secondary)]">
                  <div>
                    {order.shippingRecipientName} • {order.shippingRecipientPhone}
                  </div>
                  <div>{order.shippingAddressLine}</div>
                  {order.shippingAddressLabel ? <div>Nhãn địa chỉ: {order.shippingAddressLabel}</div> : null}
                </div>
              </div>
            ) : null}

            {paymentMethod === 'VNPAY' ? (
              <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-primary)]">Thanh toán trực tuyến</div>
                    <div className="mt-1 text-sm text-[var(--color-secondary)]">
                      {paymentInfo?.status === 'SUCCESS'
                        ? 'Giao dịch VNPAY đã hoàn tất.'
                        : needsOnlinePayment
                          ? 'Đơn hàng đã sẵn sàng. Bạn có thể tiếp tục thanh toán VNPAY ngay bây giờ.'
                          : 'Hệ thống sẽ mở thanh toán VNPAY sau khi đơn hàng vượt qua bước kiểm tra tồn kho.'}
                    </div>
                  </div>
                  <Tag color={paymentInfo?.status === 'SUCCESS' ? 'green' : 'blue'}>{paymentInfo?.status || 'PENDING'}</Tag>
                </div>

                {needsOnlinePayment ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="primary"
                      icon={<CreditCardOutlined />}
                      loading={isCreatingPayment}
                      className="!bg-[var(--color-primary)] !shadow-none"
                      onClick={handleCreatePayment}
                    >
                      Thanh toán VNPAY ngay
                    </Button>
                    {paymentInfo?.paymentUrl ? (
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          window.location.href = paymentInfo.paymentUrl || '';
                        }}
                      >
                        Mở lại link thanh toán
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isFailure ? (
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-secondary)]">
                {status === 'CANCELLED'
                  ? 'Đơn hàng đã được hủy. Bạn có thể quay lại danh sách sản phẩm để tạo đơn mới.'
                  : 'Đơn hàng chưa thể hoàn tất. Bạn có thể kiểm tra lại đơn hoặc thử thanh toán lại nếu đang dùng VNPAY.'}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="app-surface border-0">
          <Result
            status={status === 'VALIDATED' ? 'info' : isFailure ? 'error' : 'info'}
            title={status === 'VALIDATED' && paymentMethod === 'VNPAY' ? 'Đơn hàng đã sẵn sàng để thanh toán' : meta.label}
            subTitle={meta.description}
            extra={
              <div className="flex flex-wrap justify-center gap-3">
                {needsOnlinePayment ? (
                  <Button
                    type="primary"
                    icon={<CreditCardOutlined />}
                    loading={isCreatingPayment}
                    className="!bg-[var(--color-primary)] !shadow-none"
                    onClick={handleCreatePayment}
                  >
                    Thanh toán VNPAY
                  </Button>
                ) : null}
                <Button size="large" onClick={() => router.push('/orders')}>
                  Xem đơn hàng của tôi
                </Button>
                <Button size="large" icon={<HomeOutlined />} onClick={() => router.push('/')}>
                  Về trang chủ
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    </div>
  );
}
