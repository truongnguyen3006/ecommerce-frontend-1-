'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function AccountNav() {
  const pathname = usePathname();
  return <nav className="account-nav" aria-label="Tài khoản">
    {[['/profile', 'Hồ sơ & địa chỉ'], ['/orders', 'Đơn hàng'], ['/wishlist', 'Yêu thích']].map(([href, label]) =>
      <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
  </nav>;
}
