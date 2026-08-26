import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';

/**
 * Calcula os produtos mais vendidos com base nos itens de pedidos pagos
 * (order_items + orders.payment_status = 'paid'), somando as quantidades
 * por produto e retornando os mais vendidos primeiro.
 *
 * Se a loja ainda não tiver vendas registradas, retorna uma lista vazia —
 * a página inicial trata esse caso usando produtos em destaque como fallback.
 */
export async function getBestSellers(
  supabase: SupabaseClient,
  limit = 8
): Promise<Product[]> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, orders!inner(payment_status)')
    .eq('orders.payment_status', 'paid');

  if (error || !items?.length) return [];

  const totals = new Map<string, number>();
  for (const item of items as any[]) {
    if (!item.product_id) continue;
    totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
  }

  const rankedIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId);

  if (!rankedIds.length) return [];

  const { data: products } = await supabase
    .from('products')
    .select('*, categories(*)')
    .in('id', rankedIds)
    .eq('is_active', true);

  if (!products?.length) return [];

  // Preserva a ordem de mais vendido -> menos vendido.
  const byId = new Map(products.map((p: any) => [p.id, p as Product]));
  return rankedIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
}

/**
 * Produtos em promoção: possuem um "compare_at_price" (preço "de") maior
 * que o preço atual, ou seja, estão com desconto ativo.
 */
export async function getPromotions(
  supabase: SupabaseClient,
  limit = 8
): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('is_active', true)
    .not('compare_at_price', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit * 3); // busca uma margem maior, pois filtramos no client abaixo

  const promotions = (data as any[] | null)?.filter(
    (p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
  );

  return ((promotions ?? []).slice(0, limit)) as Product[];
}
