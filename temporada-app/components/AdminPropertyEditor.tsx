"use client";

import { useState } from "react";
import Image from "next/image";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { ptBR } from "@/lib/dateLocale";
import { formatBRL, formatDate, toISODate } from "@/lib/utils";
import { useAdminProperties } from "@/components/AdminPropertiesProvider";
import type { PricingRule, Property } from "@/types/database";

type BlockedBooking = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string | null;
};

export default function AdminPropertyEditor({
  property,
  bookings,
  pricingRules,
}: {
  property: Property;
  bookings: BlockedBooking[];
  pricingRules: PricingRule[];
}) {
  const { updatePropertyName } = useAdminProperties();

  const [form, setForm] = useState({
    name: property.name,
    short_description: property.short_description ?? "",
    description: property.description ?? "",
    house_rules: property.house_rules ?? "",
    address_approx: property.address_approx ?? "",
    address_full: property.address_full ?? "",
    checkin_time: property.checkin_time,
    checkout_time: property.checkout_time,
    preco_semana: property.preco_semana,
    preco_fds: property.preco_fds,
    cleaning_fee: property.cleaning_fee,
    max_guests: property.max_guests,
    is_active: property.is_active,
  });
  const [photos, setPhotos] = useState<string[]>(property.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [blockRange, setBlockRange] = useState<DateRange | undefined>();
  const [blockedList, setBlockedList] = useState(bookings);
  const [rules, setRules] = useState(pricingRules);
  const [newRule, setNewRule] = useState({
    name: "",
    start_date: "",
    end_date: "",
    price_per_night: "",
    min_nights: "1",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(value: string) {
    update("name", value);
    // Reflete instantaneamente na sidebar e (via prop já local) no título
    // desta própria página, sem esperar o clique em "Salvar".
    updatePropertyName(property.id, value);
  }

  async function saveDetails() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/admin/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMessage(res.ok ? "Alterações salvas." : "Erro ao salvar.");
  }

  async function uploadPhotos(files: FileList) {
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    const res = await fetch(`/api/admin/properties/${property.id}/photos`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos);
    } else {
      setMessage("Erro ao enviar uma ou mais fotos.");
    }
  }

  async function removePhoto(photoUrl: string) {
    const res = await fetch(`/api/admin/properties/${property.id}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos);
    }
  }

  async function createBlock() {
    if (!blockRange?.from || !blockRange?.to) return;
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: property.id,
        check_in: toISODate(blockRange.from),
        check_out: toISODate(blockRange.to),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setBlockedList((list) => [...list, data]);
      setBlockRange(undefined);
    } else {
      const err = await res.json();
      setMessage(err.error ?? "Erro ao bloquear datas.");
    }
  }

  async function removeBlock(id: string) {
    const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBlockedList((list) => list.filter((b) => b.id !== id));
    }
  }

  async function createRule() {
    if (!newRule.name || !newRule.start_date || !newRule.end_date || !newRule.price_per_night) {
      setMessage("Preencha todos os campos da regra de feriado.");
      return;
    }
    const res = await fetch("/api/admin/pricing-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: property.id,
        name: newRule.name,
        start_date: newRule.start_date,
        end_date: newRule.end_date,
        price_per_night: Number(newRule.price_per_night),
        min_nights: Number(newRule.min_nights) || 1,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRules((list) => [...list, data]);
      setNewRule({ name: "", start_date: "", end_date: "", price_per_night: "", min_nights: "1" });
    } else {
      const err = await res.json();
      setMessage(err.error ?? "Erro ao criar regra de feriado.");
    }
  }

  async function removeRule(id: string) {
    const res = await fetch(`/api/admin/pricing-rules/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRules((list) => list.filter((r) => r.id !== id));
    }
  }

  const disabledDates = blockedList.map((b) => ({
    from: new Date(b.check_in + "T00:00:00"),
    to: new Date(new Date(b.check_out + "T00:00:00").getTime() - 86400000),
  }));

  return (
    <div className="max-w-3xl space-y-8">
      {/* O título usa `form.name` (estado local), então também acompanha
          a digitação em tempo real nesta mesma página. */}
      <h1 className="font-display text-2xl font-semibold text-ink">{form.name}</h1>
      {message && <p className="text-sm text-forest-700">{message}</p>}

      {/* Fotos */}
      <section className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
        <h2 className="font-display text-lg font-semibold text-ink">Fotos</h2>
        <p className="mt-1 text-sm text-ink/50">
          Sem limite de quantidade — selecione várias de uma vez.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-lg">
              <Image src={url} alt="Foto do imóvel" fill className="object-cover" />
              <button
                onClick={() => removePhoto(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-forest-100 text-center text-xs text-ink/50 hover:bg-forest-50">
            {uploading ? "Enviando..." : "+ Fotos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && e.target.files.length > 0 && uploadPhotos(e.target.files)}
            />
          </label>
        </div>
      </section>

      {/* Dados */}
      <section className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
        <h2 className="font-display text-lg font-semibold text-ink">Dados do imóvel</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Nome
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Descrição curta
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.short_description}
              onChange={(e) => update("short_description", e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Descrição completa
            <textarea
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Regras da casa
            <textarea
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              rows={3}
              value={form.house_rules}
              onChange={(e) => update("house_rules", e.target.value)}
            />
          </label>

          <label className="text-sm">
            Horário de check-in
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.checkin_time}
              onChange={(e) => update("checkin_time", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Horário de check-out
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.checkout_time}
              onChange={(e) => update("checkout_time", e.target.value)}
            />
          </label>

          <label className="text-sm">
            Localização (label curto, ex: "Praia Grande, SP")
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.address_approx}
              onChange={(e) => update("address_approx", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Endereço completo
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.address_full}
              onChange={(e) => update("address_full", e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF, CEP"
            />
          </label>

          <label className="text-sm">
            Preço/diária — Segunda a Quinta (R$)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.preco_semana}
              onChange={(e) => update("preco_semana", Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Preço/diária — Sexta a Domingo (R$)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.preco_fds}
              onChange={(e) => update("preco_fds", Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Taxa de limpeza (R$)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.cleaning_fee}
              onChange={(e) => update("cleaning_fee", Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Hóspedes máximos
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.max_guests}
              onChange={(e) => update("max_guests", Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
            />
            Anúncio visível no site
          </label>
        </div>
        <button
          onClick={saveDetails}
          disabled={saving}
          className="mt-4 rounded-full bg-forest-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </section>

      {/* Regras de feriado / pacotes */}
      <section className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
        <h2 className="font-display text-lg font-semibold text-ink">
          Datas comemorativas e pacotes (Natal, Ano Novo, etc.)
        </h2>
        <p className="mt-1 text-sm text-ink/50">
          Enquanto o período estiver dentro do intervalo, o preço da regra
          substitui a tarifa padrão de semana/fim de semana.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input
            className="rounded-lg border border-forest-100 p-2 text-sm sm:col-span-2"
            placeholder="Nome (ex: Ano Novo)"
            value={newRule.name}
            onChange={(e) => setNewRule((r) => ({ ...r, name: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-lg border border-forest-100 p-2 text-sm"
            value={newRule.start_date}
            onChange={(e) => setNewRule((r) => ({ ...r, start_date: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-lg border border-forest-100 p-2 text-sm"
            value={newRule.end_date}
            onChange={(e) => setNewRule((r) => ({ ...r, end_date: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            className="rounded-lg border border-forest-100 p-2 text-sm"
            placeholder="R$/noite"
            value={newRule.price_per_night}
            onChange={(e) => setNewRule((r) => ({ ...r, price_per_night: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            className="rounded-lg border border-forest-100 p-2 text-sm sm:col-span-2"
            placeholder="Mín. de noites (padrão 1)"
            value={newRule.min_nights}
            onChange={(e) => setNewRule((r) => ({ ...r, min_nights: e.target.value }))}
          />
          <button
            onClick={createRule}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white sm:col-span-3"
          >
            Adicionar regra
          </button>
        </div>

        <ul className="mt-4 divide-y divide-forest-100 text-sm">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span>
                <strong>{r.name}</strong> · {formatDate(r.start_date)} → {formatDate(r.end_date)}{" "}
                · {formatBRL(Number(r.price_per_night))}/noite
                {r.min_nights > 1 && ` · mín. ${r.min_nights} noites`}
              </span>
              <button
                onClick={() => removeRule(r.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
          {rules.length === 0 && (
            <li className="py-2 text-ink/40">Nenhuma regra cadastrada.</li>
          )}
        </ul>
      </section>

      {/* Bloqueio de datas */}
      <section className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
        <h2 className="font-display text-lg font-semibold text-ink">
          Bloquear datas no calendário
        </h2>
        <p className="mt-1 text-sm text-ink/50">
          Use para reservas feitas fora da plataforma ou manutenção.
        </p>
        <div className="mt-3 overflow-x-auto">
          <DayPicker
            mode="range"
            locale={ptBR}
            selected={blockRange}
            onSelect={setBlockRange}
            disabled={[{ before: new Date() }, ...disabledDates]}
          />
        </div>
        <button
          onClick={createBlock}
          disabled={!blockRange?.from || !blockRange?.to}
          className="mt-3 rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Bloquear período
        </button>

        <ul className="mt-4 divide-y divide-forest-100 text-sm">
          {blockedList.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span>
                {formatDate(b.check_in)} → {formatDate(b.check_out)}{" "}
                <span className="text-ink/40">
                  ({b.status === "bloqueio" ? "bloqueio manual" : b.status})
                </span>
              </span>
              <button
                onClick={() => removeBlock(b.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
          {blockedList.length === 0 && (
            <li className="py-2 text-ink/40">Nenhuma data bloqueada.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
