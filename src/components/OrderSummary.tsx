import type { OrderResponse } from '@/services/orderApi';
import { formatDate, formatMoney } from '@/lib/format';
export default function OrderSummary({ order }: { order: OrderResponse }) {
  return <div>
    <ul className="order-lines">{order.orderLineItemsList.map((item) => <li key={item.skuCode}>
      <div><strong>{item.productName || item.skuCode}</strong><p className="muted">{[item.color, item.size && 'Size ' + item.size].filter(Boolean).join(' / ')} · Số lượng {item.quantity}</p>
        <p className="muted">{formatMoney(item.price)} / sản phẩm</p></div><span>{formatMoney(item.price * item.quantity)}</span>
    </li>)}</ul>
    <div className="order-details"><strong>Thông tin nhận hàng</strong><p>{order.shippingRecipientName || 'Đơn không có tên người nhận'}{order.shippingRecipientPhone && ' · ' + order.shippingRecipientPhone}</p>
      <p>{order.shippingAddressLine || 'Đơn không có địa chỉ giao hàng'}</p>
      <p>Thanh toán: {order.paymentMethod === 'VNPAY' ? 'VNPay' : 'Khi nhận hàng (COD)'}</p><p>Ngày đặt: {formatDate(order.orderDate)}</p>
      {order.cancelReason && <p>Lý do hủy: {order.cancelReason}</p>}
    </div><div className="cart-total"><span>Tổng tiền sản phẩm</span><strong>{formatMoney(order.totalPrice)}</strong></div>
  </div>;
}
