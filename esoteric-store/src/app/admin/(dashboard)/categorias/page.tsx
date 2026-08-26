import { createAdminClient } from '@/lib/supabase/server';
import { CategoryManager } from '@/components/admin/CategoryManager';
import type { Category } from '@/types';

export default async function AdminCategoriesPage() {
  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium text-ink-700">
        Categorias & Seções
      </h1>
      <CategoryManager categories={(categories as Category[]) ?? []} />
    </div>
  );
}
