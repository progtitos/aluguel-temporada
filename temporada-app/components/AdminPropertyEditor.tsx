"use client";

import { useState } from "react";
import Image from "next/image";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { formatDate, toISODate } from "@/lib/utils";
import type { Property } from "@/types/database";

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
}: {
  property: Property;
  bookings: BlockedBooking[];
}) {
  const [form, setForm] = useState({
    name: property.name,
    short_description: property.short_description ?? "",
    description: property.description ?? "",
    house_rules: property.house_rules ?? "",
    address_approx: property.address_approx ?? "",
    price_per_night: property.price_per_night,
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

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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

  async function uploadPhoto(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/properties/${property.id}/photos`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos);
    } else {
      setMessage("Erro ao enviar foto.");
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

  const disabledDates = blockedList.map((b) => ({
    from: new Date(b.check_in + "T00:00:00"),
    to: new Date(new Date(b.check_out + "T00:00:00").getTime() - 86400000),
  }));

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-2xl font-semibold text-ink">{property.name}</h1>
      {message && <p className="text-sm text-forest-700">{message}</p>}

      {/* Fotos */}
      <section className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
        <h2 className="font-display text-lg font-semibold text-ink">Fotos</h2>
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
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-forest-100 text-xs text-ink/50 hover:bg-forest-50">
            {uploading ? "Enviando..." : "+ Foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
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
              onChange={(e) => update("name", e.target.value)}
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
          <label className="text-sm sm:col-span-2">
            Localização aproximada
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.address_approx}
              onChange={(e) => update("address_approx", e.target.value)}
            />
          </label>
          <label className="text-sm">
            Preço por diária (R$)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={form.price_per_night}
              onChange={(e) => update("price_per_night", Number(e.target.value))}
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
