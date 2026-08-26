'use client';

import { useState } from 'react';
import {
  Loader2,
  Search,
  PackageCheck,
  Truck,
  Clock,
  XCircle,
  CheckCircle2,
  PackageX,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type TrackedOrder = {
  orderNumber: string;
  customerName: string | null;
  shippingAddress: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  shippingCost: number;
  shippingMethod: string | null;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'rejected' | 'refunded' | 'cancelled';
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingCode: string | null;
  createdAt: string;
  items: { product_name: string; unit_price: number; quantity: number; total: number }[];
};

const PAYMENT_LABELS: Record<TrackedOrder['paymentStatus'], string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  rejected: 'Pagamento recusado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

const FULFILLMENT_STEPS: { key: TrackedOrder['fulfillmentStatus']; label: string; icon: any }[] = [
  { key: 'pending', label: 'Pedido recebido', icon: Clock },
  { key: 'processing', label: 'Em preparação', icon: PackageCheck },
  { key: 'shipped', label: 'Enviado', icon: Truck },
  { key: 'delivered', label: 'Entregue', icon: CheckCircle2 },
];

export default function AcompanharPedidoPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const response = await fetch('/api/pedido/rastrear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Pedido não encontrado.');
      setOrder(data);
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível buscar o pedido.');
    } finally {
      setLoading(false);
    }
  }

  const address = order?.shippingAddress;
  const isCancelledLike = order && ['rejected', 'refunded', 'cancelled'].includes(order.paymentStatus);
  const currentStepIndex = order
    ? FULFILLMENT_STEPS.findIndex((s) => s.key === order.fulfillmentStatus)
    : -1;

  return (
    <div className="container-store max-w-2xl py-12">
      <div className="mb-8 text-center">
        <span className="eyebrow">Acompanhamento</span>
        <h1 className="mt-1 font-display text-3xl font-medium text-ink-700">Acompanhar pedido</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Informe o número do pedido (enviado por e-mail após a compra) e o e-mail usado no
          checkout para ver o status da sua entrega.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-5 sm:flex-row">
        <input
          required
          placeholder="Número do pedido (ex: 20260825-a1b2c3)"
          className="input-store"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        <input
          required
          type="email"
          placeholder="E-mail usado na compra"
          className="input-store"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </form>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-terracota-100 px-4 py-3 text-sm text-terracota-700">
          <XCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {order && (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-300">Pedido</p>
                <p className="font-display text-lg font-medium text-ink-700">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-300">Feito em</p>
                <p className="text-sm text-ink-500">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            <div
              className={`mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                order.paymentStatus === 'paid'
                  ? 'bg-dourado-50 text-dourado-700'
                  : isCancelledLike
                    ? 'bg-terracota-100 text-terracota-700'
                    : 'bg-ink/5 text-ink-500'
              }`}
            >
              {order.paymentStatus === 'paid' ? (
                <CheckCircle2 size={16} />
              ) : isCancelledLike ? (
                <PackageX size={16} />
              ) : (
                <Clock size={16} />
              )}
              {PAYMENT_LABELS[order.paymentStatus]}
            </div>

            {!isCancelledLike && (
              <div className="flex items-center justify-between">
                {FULFILLMENT_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isDone = index <= currentStepIndex;
                  return (
                    <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                      <div className="flex w-full items-center">
                        {index > 0 && (
                          <div className={`h-0.5 flex-1 ${isDone ? 'bg-dourado-500' : 'bg-ink/10'}`} />
                        )}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isDone ? 'bg-dourado-700 text-ivory-100' : 'bg-ink/5 text-ink-300'
                          }`}
                        >
                          <Icon size={14} />
                        </div>
                        {index < FULFILLMENT_STEPS.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 ${index < currentStepIndex ? 'bg-dourado-500' : 'bg-ink/10'}`}
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-ink-500">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {order.trackingCode && (
              <p className="mt-4 rounded-md bg-ivory-200/60 px-3 py-2 text-sm text-ink-700">
                Código de rastreio: <span className="font-semibold">{order.trackingCode}</span>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-700">Itens</h2>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink-500">{item.quantity}x {item.product_name}</span>
                  <span className="text-ink-700">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-ink/10 pt-3 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-dourado-700">
                  <span>Desconto {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>- {formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-500">
                <span>Frete {order.shippingMethod ? `(${order.shippingMethod})` : ''}</span>
                <span>{formatCurrency(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold text-ink-700">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink-700">Endereço de entrega</h2>
            {address?.street ? (
              <p className="text-sm text-ink-500">
                {address.street}, {address.number} {address.complement ? `- ${address.complement}` : ''}
                <br />
                {address.neighborhood} — {address.city}/{address.state}
                <br />
                CEP: {address.cep}
              </p>
            ) : (
              <p className="text-sm text-ink-300">Endereço ainda não confirmado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
