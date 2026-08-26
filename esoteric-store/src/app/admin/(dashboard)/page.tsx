import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { Package, ShoppingCart, Tag, DollarSign } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [{ count: productCount }, { count: orderCount }, { data: paidOrders }, { count: couponCount }] =
    await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total').eq('payment_status', 'paid'),
      supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

  const revenue = (paidOrders ?? []).reduce((sum: number, o: any) => sum + Number(o.total), 0);

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const cards = [
    { label: 'Faturamento (pagos)', value: formatCurrency(revenue), icon: DollarSign },
    { label: 'Pedidos', value: orderCount ?? 0, icon: ShoppingCart },
    { label: 'Produtos ativos', value: productCount ?? 0, icon: Package },
    { label: 'Cupons ativos', value: couponCount ?? 0, icon: Tag },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium text-ink-700">Visão Geral</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-ink/10 bg-white p-5">
            <card.icon size={20} className="mb-3 text-dourado-700" />
            <p className="text-2xl font-semibold text-ink-700">{card.value}</p>
            <p className="text-xs text-ink-300">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-ink/10 bg-white">
        <h2 className="border-b border-ink/10 px-5 py-4 text-sm font-semibold text-ink-700">
          Últimos pedidos
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-ink-300">
              <th className="px-5 py-2">Pedido</th>
              <th className="px-5 py-2">Cliente</th>
              <th className="px-5 py-2">Endereço</th>
              <th className="px-5 py-2">Frete</th>
              <th className="px-5 py-2">Cupom</th>
              <th className="px-5 py-2">Total</th>
              <th className="px-5 py-2">Pagamento</th>
              <th className="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(recentOrders ?? []).map((order: any) => {
              const address = order.shipping_address as any;
              return (
                <tr key={order.id} className="border-t border-ink/10">
                  <td className="px-5 py-3 font-medium text-ink-700">{order.order_number}</td>
                  <td className="px-5 py-3 text-ink-500">
                    <p>{order.customer_name ?? '—'}</p>
                    <p className="text-xs text-ink-300">{order.customer_email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-500">
                    {address?.city ? `${address.city}/${address.state ?? ''}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-ink-500">
                    {order.shipping_method ? (
                      <>
                        {order.shipping_method}
                        <br />
                        <span className="text-xs text-ink-300">{formatCurrency(order.shipping_cost)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-500">
                    {order.coupon_code ? (
                      <>
                        {order.coupon_code}
                        <br />
                        <span className="text-xs text-dourado-700">- {formatCurrency(order.discount)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-500">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-dourado-50 px-2 py-1 text-xs text-dourado-700">
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="text-xs font-medium text-dourado-700 hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!recentOrders?.length && (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-center text-ink-300">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
