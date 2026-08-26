import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product/ProductCard';
import type { Category, Product } from '@/types';
import { cn } from '@/lib/utils';

export const revalidate = 60;

type SearchParams = {
  categoria?: string;
  busca?: string;
  ordenar?: 'menor-preco' | 'maior-preco' | 'recentes';
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  let query = supabase
    .from('products')
    .select('*, categories(*)')
    .eq('is_active', true);

  if (params.categoria) {
    const category = (categories as Category[] | null)?.find(
      (c) => c.slug === params.categoria
    );
    if (category) query = query.eq('category_id', category.id);
  }

  if (params.busca) {
    query = query.ilike('name', `%${params.busca}%`);
  }

  switch (params.ordenar) {
    case 'menor-preco':
      query = query.order('price', { ascending: true });
      break;
    case 'maior-preco':
      query = query.order('price', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data: products } = await query;

  return (
    <div className="container-store py-10">
      <div className="mb-8">
        <span className="eyebrow">Catálogo</span>
        <h1 className="mt-1 font-display text-3xl font-medium text-ink-700">
          {params.busca ? `Resultados para "${params.busca}"` : 'Todos os Produtos'}
        </h1>
      </div>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-700">Categorias</h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/produtos"
                  className={cn(
                    'block rounded-md px-3 py-1.5 text-sm text-ink-500 hover:bg-dourado-50',
                    !params.categoria && 'bg-dourado-50 text-dourado-700'
                  )}
                >
                  Todas
                </Link>
              </li>
              {(categories as Category[] | null)?.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/produtos?categoria=${cat.slug}`}
                    className={cn(
                      'block rounded-md px-3 py-1.5 text-sm text-ink-500 hover:bg-dourado-50',
                      params.categoria === cat.slug && 'bg-dourado-50 text-dourado-700'
                    )}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-700">Ordenar por</h3>
            <ul className="space-y-1">
              {[
                { value: undefined, label: 'Mais recentes' },
                { value: 'menor-preco', label: 'Menor preço' },
                { value: 'maior-preco', label: 'Maior preço' },
              ].map((opt) => {
                const sp = new URLSearchParams();
                if (params.categoria) sp.set('categoria', params.categoria);
                if (opt.value) sp.set('ordenar', opt.value);
                const href = `/produtos${sp.toString() ? `?${sp.toString()}` : ''}`;
                return (
                  <li key={opt.label}>
                    <Link
                      href={href}
                      className={cn(
                        'block rounded-md px-3 py-1.5 text-sm text-ink-500 hover:bg-dourado-50',
                        params.ordenar === opt.value && 'bg-dourado-50 text-dourado-700'
                      )}
                    >
                      {opt.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <div>
          {!products?.length ? (
            <p className="py-16 text-center text-sm text-ink-300">
              Nenhum produto encontrado com esses filtros.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {(products as Product[]).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
