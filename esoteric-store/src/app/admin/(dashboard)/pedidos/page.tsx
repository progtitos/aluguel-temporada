import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

const PAYMENT_STYLES: Record<string, string> = {
  pending: 'bg-gold-300/40 text-terracota-700',
  paid: 'bg-dourado-50 text-dourado-700',
  rejected: 'bg-terracota-100 text-terracota-700',
  refunded: 'bg-ink/5 text-ink-500',
  cancelled: 'bg-ink/5 text-ink-300',
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('payment_status', status);

  const { data: orders } = await query;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-ink-700">Pedidos</h1>
        <div className="flex gap-2 text-xs">
          {['', 'pending', 'paid', 'shipped'].map((s) => (
            <Link
              key={s || 'all'}
              href={s ? `/admin/pedidos?status=${s}` : '/admin/pedidos'}
              className={`rounded-full px-3 py-1.5 ${
                status === s || (!status && !s)
                  ? 'bg-dourado-700 text-ivory-100'
                  : 'bg-white text-ink-500 border border-ink/10'
              }`}
            >
              {s === '' ? 'Todos' : s === 'pending' ? 'Pendentes' : s === 'paid' ? 'Pagos' : 'Enviados'}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink-300">
              <th className="px-5 py-3">Pedido</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Pagamento</th>
              <th className="px-5 py-3">Envio</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((order: any) => (
              <tr key={order.id} className="border-b border-ink/10 last:border-0">
                <td className="px-5 py-3 font-medium text-ink-700">{order.order_number}</td>
                <td className="px-5 py-3 text-ink-500">
                  {order.customer_name ?? (
                    <span className="text-terracota-700">
                      {order.order_source === 'quick_buy'
                        ? 'Aguardando dados (compra rápida)'
                        : '—'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-ink-500">{formatDate(order.created_at)}</td>
                <td className="px-5 py-3 text-ink-500">{formatCurrency(order.total)}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${PAYMENT_STYLES[order.payment_status]}`}>
                    {order.payment_status}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-500">{order.fulfillment_status}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/pedidos/${order.id}`} className="text-xs font-medium text-dourado-700 hover:underline">
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-ink-300">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
