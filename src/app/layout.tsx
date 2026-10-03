import '@ant-design/v5-patch-for-react-19';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Providers } from '@/lib/providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RouteAccessGuard from '@/components/RouteAccessGuard';

export const metadata: Metadata = {
  title: { default: 'Flash Store', template: '%s | Flash Store' },
  description: 'Khám phá sản phẩm, chọn biến thể và theo dõi đơn hàng tại Flash Store.',
  icons: { icon: '/flash-mark.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <Providers><div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-[72px]" />}><Header /></Suspense>
      <main id="main-content" className="flex-1 min-w-0">
        <Suspense fallback={<div className="app-shell page" role="status">Đang tải…</div>}>
          <RouteAccessGuard>{children}</RouteAccessGuard>
        </Suspense>
      </main><Footer />
    </div></Providers></body></html>;
}
