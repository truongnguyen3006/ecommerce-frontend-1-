'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { App as AntdApp, Button, Layout, Menu, Spin, Typography } from 'antd';
import {
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { hasAdminRole } from '@/lib/auth';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated, hasHydrated } = useAuthStore();
  const { message } = AntdApp.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const hasShownUnauthorizedMessage = useRef(false);

  const userRoles = user?.roles ?? [];
  const isAuthorized = hasHydrated && isAuthenticated && hasAdminRole(userRoles);
  const selectedMenuKey = pathname.startsWith('/admin/products') ? '/admin/products' : pathname;

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && !hasAdminRole(userRoles)) {
      if (!hasShownUnauthorizedMessage.current) {
        hasShownUnauthorizedMessage.current = true;
        message.error('Bạn không có quyền truy cập trang Admin.');
      }
      router.replace('/');
    }
  }, [hasHydrated, isAuthenticated, message, router, user, userRoles]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = useMemo(
    () => [
      {
        key: '/admin',
        icon: <DashboardOutlined />,
        label: <Link href="/admin">Tổng quan</Link>,
      },
      {
        key: '/admin/products-menu',
        icon: <ShoppingOutlined />,
        label: 'Sản phẩm',
        children: [
          {
            key: '/admin/products',
            label: <Link href="/admin/products">Danh sách</Link>,
          },
          {
            key: '/admin/products/create',
            label: <Link href="/admin/products/create">Thêm mới</Link>,
            icon: <PlusCircleOutlined />,
          },
        ],
      },
      {
        key: '/admin/orders',
        icon: <ShoppingOutlined />,
        label: <Link href="/admin/orders">Đơn hàng</Link>,
      },
      {
        key: '/admin/users',
        icon: <UserOutlined />,
        label: <Link href="/admin/users">Người dùng</Link>,
      },
    ],
    [],
  );

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-elevated)]">
        <div className="flex flex-col items-center gap-3">
          <Spin size="large" />
          <p className="text-sm text-[var(--color-secondary)]">Đang kiểm tra quyền truy cập…</p>
        </div>
      </div>
    );
  }

  return (
    <Layout className="min-h-screen bg-[var(--color-surface-elevated)]">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={84}
        className="border-r border-[var(--color-border)] !bg-white"
      >
        <div className="flex h-18 items-center gap-3 border-b border-[var(--color-border)] px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
            F
          </div>
          {!collapsed ? (
            <div>
              <div className="text-sm font-semibold text-[var(--color-primary)]">Flash Store</div>
              <div className="text-xs text-[var(--color-secondary)]">Bảng điều khiển</div>
            </div>
          ) : null}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          defaultOpenKeys={['/admin/products-menu']}
          items={menuItems}
          className="border-none px-3 py-4"
        />
      </Sider>

      <Layout>
        <Header className="flex h-18 items-center justify-between border-b border-[var(--color-border)] !bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((prev) => !prev)}
              className="!h-10 !w-10"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Quản trị hệ thống
              </div>
              <div className="text-sm font-semibold text-[var(--color-primary)]">
                {user?.fullName || user?.username || 'System Administrator'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Text className="hidden text-sm text-[var(--color-secondary)] md:block">
              Theo dõi sản phẩm, đơn hàng và người dùng tại một nơi.
            </Text>
            <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </Header>

        <Content className="p-4 md:p-6">
          <div className="min-h-[calc(100vh-120px)] rounded-[32px] bg-transparent">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
