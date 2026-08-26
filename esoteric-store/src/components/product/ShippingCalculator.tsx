'use client';

import { useState } from 'react';
import { Truck, Loader2 } from 'lucide-react';
import { formatCep, formatCurrency } from '@/lib/utils';
import type { Product, ShippingOption } from '@/types';

export function ShippingCalculator({ product }: { product: Product }) {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingOption[] | null>(null);

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setError('Digite um CEP válido com 8 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setOptions(null);

    try {
      const response = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: digits,
          items: [
            {
              weightGrams: product.weight_grams,
              heightCm: product.height_cm,
              widthCm: product.width_cm,
              lengthCm: product.length_cm,
              quantity: 1,
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Erro ao calcular o frete.');
      setOptions(data.options);
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível calcular o frete agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-ivory-200/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-700">
        <Truck size={16} className="text-dourado-700" />
        Calcular frete e prazo de entrega
      </div>
      <form onSubmit={handleCalculate} className="flex gap-2">
        <input
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          className="input-store"
        />
        <button type="submit" disabled={loading} className="btn-secondary whitespace-nowrap">
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Calcular'}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-terracota-700">{error}</p>}

      {options && (
        <ul className="mt-3 space-y-2">
          {options.map((opt) => (
            <li
              key={opt.method}
              className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
            >
              <span className="text-ink-500">
                {opt.label} · até {opt.deadlineDays} dias úteis
              </span>
              <span className="font-semibold text-ink-700">{formatCurrency(opt.price)}</span>
            </li>
          ))}
        </ul>
      )}

      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-xs text-ink-300 underline hover:text-dourado-700"
      >
        Não sei meu CEP
      </a>
    </div>
  );
}
