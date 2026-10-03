'use client';
import Image from 'next/image';
import { useState } from 'react';
import { FALLBACK_IMAGE, safeImageSource } from '@/lib/catalog';
export default function ProductImage({ src, alt, sizes = '(max-width: 767px) 50vw, 25vw', priority = false }: {
  src?: string; alt: string; sizes?: string; priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const candidate = safeImageSource(src);
  const source = candidate !== failedSource ? candidate : FALLBACK_IMAGE;
  // Catalog URLs entered by an admin remain usable without opening the server
  // image optimizer to arbitrary hosts. Known catalog CDNs use optimization.
  const remote = source.startsWith('http');
  const optimized = remote && source.startsWith('https:') && ['static.nike.com', 'res.cloudinary.com'].includes(new URL(source).hostname);
  return <Image src={source} alt={alt} fill sizes={sizes} priority={priority} unoptimized={remote && !optimized} onError={() => setFailedSource(candidate)} />;
}
