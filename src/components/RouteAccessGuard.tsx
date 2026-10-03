'use client';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { hasAdminRole } from '@/lib/auth';
import PageState from '@/components/ui/PageState';

export default function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const privateRoute = ['/profile', '/checkout', '/orders', '/admin'].some((route) => pathname === route || pathname.startsWith(route + '/'));
  if (privateRoute && !hasHydrated) return <div className="app-shell page" role="status">Đang kiểm tra phiên đăng nhập…</div>;
  if (privateRoute && !isAuthenticated) return <PageState title="Đăng nhập để tiếp tục" description="Giỏ hàng, địa chỉ và đơn hàng được lưu trong tài khoản của bạn."
    actionHref={`/login?next=${encodeURIComponent(pathname)}`} actionLabel="Đăng nhập" />;
  if (pathname.startsWith('/admin') && !hasAdminRole(user?.roles)) return <PageState title="Không có quyền truy cập" description="Khu vực này dành cho quản trị viên." actionHref="/" actionLabel="Về cửa hàng" />;
  return children;
}
