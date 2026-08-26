import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/types';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;

  return (
    <section className="container-store py-16">
      <div className="constellation-divider mb-10">
        <span className="whitespace-nowrap font-display text-2xl text-ink-700">
          Explore por Categoria
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/categorias/${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-lg border border-ink/10 bg-white p-4 text-center transition-shadow hover:shadow-card"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-dourado-50">
              {cat.image_url && (
                <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
              )}
            </div>
            <span className="text-sm font-medium text-ink-700 group-hover:text-dourado-700">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
