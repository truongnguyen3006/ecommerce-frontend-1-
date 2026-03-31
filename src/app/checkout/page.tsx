'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Divider, Empty, Radio, Spin, Tag, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  LockOutlined,
  PlusOutlined,
  ShoppingOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { orderApi } from '@/services/orderApi';
import { addressApi, type UserAddress } from '@/services/addressApi';
import QuantityStepper from '@/components/ui/QuantityStepper';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

const orderBenefits = [
  {
    icon: <ClockCircleOutlined className="text-lg" />,
    title: 'Theo dõi trạng thái rõ ràng',
    description:
      'Sau khi đặt hàng, bạn sẽ được chuyển sang màn hình theo dõi đơn hàng theo thời gian thực.',
  },
  {
    icon: <TruckOutlined className="text-lg" />,
    title: 'Chọn địa chỉ giao hàng trước khi đặt',
    description:
      'Đơn hàng sẽ lưu đúng người nhận và địa chỉ giao hàng mà bạn đã chọn.',
  },
  {
    icon: <LockOutlined className="text-lg" />,
    title: 'Hỗ trợ COD và VNPAY',
    description:
      'Bạn có thể chọn thanh toán khi nhận hàng hoặc thanh toán trực tuyến bằng VNPAY khi đơn sẵn sàng.',
  },
];

type PaymentMethod = 'COD' | 'VNPAY';

interface SelectCardProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function SelectCard({ active, onClick, children }: SelectCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`cursor-pointer rounded-[24px] border p-4 transition ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)] shadow-sm'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40'
      }`}
    >
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!isAuthenticated && !token) {
      message.warning('Vui lòng đăng nhập để tiếp tục đặt hàng.');
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const loadAddresses = async () => {
      setAddressLoading(true);
      try {
        const data = await addressApi.getMyAddresses();
        setAddresses(data);
        const defaultAddress = data.find((address) => address.isDefault) ?? data[0];
        setSelectedAddressId(defaultAddress?.id ?? null);
      } catch (error) {
        console.error(error);
      } finally {
        setAddressLoading(false);
      }
    };

    void loadAddresses();
  }, []);

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  const subtotal = useMemo(() => totalPrice(), [items, totalPrice]);
  const shippingFee = 0;
  const discountValue = 0;
  const finalTotal = subtotal + shippingFee - discountValue;
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;

  const handlePlaceOrder = async () => {
    if (!items.length) return;
    if (!selectedAddress) {
      message.warning('Vui lòng chọn địa chỉ giao hàng trước khi đặt đơn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: items.map((item) => ({
          skuCode: item.skuCode,
          quantity: item.quantity,
        })),
        paymentMethod,
        shippingAddressLabel: selectedAddress.label,
        shippingRecipientName: selectedAddress.recipientName,
        shippingRecipientPhone: selectedAddress.recipientPhone,
        shippingAddressLine: selectedAddress.addressLine,
      };

      const response = await orderApi.placeOrder(payload);
      message.success(
        paymentMethod === 'VNPAY'
          ? 'Đơn hàng đã được tạo. Bạn có thể thanh toán khi đơn sẵn sàng.'
          : 'Đơn hàng đã được gửi thành công.',
      );
      clearCart();
      router.push(`/checkout/waiting/${response.orderNumber}`);
    } catch (error) {
      console.error(error);
      message.error('Đặt hàng thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated && !token) {
    return (
      <div className="app-shell py-10">
        <div className="app-surface flex min-h-[320px] items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="app-shell animate-fade-in py-10">
        <div className="app-surface px-6 py-12">
          <Empty
            image={<ShoppingOutlined className="text-6xl text-[var(--color-muted)]" />}
            description="Giỏ hàng của bạn đang trống"
          >
            <Link href="/products" className="app-primary-btn">
              Khám phá sản phẩm
            </Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell animate-fade-in py-8 md:py-10">
      <div className="mb-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="app-surface overflow-hidden border-0 bg-[linear-gradient(135deg,#111111_0%,#2b2b31_100%)] px-6 py-7 text-white md:px-8 md:py-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <span>Thanh toán</span>
            <span>•</span>
            <span>Đơn hàng của bạn</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Kiểm tra lại đơn hàng trước khi đặt
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
            Trước khi xác nhận, hãy chọn địa chỉ giao hàng và phương thức thanh toán phù hợp để hệ thống lưu
            đơn chính xác ngay từ đầu.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/90">
              <ShoppingOutlined /> {itemCount} sản phẩm
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/90">
              <TruckOutlined /> Giao hàng tiêu chuẩn
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/90">
              <CheckCircleOutlined /> COD / VNPAY
            </span>
          </div>
        </div>

        <div className="app-surface p-6 md:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Sau khi đặt hàng
          </div>
          <div className="mt-4 grid gap-3">
            {orderBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-sm">
                    {benefit.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-primary)]">{benefit.title}</div>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-secondary)]">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <section className="app-surface overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-6 py-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Sản phẩm trong đơn hàng</h2>
                <p className="mt-1 text-sm text-[var(--color-secondary)]">
                  Bạn có thể thay đổi số lượng hoặc xóa sản phẩm trước khi xác nhận.
                </p>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
              >
                Tiếp tục mua sắm
              </Link>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => {
                const itemTotal = item.price * item.quantity;
                return (
                  <article
                    key={item.skuCode}
                    className="grid gap-4 px-6 py-5 md:grid-cols-[132px_minmax(0,1fr)] md:items-center"
                  >
                    <div className="overflow-hidden rounded-[26px] bg-[var(--color-surface-muted)]">
                      <img src={item.imageUrl} alt={item.name} className="h-32 w-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <Link
                            href={`/product/${item.id}`}
                            className="text-lg font-semibold tracking-tight transition hover:opacity-70"
                          >
                            {item.name}
                          </Link>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--color-secondary)]">
                            {item.category ? <span className="app-status-pill">{item.category}</span> : null}
                            {item.selectedColor ? (
                              <span className="app-status-pill">Màu: {item.selectedColor}</span>
                            ) : null}
                            {item.selectedSize ? <span className="app-status-pill">Size: {item.selectedSize}</span> : null}
                            <span className="app-status-pill">SKU: {item.skuCode}</span>
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <div className="text-base font-semibold">{formatMoney(itemTotal)}</div>
                          <div className="mt-1 text-sm text-[var(--color-secondary)]">
                            {formatMoney(item.price)} / sản phẩm
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <QuantityStepper value={item.quantity} onChange={(value) => updateQuantity(item.skuCode, value)} />
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => removeFromCart(item.skuCode)}
                          className="!h-auto !px-0 text-[var(--color-secondary)] hover:!text-[var(--color-danger)]"
                        >
                          Xóa sản phẩm
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="app-surface p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Địa chỉ giao hàng
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Chọn người nhận và địa chỉ</h2>
              </div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:opacity-70"
              >
                <PlusOutlined /> Quản lý địa chỉ
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {addressLoading ? (
                <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-secondary)]">
                  Đang tải danh sách địa chỉ…
                </div>
              ) : addresses.length > 0 ? (
                <div className="grid gap-3">
                  {addresses.map((address) => {
                    const active = selectedAddressId === address.id;
                    return (
                      <SelectCard key={address.id} active={active} onClick={() => setSelectedAddressId(address.id)}>
                        <div className="flex items-start gap-3">
                          <Radio checked={active} className="mt-1" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-[var(--color-primary)]">{address.recipientName}</div>
                              <Tag className="!mr-0">{address.recipientPhone}</Tag>
                              {address.isDefault ? (
                                <Tag color="green" className="!mr-0">
                                  Mặc định
                                </Tag>
                              ) : null}
                              {address.label ? (
                                <Tag color="blue" className="!mr-0">
                                  {address.label}
                                </Tag>
                              ) : null}
                            </div>
                            <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-[var(--color-secondary)]">
                              <EnvironmentOutlined className="mt-1" />
                              <span>{address.addressLine}</span>
                            </div>
                          </div>
                        </div>
                      </SelectCard>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm leading-6 text-[var(--color-secondary)]">
                  Bạn chưa có địa chỉ giao hàng nào. Hãy thêm ít nhất một địa chỉ trong trang hồ sơ trước khi đặt đơn.
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
          <div className="app-surface p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Tóm tắt thanh toán
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Xác nhận đơn hàng</h2>
              </div>
              <Tag color="success" className="!mr-0">
                Miễn phí vận chuyển
              </Tag>
            </div>

            <div className="mt-6 space-y-4 text-sm text-[var(--color-secondary)]">
              <div className="flex items-center justify-between">
                <span>Tạm tính</span>
                <span className="font-semibold text-[var(--color-primary)]">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Giảm giá</span>
                <span className="font-semibold text-[var(--color-primary)]">{formatMoney(discountValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vận chuyển</span>
                <span className="font-semibold text-[var(--color-success)]">Miễn phí</span>
              </div>
            </div>

            <Divider className="my-6" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[var(--color-secondary)]">Tổng thanh toán</div>
                <div className="mt-1 text-xs text-[var(--color-muted)]">Đã bao gồm các khoản hiển thị ở trên</div>
              </div>
              <div className="text-right text-3xl font-semibold tracking-tight">{formatMoney(finalTotal)}</div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="text-sm font-semibold text-[var(--color-primary)]">Phương thức thanh toán</div>
              <div className="mt-4 grid gap-3">
                <SelectCard active={paymentMethod === 'COD'} onClick={() => setPaymentMethod('COD')}>
                  <div className="flex items-start gap-3">
                    <Radio checked={paymentMethod === 'COD'} className="mt-1" />
                    <div>
                      <div className="font-semibold text-[var(--color-primary)]">Thanh toán khi nhận hàng (COD)</div>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-secondary)]">
                        Đơn hàng được tạo ngay và tiếp tục xử lý theo luồng hiện tại của hệ thống.
                      </p>
                    </div>
                  </div>
                </SelectCard>

                <SelectCard active={paymentMethod === 'VNPAY'} onClick={() => setPaymentMethod('VNPAY')}>
                  <div className="flex items-start gap-3">
                    <Radio checked={paymentMethod === 'VNPAY'} className="mt-1" />
                    <div>
                      <div className="font-semibold text-[var(--color-primary)]">Thanh toán trực tuyến qua VNPAY</div>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-secondary)]">
                        Hệ thống sẽ tạo đơn trước. Khi đơn sẵn sàng thanh toán, bạn sẽ thấy nút thanh toán VNPAY ở
                        trang theo dõi đơn hàng.
                      </p>
                    </div>
                  </div>
                </SelectCard>
              </div>
            </div>

            {selectedAddress ? (
              <div className="mt-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-secondary)]">
                <div className="font-semibold text-[var(--color-primary)]">Giao đến</div>
                <div className="mt-2">
                  {selectedAddress.recipientName} • {selectedAddress.recipientPhone}
                </div>
                <div>{selectedAddress.addressLine}</div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !selectedAddress}
                className="app-primary-btn w-full py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Đang gửi đơn hàng…'
                  : paymentMethod === 'VNPAY'
                    ? 'Tạo đơn hàng để thanh toán VNPAY'
                    : 'Đặt hàng ngay'}
              </button>
              <Link href="/products" className="app-secondary-btn w-full py-4 text-center text-base">
                Quay lại mua sắm
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
