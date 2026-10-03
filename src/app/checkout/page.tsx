'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button } from 'antd';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { useCart, useAddresses } from '@/lib/queries';
import { cartApi } from '@/services/cartApi';
import { orderApi, type OrderRequest } from '@/services/orderApi';
import { inventoryApi } from '@/services/inventoryApi';
import { productApi } from '@/services/productApi';
import ProductImage from '@/components/ui/ProductImage';
import QuantityStepper from '@/components/ui/QuantityStepper';
import PageState from '@/components/ui/PageState';
import { AddressEditor } from '@/components/AddressBook';
import { formatMoney } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';

export default function CheckoutPage() {
  const cart = useCart(), addresses = useAddresses(), queryClient = useQueryClient();
  const router = useRouter(), { message, modal } = App.useApp();
  const userId = useAuthStore((state) => state.user?.keycloakId) || '';
  const receipt = useCheckoutStore((state) => state.attempts[userId]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [method, setMethod] = useState<'COD' | 'VNPAY'>('COD');
  const [addingAddress, setAddingAddress] = useState(false), [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const items = cart.data?.items || [];
  const stocks = useQueries({ queries: items.map((item) => ({ queryKey: ['stock', item.skuCode], queryFn: () => inventoryApi.getStock(item.skuCode), staleTime: 15_000 })) });
  const variants = useQueries({ queries: items.map((item) => ({ queryKey: ['sku', item.skuCode], queryFn: () => productApi.getSku(item.skuCode) })) });
  const selectedAddress = addresses.data?.find((address) => address.id === addressId) || addresses.data?.find((address) => address.isDefault) || addresses.data?.[0];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const allAvailable = items.length > 0 && items.every((item, index) => {
    const stock = stocks[index]?.data?.quantity;
    return variants[index]?.data?.isActive !== false && !variants[index]?.isError && !variants[index]?.isPending && stock !== undefined && stock >= item.quantity;
  });
  const update = useMutation({
    mutationFn: async (action: { sku: string; quantity?: number; clear?: boolean }) => {
      await freshAccessToken();
      if (action.clear) await cartApi.clear();
      else if (action.quantity !== undefined) await cartApi.update(action.sku, action.quantity);
      else await cartApi.remove(action.sku);
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['cart'] }); },
    onError: (error) => { message.error(apiErrorMessage(error)); void queryClient.invalidateQueries({ queryKey: ['cart'] }); void queryClient.invalidateQueries({ queryKey: ['stock'] }); },
  });
  const place = async () => {
    if (submissionLock.current || !selectedAddress || !allAvailable || receipt?.orderNumber) return;
    submissionLock.current = true; setSubmitting(true);
    try {
      await freshAccessToken();
      const payload: OrderRequest = {
        items: items.map(({ skuCode, quantity }) => ({ skuCode, quantity })).sort((a, b) => a.skuCode.localeCompare(b.skuCode)),
        paymentMethod: method, shippingAddressLabel: selectedAddress.label,
        shippingRecipientName: selectedAddress.recipientName, shippingRecipientPhone: selectedAddress.recipientPhone, shippingAddressLine: selectedAddress.addressLine,
      };
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const key = useCheckoutStore.getState().begin(userId, fingerprint, payload.items);
      const accepted = await orderApi.placeOrder(payload, key);
      if (!/^[A-Za-z0-9-]{1,64}$/.test(accepted.orderNumber)) throw new Error('Invalid order response');
      useCheckoutStore.getState().accepted(userId, accepted.orderNumber);
      // 202 is an acknowledgement, never a completed purchase or reason to empty the cart.
      router.push(`/checkout/waiting/${accepted.orderNumber}`);
    } catch (error) {
      message.error(apiErrorMessage(error));
      void queryClient.invalidateQueries({ queryKey: ['stock'] }); void queryClient.invalidateQueries({ queryKey: ['cart'] });
    } finally { submissionLock.current = false; setSubmitting(false); }
  };
  if (receipt?.orderNumber) return <div className="app-shell page"><PageState title="Bạn đã gửi một đơn hàng" description="Kiểm tra kết quả xử lý trước khi đặt thêm đơn từ giỏ này."
    actionHref={`/checkout/waiting/${receipt.orderNumber}`} actionLabel="Theo dõi đơn đã gửi" /></div>;
  return <div className="app-shell page"><div className="page-heading"><div><h1>Giỏ hàng & thanh toán</h1><p>Kiểm tra sản phẩm và thông tin nhận hàng trước khi gửi đơn.</p></div><Link href="/products" className="text-link text-sm">Tiếp tục mua sắm</Link></div>
    {cart.isPending ? <PageState title="Đang tải giỏ hàng…" /> : cart.isError ? <PageState title="Chưa thể tải giỏ hàng" description={apiErrorMessage(cart.error)} retry={() => void cart.refetch()} /> :
      !items.length ? <PageState title="Giỏ hàng đang trống" description="Chọn sản phẩm và kích cỡ để bắt đầu." actionHref="/products" actionLabel="Khám phá sản phẩm" /> :
      <div className="checkout-layout"><section>
        <h2 className="mb-6">Sản phẩm trong giỏ</h2>
        {items.map((item, index) => {
          const stock = stocks[index].data?.quantity, variant = variants[index].data;
          const unknown = stocks[index].isError || variants[index].isError;
          return <article key={item.skuCode} className="cart-line"><div className="product-media"><ProductImage src={item.imageUrl} alt={item.productName} sizes="120px" /></div><div>
            <h3>{item.productName}</h3><p>{variant ? [variant.color, variant.size && 'Size ' + variant.size].filter(Boolean).join(' / ') : item.skuCode}</p>
            <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{formatMoney(item.price)}</span><strong>{formatMoney(item.price * item.quantity)}</strong></div>
            <div className="cart-controls"><QuantityStepper value={item.quantity} max={stock} disabled={update.isPending || submitting || unknown || stock === undefined} onChange={(quantity) => update.mutate({ sku: item.skuCode, quantity })} />
              <Button type="text" disabled={update.isPending || submitting} onClick={() => update.mutate({ sku: item.skuCode })}>Xóa</Button>
            </div><p aria-live="polite">{unknown ? 'Chưa xác minh được biến thể hoặc tồn kho.' : stock === undefined ? 'Đang kiểm tra tồn kho…' : stock < item.quantity ? `Chỉ còn ${stock} sản phẩm. Giảm số lượng hoặc xóa để tiếp tục.` : `Còn ${stock} sản phẩm.`}</p>
            {unknown && <button type="button" className="text-link text-sm" onClick={() => { void stocks[index].refetch(); void variants[index].refetch(); }}>Kiểm tra lại</button>}
          </div></article>;
        })}
        <Button className="mt-4" disabled={update.isPending || submitting} onClick={() => modal.confirm({ title: 'Xóa toàn bộ giỏ hàng?', okText: 'Xóa giỏ', cancelText: 'Giữ giỏ', onOk: () => update.mutateAsync({ sku: '', clear: true }) })}>Xóa toàn bộ giỏ</Button>
        <section className="checkout-section mt-6"><div className="section-header"><h2>Địa chỉ giao hàng</h2><Button onClick={() => setAddingAddress(true)}>Thêm địa chỉ</Button></div>
          {addresses.isPending ? <p role="status">Đang tải địa chỉ…</p> : addresses.isError ? <PageState title="Chưa thể tải địa chỉ" retry={() => void addresses.refetch()} /> :
            !addresses.data.length ? <p className="muted">Thêm địa chỉ để tiếp tục đặt hàng.</p> :
              <fieldset className="border-0 p-0 m-0" disabled={submitting}><legend className="sr-only">Chọn địa chỉ</legend>{addresses.data.map((address) => <label className="choice" key={address.id}>
                <input type="radio" name="shippingAddress" checked={selectedAddress?.id === address.id} onChange={() => setAddressId(address.id)} />
                <strong>{address.recipientName}</strong>{address.isDefault && <span className="ml-3 text-xs">Mặc định</span>}<small>{address.recipientPhone}<br />{address.addressLine}</small>
              </label>)}</fieldset>}
        </section>
      </section><aside className="checkout-summary"><h2>Tóm tắt đơn hàng</h2><div className="cart-total"><span>Tạm tính</span><strong>{formatMoney(subtotal)}</strong></div>
        <p className="text-sm muted">Tổng tiền sản phẩm. Giá và tồn kho được xác nhận lại khi xử lý đơn.</p>
        <fieldset className="checkout-section mt-6 border-x-0 border-b-0" disabled={submitting}><legend className="text-xl mb-4">Phương thức thanh toán</legend>
          <label className="choice"><input type="radio" name="paymentMethod" value="COD" checked={method === 'COD'} onChange={() => setMethod('COD')} />Khi nhận hàng (COD)</label>
          <label className="choice"><input type="radio" name="paymentMethod" value="VNPAY" checked={method === 'VNPAY'} onChange={() => setMethod('VNPAY')} />VNPay<small>Thanh toán trực tuyến sau khi tồn kho được xác nhận.</small></label>
        </fieldset>
        <button type="button" className="app-primary-btn w-full" disabled={submitting || update.isPending || !selectedAddress || !allAvailable} onClick={() => void place()}>{submitting ? 'Đang gửi đơn…' : 'Gửi đơn hàng'}</button>
        <p className="text-sm muted mt-4">Giỏ hàng được giữ trong lúc chờ kết quả xử lý.</p>
      </aside></div>}
    {addingAddress && <AddressEditor defaultAddress={!addresses.data?.length} onClose={() => setAddingAddress(false)} />}
  </div>;
}
