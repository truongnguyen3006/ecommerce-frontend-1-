'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin') || ['/login', '/register'].includes(pathname)) return null;
  const groups = [
    { title: 'Mua sắm', links: [['/products', 'Tất cả sản phẩm'], ['/wishlist', 'Sản phẩm yêu thích']] },
    { title: 'Tài khoản', links: [['/profile', 'Hồ sơ & địa chỉ'], ['/orders', 'Đơn hàng'], ['/checkout', 'Giỏ hàng']] },
    { title: 'Thông tin', links: [['/about', 'Về Flash Store'], ['/help', 'Hướng dẫn mua hàng']] },
  ];
  return <footer className="site-footer"><div className="app-shell">
    <div className="footer-grid"><div><Link href="/" className="brand">FLASH<span>STORE</span></Link></div>
      {groups.map((group) => <div key={group.title}><h2>{group.title}</h2><ul>
        {group.links.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
      </ul></div>)}
    </div><p className="footer-note">© {new Date().getFullYear()} Flash Store</p>
  </div></footer>;
}
