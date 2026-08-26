'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Coupon } from '@/types';

const RLS_SILENT_FAILURE_MESSAGE =
  'A operação não teve efeito no banco de dados — provavelmente as políticas de RLS da ' +
  'tabela "coupons" não estão aplicadas. Rode novamente o schema.sql no SQL Editor do ' +
  'Supabase e faça login de novo no painel.';

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    min_order_value: '',
    usage_limit: '',
    expires_at: '',
  });
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order_value: form.min_order_value ? Number(form.min_order_value) : 0,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }).select();
    setSaving(false);

    if (error) {
      toast.error(error.code === '23505' ? 'Já existe um cupom com esse código.' : error.message);
      return;
    }
    if (!data?.length) {
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }

    setForm({ code: '', type: 'percentage', value: '', min_order_value: '', usage_limit: '', expires_at: '' });
    toast.success('Cupom criado!');
    router.refresh();
  }

  async function toggleActive(coupon: Coupon) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id)
      .select();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.length) {
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }
    router.refresh();
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Remover o cupom "${coupon.code}"?`)) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('coupons').delete().eq('id', coupon.id).select();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.length) {
      toast.error(RLS_SILENT_FAILURE_MESSAGE, { duration: 8000 });
      return;
    }
    toast.success('Cupom removido.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-3 lg:grid-cols-6">
        <input
          placeholder="CÓDIGO"
          className="input-store uppercase sm:col-span-1"
          value={form.code}
          onChange={(e) => updateField('code', e.target.value)}
        />
        <select
          className="input-store"
          value={form.type}
          onChange={(e) => updateField('type', e.target.value as 'percentage' | 'fixed')}
        >
          <option value="percentage">Percentual (%)</option>
          <option value="fixed">Valor fixo (R$)</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={form.type === 'percentage' ? 'Ex: 10' : 'Ex: 20.00'}
          className="input-store"
          value={form.value}
          onChange={(e) => updateField('value', e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Pedido mínimo (opcional)"
          className="input-store"
          value={form.min_order_value}
          onChange={(e) => updateField('min_order_value', e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="Limite de uso (opcional)"
          className="input-store"
          value={form.usage_limit}
          onChange={(e) => updateField('usage_limit', e.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="date"
            className="input-store"
            value={form.expires_at}
            onChange={(e) => updateField('expires_at', e.target.value)}
          />
          <button type="submit" disabled={saving} className="btn-primary whitespace-nowrap">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink-300">
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Desconto</th>
              <th className="px-5 py-3">Uso</th>
              <th className="px-5 py-3">Validade</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-ink/10 last:border-0">
                <td className="px-5 py-3 font-medium text-ink-700">{coupon.code}</td>
                <td className="px-5 py-3 text-ink-500">
                  {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(2)}`}
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {coupon.used_count}
                  {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {coupon.expires_at ? formatDate(coupon.expires_at) : 'Sem prazo'}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleActive(coupon)}
                    className={`rounded-full px-2 py-1 text-xs ${
                      coupon.is_active ? 'bg-dourado-50 text-dourado-700' : 'bg-ink/5 text-ink-300'
                    }`}
                  >
                    {coupon.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleDelete(coupon)} className="text-ink-500 hover:text-terracota-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!coupons.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-300">
                  Nenhum cupom cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
