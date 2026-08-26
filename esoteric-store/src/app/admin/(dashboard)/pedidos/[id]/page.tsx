import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrderStatusControls } from '@/components/admin/OrderStatusControls';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*').eq('order_id', id),
  ]);

  if (!order) notFound();

  const address = order.shipping_address as any;
  const needsAddressFollowUp = order.order_source === 'quick_buy' && !address?.street;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink-700">
            Pedido {order.order_number}
          </h1>
          <p className="text-xs text-ink-300">Criado em {formatDate(order.created_at)}</p>
        </div>
      </div>

      {needsAddressFollowUp && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-terracota-700/30 bg-terracota-100/40 p-4 text-sm text-terracota-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Pedido de compra rápida — endereço pendente</p>
            <p className="mt-1">
              Este pedido veio direto da sacola lateral, sem passar pelo formulário de
              frete. Entre em contato com o cliente pelo e-mail abaixo para confirmar o
              endereço de entrega antes de despachar.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-ink/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Itens do pedido</h2>
            <table className="w-full text-sm">
              <tbody>
                {(items ?? []).map((item: any) => (
                  <tr key={item.id} className="border-b border-ink/10 last:border-0">
                    <td className="py-2 text-ink-700">{item.product_name}</td>
                    <td className="py-2 text-center text-ink-500">x{item.quantity}</td>
                    <td className="py-2 text-right text-ink-700">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1 border-t border-ink/10 pt-3 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-dourado-700">
                  <span>Desconto {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                  <span>- {formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-500">
                <span>Frete ({order.shipping_method})</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold text-ink-700">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Cliente</h2>
            {order.customer_name || order.customer_email ? (
              <>
                <p className="text-sm text-ink-700">{order.customer_name ?? '—'}</p>
                <p className="text-sm text-ink-500">{order.customer_email ?? '—'}</p>
                {order.customer_phone && <p className="text-sm text-ink-500">{order.customer_phone}</p>}
                {order.customer_document && <p className="text-sm text-ink-500">CPF: {order.customer_document}</p>}
              </>
            ) : (
              <p className="text-sm text-ink-300">
                Ainda não informado — aguardando confirmação do pagamento.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Endereço de entrega</h2>
            {address?.street ? (
              <p className="text-sm text-ink-500">
                {address.street}, {address.number} {address.complement ? `- ${address.complement}` : ''}
                <br />
                {address.neighborhood} — {address.city}/{address.state}
                <br />
                CEP: {address.cep}
              </p>
            ) : address?.city ? (
              <p className="text-sm text-ink-500">
                Endereço parcial coletado pelo Mercado Pago: {address.city}
                {address.state ? `/${address.state}` : ''}. Confirme rua, número e CEP com
                o cliente.
              </p>
            ) : (
              <p className="text-sm text-ink-300">
                Ainda não informado — aguardando confirmação do pagamento.
              </p>
            )}
          </section>
        </div>

        <OrderStatusControls
          orderId={order.id}
          paymentStatus={order.payment_status}
          fulfillmentStatus={order.fulfillment_status}
          trackingCode={order.tracking_code}
        />
      </div>
    </div>
  );
}
