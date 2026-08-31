"use client";

import { useState } from "react";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Coupon } from "@/types/database";

export default function AdminCouponsManager({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "fixed" | "percentage",
    value: "",
    usage_limit: "1",
    valid_until: "",
    min_nights: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function createCoupon() {
    setMessage(null);
    if (!form.code.trim()) {
      setMessage("Informe o código do cupom.");
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      setMessage("Informe um valor de desconto maior que zero.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : 1,
        valid_until: form.valid_until || null,
        min_nights: form.min_nights ? Number(form.min_nights) : null,
      }),
    });
    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      setCoupons((list) => [data, ...list]);
      setForm({ code: "", type: "percentage", value: "", usage_limit: "1", valid_until: "", min_nights: "" });
      setMessage("Cupom criado.");
    } else {
      const err = await res.json();
      setMessage(err.error ?? "Erro ao criar cupom.");
    }
  }

  async function toggleActive(coupon: Coupon) {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !coupon.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCoupons((list) => list.map((c) => (c.id === coupon.id ? updated : c)));
    }
  }

  async function removeCoupon(id: string) {
    const confirmed = window.confirm("Excluir este cupom? Essa ação não pode ser desfeita.");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCoupons((list) => list.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Cupons de desconto</h1>
      {message && <p className="text-sm text-forest-700">{message}</p>}

      {/* Criação */}
      <section className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
        <h2 className="font-display text-lg font-semibold text-ink">Novo cupom</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Código
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2 uppercase"
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              placeholder="VERAO10"
            />
          </label>
          <label className="text-sm">
            Tipo de desconto
            <select
              className="mt-1 w-full rounded-lg border border-forest-100 bg-white p-2"
              value={form.type}
              onChange={(e) => update("type", e.target.value as "fixed" | "percentage")}
            >
              <option value="percentage">Porcentagem (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </label>
          <label className="text-sm">
            {form.type === "percentage" ? "Desconto (%)" : "Desconto (R$)"}
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.value}
              onChange={(e) => update("value", e.target.value)}
              placeholder={form.type === "percentage" ? "10" : "50.00"}
            />
          </label>
          <label className="text-sm">
            Limite de usos
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.usage_limit}
              onChange={(e) => update("usage_limit", e.target.value)}
            />
            <span className="mt-1 block text-xs text-ink/40">
              O cupom é consumido automaticamente a cada reserva confirmada.
            </span>
          </label>
          <label className="text-sm">
            Válido até (opcional)
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.valid_until}
              onChange={(e) => update("valid_until", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Estadia mínima em noites (opcional)
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.min_nights}
              onChange={(e) => update("min_nights", e.target.value)}
            />
          </label>
        </div>
        <button
          onClick={createCoupon}
          disabled={saving}
          className="mt-4 rounded-full bg-forest-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Criando..." : "Criar cupom"}
        </button>
      </section>

      {/* Lista */}
      <section className="rounded-xl2 bg-white shadow-soft ring-1 ring-forest-100">
        <h2 className="border-b border-forest-100 p-5 pb-3 font-display text-lg font-semibold text-ink">
          Cupons cadastrados
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-forest-50 text-ink/50">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-forest-100">
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === "percentage" ? `${c.value}%` : formatBRL(Number(c.value))}
                    {c.min_nights && (
                      <span className="block text-xs text-ink/40">mín. {c.min_nights} noites</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.used_count} / {c.usage_limit}
                  </td>
                  <td className="px-4 py-3">
                    {c.valid_until ? formatDate(c.valid_until) : "Sem prazo"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        c.is_active
                          ? "bg-forest-100 text-forest-700"
                          : "bg-ink/10 text-ink/50"
                      }`}
                    >
                      {c.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleActive(c)}
                        className="text-xs font-medium text-forest-700 hover:underline"
                      >
                        {c.is_active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => removeCoupon(c.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                    Nenhum cupom cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
