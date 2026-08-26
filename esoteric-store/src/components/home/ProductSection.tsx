import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';

export function ProductSection({
  title,
  subtitle,
  products,
  badge,
  viewAllHref,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  badge?: 'bestseller' | 'promo';
  viewAllHref?: string;
  dark?: boolean;
}) {
  if (!products.length) return null;

  return (
    <section className={dark ? 'bg-noite py-16' : 'py-16'}>
      <div className="container-store">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              className={`font-display text-2xl font-medium sm:text-3xl ${
                dark ? 'text-ivory-100' : 'text-ink-700'
              }`}
            >
              {title}
            </h2>
            {subtitle && (
              <p className={`mt-1 text-sm ${dark ? 'text-ivory-200/60' : 'text-ink-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className={`flex items-center gap-1 text-sm font-medium ${
                dark ? 'text-dourado-300 hover:text-dourado-100' : 'text-dourado-700 hover:text-dourado-900'
              }`}
            >
              Ver todos <ArrowRight size={15} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} badge={badge} />
          ))}
        </div>
      </div>
    </section>
  );
}
