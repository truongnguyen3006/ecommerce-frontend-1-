'use client';
import { facetLabels } from '@/lib/facets';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { App, Badge, Drawer, Dropdown, type MenuProps } from 'antd';
import { HeartOutlined, MenuOutlined, SearchOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/services/authApi';
import { productApi } from '@/services/productApi';
import { hasAdminRole } from '@/lib/auth';
import { useCart } from '@/lib/queries';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const { message } = App.useApp();
  const hidden = pathname.startsWith('/admin') || ['/login', '/register'].includes(pathname);
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: productApi.getAll, staleTime: 300_000, enabled: !hidden });
  const categories = facetLabels((catalog.data || []).map((product) => product.category)).slice(0, 3);
  const links = [{ href: '/products', label: 'Tất cả sản phẩm' }, ...categories.map((category) => ({ href: `/products?category=${encodeURIComponent(category)}`, label: category }))];
  const handleLogout = async () => {
    try { await authApi.logout(); } catch { message.info('Đã đăng xuất trên thiết bị này.'); }
    router.push('/');
  };
  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: <Link href="/profile">Hồ sơ & địa chỉ</Link> },
    { key: 'orders', label: <Link href="/orders">Đơn hàng</Link> },
    ...(hasAdminRole(user?.roles) ? [{ key: 'admin', label: <Link href="/admin">Quản trị</Link> }] : []),
    { type: 'divider' }, { key: 'logout', label: 'Đăng xuất', onClick: () => void handleLogout() },
  ];
  if (hidden) return null;
  const current = (href: string) => pathname === '/products' && (new URLSearchParams(href.split('?')[1]).get('category') || '') === (searchParams.get('category') || '');
  return <div className="site-header">
    <div className="utility-nav"><div className="app-shell"><Link href="/help">Trợ giúp</Link>
      <Link href={isAuthenticated ? '/profile' : '/register'}>{isAuthenticated ? (user?.fullName || user?.username || 'Tài khoản') : 'Tạo tài khoản'}</Link>
      {!isAuthenticated && <Link href="/login">Đăng nhập</Link>}
    </div></div>
    <header className="app-shell main-nav"><Link href="/" className="brand" aria-label="Flash Store — trang chủ">FLASH<span>STORE</span></Link>
      <nav className="category-nav" aria-label="Danh mục">{links.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href) ? 'page' : undefined}>{link.label}</Link>)}</nav>
      <div className="nav-actions">
        <form action="/products" className="nav-search" role="search"><SearchOutlined aria-hidden /><input name="keyword" aria-label="Tìm sản phẩm" placeholder="Tìm kiếm" /><button type="submit" aria-label="Tìm kiếm" className="sr-only">Tìm</button></form>
        <Link href="/wishlist" className="app-icon-button" aria-label="Yêu thích"><HeartOutlined /></Link>
        <Link href="/checkout" className="app-icon-button" aria-label="Giỏ hàng"><Badge count={cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) || 0} size="small"><ShoppingOutlined /></Badge></Link>
        {isAuthenticated ? <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight"><button className="app-icon-button" type="button" aria-label="Menu tài khoản"><UserOutlined /></button></Dropdown> :
          <Link href="/login" className="app-icon-button" aria-label="Đăng nhập"><UserOutlined /></Link>}
        <button type="button" className="app-icon-button mobile-menu-button" aria-label="Mở menu" onClick={() => setOpen(true)}><MenuOutlined /></button>
      </div>
    </header>
    <Drawer title="Flash Store" open={open} onClose={() => setOpen(false)} width={320}>
      <nav className="mobile-links" aria-label="Menu di động" onClick={() => setOpen(false)}>{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <Link href="/products">Tìm kiếm</Link><Link href="/wishlist">Yêu thích</Link><Link href="/orders">Đơn hàng</Link><Link href="/help">Trợ giúp</Link>
        {hasAdminRole(user?.roles) && <Link href="/admin">Quản trị</Link>}
      </nav>
    </Drawer>
  </div>;
}
