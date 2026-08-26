import type { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';

export function FeaturedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section className="container-store py-16">
      <div className="constellation-divider mb-10">
        <span className="whitespace-nowrap font-display text-2xl text-ink-700">
          Produtos em Destaque
        </span>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
