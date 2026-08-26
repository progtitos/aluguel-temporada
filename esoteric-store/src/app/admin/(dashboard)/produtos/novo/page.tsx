import { createAdminClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/admin/ProductForm';
import type { Category } from '@/types';

export default async function NewProductPage() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium text-ink-700">Novo Produto</h1>
      <ProductForm categories={(categories as Category[]) ?? []} />
    </div>
  );
}
