'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { FulfillmentStatus, PaymentStatus } from '@/types';

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  rejected: 'Recusado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  pending: 'Pendente',
  processing: 'Em preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function OrderStatusControls({
  orderId,
  paymentStatus,
  fulfillmentStatus,
  trackingCode,
}: {
  orderId: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [payment, setPayment] = useState(paymentStatus);
  const [fulfillment, setFulfillment] = useState(fulfillmentStatus);
  const [tracking, setTracking] = useState(trackingCode ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: payment,
        fulfillment_status: fulfillment,
        tracking_code: tracking || null,
      })
      .eq('id', orderId);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Pedido atualizado!');
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-ink/10 bg-white p-5">
      <h3 className="text-sm font-semibold text-ink-700">Status do pedido</h3>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-500">Pagamento</label>
        <select
          className="input-store"
          value={payment}
          onChange={(e) => setPayment(e.target.value as PaymentStatus)}
        >
          {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-500">Envio</label>
        <select
          className="input-store"
          value={fulfillment}
          onChange={(e) => setFulfillment(e.target.value as FulfillmentStatus)}
        >
          {Object.entries(FULFILLMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-500">Código de rastreio</label>
        <input
          className="input-store"
          placeholder="Ex: BR123456789BR"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar alterações'}
      </button>
    </div>
  );
}
