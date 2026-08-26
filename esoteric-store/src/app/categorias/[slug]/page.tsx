import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product/ProductCard';
import { getDescendantIds } from '@/lib/categories';
import type { Category, Product } from '@/types';

export const revalidate = 60;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!category) notFound();

  // Categorias com subcategorias (ex: Acessórios > Pulseiras > Correntes)
  // também mostram os produtos cadastrados diretamente nas subcategorias,
  // não só os que apontam para o category_id exato da categoria visitada.
  const { data: allCategories } = await supabase.from('categories').select('*');
  const descendantIds = allCategories
    ? getDescendantIds(allCategories as Category[], category.id)
    : [];
  const categoryIds = [category.id, ...descendantIds];

  const { data: products } = await supabase
    .from('products')
    .select('*, categories(*)')
    .in('category_id', categoryIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="container-store py-10">
      <div className="mb-10 text-center">
        <span className="eyebrow">Categoria</span>
        <h1 className="mt-1 font-display text-4xl font-medium text-ink-700">
          {category.name}
        </h1>
        {category.description && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-500">{category.description}</p>
        )}
      </div>

      {!products?.length ? (
        <p className="py-16 text-center text-sm text-ink-300">
          Em breve novos produtos nesta categoria.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {(products as Product[]).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
