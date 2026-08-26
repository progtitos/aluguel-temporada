import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { DeleteProductButton } from '@/components/admin/DeleteProductButton';

export default async function AdminProductsPage() {
  const supabase = createAdminClient();
  const { data: products } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-ink-700">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn-primary">
          <Plus size={18} /> Novo Produto
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink-300">
              <th className="px-5 py-3">Produto</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Preço</th>
              <th className="px-5 py-3">Estoque</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product: any) => (
              <tr key={product.id} className="border-b border-ink/10 last:border-0">
                <td className="flex items-center gap-3 px-5 py-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-md bg-ivory-200">
                    {product.images?.[0] && (
                      <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                    )}
                  </div>
                  <span className="font-medium text-ink-700">{product.name}</span>
                </td>
                <td className="px-5 py-3 text-ink-500">{product.categories?.name ?? '—'}</td>
                <td className="px-5 py-3 text-ink-500">{formatCurrency(product.price)}</td>
                <td className="px-5 py-3 text-ink-500">{product.stock}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      product.is_active
                        ? 'bg-dourado-50 text-dourado-700'
                        : 'bg-ink/5 text-ink-300'
                    }`}
                  >
                    {product.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/produtos/${product.id}`}
                      className="text-xs font-medium text-dourado-700 hover:underline"
                    >
                      Editar
                    </Link>
                    <DeleteProductButton productId={product.id} />
                  </div>
                </td>
              </tr>
            ))}
            {!products?.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-300">
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
