'use client';

import { useEffect, useState } from 'react';
import { App as AntdApp, Card, Col, Empty, Row, Spin, Statistic } from 'antd';
import { DollarCircleOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons';
import { orderApi } from '@/services/orderApi';
import { userManagementApi } from '@/services/userManagementApi';

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function AdminDashboard() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    dailyRevenue: 0,
    newOrdersToday: 0,
    totalOrders: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, ordersData] = await Promise.all([
          userManagementApi.getAll(),
          orderApi.getAdminOrders(),
        ]);
        const todayStr = new Date().toISOString().slice(0, 10);

        const filteredOrders = ordersData.filter(
          (order) => order.status !== 'FAILED' && order.status !== 'PAYMENT_FAILED',
        );
        const ordersToday = filteredOrders.filter((order) => order.orderDate?.startsWith(todayStr));
        const revenueToday = ordersToday.reduce(
          (total, order) => total + (order.totalPrice || 0),
          0,
        );

        setStats({
          totalUsers: usersData.length,
          totalOrders: ordersData.length,
          newOrdersToday: ordersToday.length,
          dailyRevenue: revenueToday,
        });
      } catch (error) {
        console.error('Lỗi tải Dashboard:', error);
        message.warning('Không thể tải đầy đủ số liệu thống kê.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [message]);

  if (loading) {
    return (
      <div className="app-admin-card flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spin size="large" />
          <p className="text-sm text-[var(--color-secondary)]">Đang tổng hợp số liệu…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="app-admin-card px-6 py-6 md:px-8 md:py-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Tổng quan</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard quản trị</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-secondary)]">
          Theo dõi nhanh số lượng thành viên, doanh thu trong ngày và nhịp phát sinh đơn hàng.
        </p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={8}>
          <Card className="app-admin-card border-0">
            <Statistic title="Tổng thành viên" value={stats.totalUsers} prefix={<UserOutlined />} />
            <p className="mt-3 text-sm text-[var(--color-secondary)]">Số lượng người dùng đang có trong hệ thống.</p>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={8}>
          <Card className="app-admin-card border-0">
            <Statistic
              title="Doanh thu hôm nay"
              value={formatMoney(stats.dailyRevenue)}
              suffix="đ"
              prefix={<DollarCircleOutlined />}
            />
            <p className="mt-3 text-sm text-[var(--color-secondary)]">Tính trên các đơn không thất bại trong ngày hiện tại.</p>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={8}>
          <Card className="app-admin-card border-0">
            <Statistic
              title="Đơn hàng hôm nay"
              value={stats.newOrdersToday}
              suffix={`/ ${stats.totalOrders}`}
              prefix={<ShoppingOutlined />}
            />
            <p className="mt-3 text-sm text-[var(--color-secondary)]">Theo dõi tốc độ phát sinh đơn hàng theo ngày.</p>
          </Card>
        </Col>
      </Row>

      <Card className="app-admin-card border-0">
        {stats.totalOrders === 0 && stats.totalUsers === 0 ? (
          <Empty description="Chưa có dữ liệu để hiển thị" />
        ) : (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Tình trạng hệ thống</h2>
            <p className="text-sm leading-6 text-[var(--color-secondary)]">
              Dữ liệu trong khu vực quản trị sẽ thay đổi theo danh sách người dùng và đơn hàng hiện có.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
