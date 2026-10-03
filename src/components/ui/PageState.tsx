import Link from 'next/link';
export default function PageState({ title, description, retry, actionHref, actionLabel }: {
  title: string; description?: string; retry?: () => void; actionHref?: string; actionLabel?: string;
}) {
  return <section className="state-panel" aria-live="polite"><h2>{title}</h2>
    {description && <p>{description}</p>}<div className="state-actions">
      {retry && <button type="button" className="app-secondary-btn" onClick={retry}>Thử lại</button>}
      {actionHref && <Link href={actionHref} className="app-primary-btn">{actionLabel}</Link>}
    </div></section>;
}
export function ProductSkeleton({ count = 6 }: { count?: number }) {
  return <div className="product-grid" role="status" aria-label="Đang tải sản phẩm">
    {Array.from({ length: count }, (_, i) => <div key={i} aria-hidden="true"><div className="product-media" />
      <div className="loading-line mt-3 w-3/4" /><div className="loading-line mt-2 w-1/2" /></div>)}
  </div>;
}
