import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/admin/ProductForm';
import type { Category, Product } from '@/types';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('categories').select('*').order('sort_order'),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium text-ink-700">Editar Produto</h1>
      <ProductForm product={product as Product} categories={(categories as Category[]) ?? []} />
    </div>
  );
}
