'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App, Button, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/services/authApi';
const links = [['/admin', 'Tổng quan'], ['/admin/products', 'Sản phẩm'], ['/admin/products/create', 'Thêm sản phẩm'], ['/admin/orders', 'Đơn hàng'], ['/admin/users', 'Người dùng']];
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), router = useRouter(), { user } = useAuthStore(), { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const nav = <nav aria-label="Quản trị">{links.map(([href, label]) => <Link href={href} key={href} className="admin-link" aria-current={pathname === href || (href === '/admin/products' && pathname.startsWith('/admin/products/') && pathname !== '/admin/products/create') ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}</nav>;
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="brand">FLASH<span>QUẢN TRỊ</span></Link>{nav}</aside><div className="admin-body">
    <header className="admin-header"><div className="flex items-center gap-3"><button type="button" className="app-icon-button mobile-menu-button" aria-label="Mở menu quản trị" onClick={() => setOpen(true)}><MenuOutlined /></button><span className="text-sm admin-user">{user?.fullName || user?.username}</span><Link href="/" className="text-link text-sm">Về cửa hàng</Link></div>
      <Button onClick={async () => { try { await authApi.logout(); } catch { message.info('Đã đăng xuất trên thiết bị này.'); } router.push('/login'); }}>Đăng xuất</Button>
    </header><div className="admin-main">{children}</div></div><Drawer title="Quản trị Flash Store" width={300} open={open} onClose={() => setOpen(false)}><div className="admin-sidebar !block !border-0 !p-0">{nav}</div></Drawer></div>;
}
