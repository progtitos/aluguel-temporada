'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Tag, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatCep, formatCurrency } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const couponCode = useCartStore((s) => s.couponCode);
  const discount = useCartStore((s) => s.discount);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    document: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<
    { method: string; label: string; price: number; deadlineDays: number }[]
  >([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [shippingLoading, setShippingLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shippingCost =
    shippingOptions.find((o) => o.method === selectedShipping)?.price ?? 0;
  const total = Math.max(0, subtotal - discount + shippingCost);

  function updateField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCalculateShipping() {
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setShippingLoading(true);
    setShippingOptions([]);
    try {
      const response = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: digits,
          items: items.map((i) => ({
            weightGrams: 250,
            heightCm: 10,
            widthCm: 10,
            lengthCm: 10,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setShippingOptions(data.options);
        setSelectedShipping(data.options[0]?.method ?? '');
      }
    } finally {
      setShippingLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const response = await fetch('/api/cupom/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const data = await response.json();
      if (data.valid) {
        applyCoupon(couponInput.trim().toUpperCase(), data.discount);
        setCouponMessage({ ok: true, text: data.message });
      } else {
        removeCoupon();
        setCouponMessage({ ok: false, text: data.message });
      }
    } catch {
      setCouponMessage({ ok: false, text: 'Erro ao validar o cupom.' });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedShipping) {
      setErrorMsg('Calcule e selecione uma opção de frete antes de continuar.');
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMsg('Informe seu nome e sobrenome.');
      return;
    }

    setSubmitting(true);
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: fullName,
            email: form.email,
            phone: form.phone,
            document: form.document,
          },
          shippingAddress: {
            cep: form.cep,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          },
          shippingMethod: selectedShipping,
          shippingCost,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: couponCode ?? undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Erro ao processar pedido.');

      if (data.checkoutUrl) {
        // Não limpamos o carrinho aqui: o pagamento ainda nem começou.
        // Se limpássemos agora, um pagamento recusado ou abandonado deixaria
        // o cliente com o carrinho vazio sem nunca ter pago nada. O carrinho
        // só é limpo quando o cliente realmente chega na página de sucesso
        // (ver ClearCartOnMount em /checkout/sucesso).
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Não recebemos o link de pagamento do Mercado Pago.');
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Não foi possível concluir o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-store py-20 text-center">
        <p className="text-ink-500">Sua sacola está vazia.</p>
        <button onClick={() => router.push('/produtos')} className="btn-primary mt-4">
          Ver produtos
        </button>
      </div>
    );
  }

  return (
    <div className="container-store py-10">
      <h1 className="mb-8 font-display text-3xl font-medium text-ink-700">Finalizar Compra</h1>

      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          {/* Dados pessoais */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-700">1. Seus dados</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required placeholder="Nome" className="input-store"
                value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
              <input required placeholder="Sobrenome" className="input-store"
                value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
              <input required type="email" placeholder="E-mail" className="input-store"
                value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              <input required placeholder="Telefone / WhatsApp" className="input-store"
                value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              <input placeholder="CPF (para nota e Pix)" className="input-store sm:col-span-2"
                value={form.document} onChange={(e) => updateField('document', e.target.value)} />
            </div>
          </section>

          {/* Endereço */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-700">2. Endereço de entrega</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex gap-2 sm:col-span-1">
                <input required placeholder="CEP" className="input-store" maxLength={9}
                  value={form.cep}
                  onChange={(e) => updateField('cep', formatCep(e.target.value))} />
              </div>
              <input required placeholder="Rua" className="input-store sm:col-span-2"
                value={form.street} onChange={(e) => updateField('street', e.target.value)} />
              <input required placeholder="Número" className="input-store"
                value={form.number} onChange={(e) => updateField('number', e.target.value)} />
              <input placeholder="Complemento" className="input-store"
                value={form.complement} onChange={(e) => updateField('complement', e.target.value)} />
              <input required placeholder="Bairro" className="input-store"
                value={form.neighborhood} onChange={(e) => updateField('neighborhood', e.target.value)} />
              <input required placeholder="Cidade" className="input-store"
                value={form.city} onChange={(e) => updateField('city', e.target.value)} />
              <input required placeholder="UF" maxLength={2} className="input-store"
                value={form.state} onChange={(e) => updateField('state', e.target.value.toUpperCase())} />
            </div>

            <button
              type="button"
              onClick={handleCalculateShipping}
              disabled={shippingLoading}
              className="btn-secondary mt-3"
            >
              {shippingLoading ? <Loader2 size={16} className="animate-spin" /> : 'Calcular frete'}
            </button>

            {shippingOptions.length > 0 && (
              <div className="mt-3 space-y-2">
                {shippingOptions.map((opt) => (
                  <label
                    key={opt.method}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-ink/15 px-3 py-2 text-sm has-[:checked]:border-dourado-500 has-[:checked]:bg-dourado-50"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shipping"
                        value={opt.method}
                        checked={selectedShipping === opt.method}
                        onChange={() => setSelectedShipping(opt.method)}
                      />
                      {opt.label} · até {opt.deadlineDays} dias úteis
                    </span>
                    <span className="font-semibold">{formatCurrency(opt.price)}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Pagamento */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-700">3. Forma de pagamento</h2>
            <div className="flex items-start gap-2 rounded-md border border-ink/15 bg-ivory-200/50 px-3 py-2.5 text-sm text-ink-500">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-dourado-700" />
              <span>
                Ao confirmar, você será redirecionado para o ambiente seguro do Mercado Pago,
                onde poderá escolher entre Pix, cartão de crédito, débito ou boleto.
              </span>
            </div>
          </section>
        </div>

        {/* Resumo do pedido */}
        <aside className="h-fit space-y-4 rounded-lg border border-ink/10 bg-ivory-200/50 p-5">
          <h2 className="text-sm font-semibold text-ink-700">Resumo do pedido</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-md bg-ivory-200">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="text-ink-700">{item.name}</p>
                  <p className="text-ink-300">Qtd: {item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-ink-700">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-t border-ink/10 pt-4">
            <input
              placeholder="Cupom de desconto"
              className="input-store"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} className="btn-secondary">
              <Tag size={16} />
            </button>
          </div>
          {couponMessage && (
            <p className={`flex items-center gap-1 text-xs ${couponMessage.ok ? 'text-dourado-700' : 'text-terracota-700'}`}>
              {couponMessage.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {couponMessage.text}
            </p>
          )}

          <div className="space-y-1.5 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-dourado-700">
                <span>Desconto</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-500">
              <span>Frete</span>
              <span>{shippingCost > 0 ? formatCurrency(shippingCost) : 'A calcular'}</span>
            </div>
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold text-ink-700">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {errorMsg && <p className="text-sm text-terracota-700">{errorMsg}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Ir para pagamento'}
          </button>
        </aside>
      </form>
    </div>
  );
}
