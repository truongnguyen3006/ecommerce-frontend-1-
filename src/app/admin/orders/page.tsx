'use client';
import { useState } from 'react';
import { Button, Modal, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { orderApi, type OrderResponse } from '@/services/orderApi';
import { formatDate, formatMoney } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api-error';
import { getOrderStatusMeta } from '@/lib/order-status';
import PageState from '@/components/ui/PageState';
import OrderSummary from '@/components/OrderSummary';
export default function AdminOrders() {
  const query = useQuery({ queryKey: ['admin-orders'], queryFn: orderApi.getAdminOrders });
  const [selected, setSelected] = useState<string | null>(null);
  const order = query.data?.find((item) => item.orderNumber === selected);
  return <section><div className="page-heading"><div><h1>Đơn hàng</h1><p>Trạng thái xử lý, thông tin nhận hàng và chi tiết sản phẩm.</p></div><Button loading={query.isFetching} onClick={() => void query.refetch()}>Tải lại</Button></div>
    {query.isError ? <PageState title="Chưa thể tải đơn hàng" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
      <div className="table-wrap"><Table<OrderResponse> loading={query.isPending} dataSource={query.data || []} rowKey="orderNumber" scroll={{ x: 940 }} pagination={{ pageSize: 10 }} locale={{ emptyText: 'Chưa có đơn hàng' }} columns={[
        { title: 'Mã đơn', dataIndex: 'orderNumber', width: 250 }, { title: 'Người nhận', render: (_, order) => order.shippingRecipientName || order.userId },
        { title: 'Ngày đặt', dataIndex: 'orderDate', render: formatDate, sorter: (a, b) => a.orderDate.localeCompare(b.orderDate), defaultSortOrder: 'descend' },
        { title: 'Tổng tiền', dataIndex: 'totalPrice', render: formatMoney }, { title: 'Thanh toán', dataIndex: 'paymentMethod' },
        { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => getOrderStatusMeta(status).label },
        { title: 'Thao tác', render: (_, order) => <Button onClick={() => setSelected(order.orderNumber)}>Chi tiết</Button> },
      ]} /></div>}
    <Modal title="Chi tiết đơn hàng" open={Boolean(selected)} width={800} onCancel={() => setSelected(null)} footer={null}>
      {order && <><p className="order-number">{order.orderNumber}</p><p className="mt-3">{getOrderStatusMeta(order.status).label}</p><OrderSummary order={order} /></>}
    </Modal>
  </section>;
}
