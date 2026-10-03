import Link from 'next/link';
import type { Product } from '@/types';
import ProductImage from '@/components/ui/ProductImage';
import { productImage } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';
export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return <Link href={`/product/${product.id}`} className="product-card">
    <div className="product-media"><ProductImage src={productImage(product)} alt={product.name} priority={priority} /></div>
    <h3>{product.name}</h3>{product.category && <p>{product.category}</p>}
    <p>{product.variants?.filter((variant) => variant.isActive !== false).map((variant) => variant.color).filter((color, index, all) => color && all.indexOf(color) === index).length || 0} màu</p>
    <div className="price">{formatMoney(product.price)}</div>
  </Link>;
}
