"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatDate } from "@/lib/utils";
import { maskWhatsApp, whatsAppLink } from "@/lib/phoneMask";
import type { BookingStatus } from "@/types/database";

export type BookingRow = {
  id: string;
  property_name: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: BookingStatus;
};

const statusStyles: Record<BookingStatus, string> = {
  confirmada: "bg-forest-100 text-forest-700",
  pendente: "bg-amber-200 text-amber-600",
  cancelada: "bg-red-100 text-red-600",
  bloqueio: "bg-ink/10 text-ink/60",
};

export default function AdminBookingsTable({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(bookings);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function cancelBooking(id: string) {
    const confirmed = window.confirm(
      "Cancelar esta reserva pendente? Essa ação não pode ser desfeita e libera as datas no calendário."
    );
    if (!confirmed) return;

    setCancelingId(id);
    const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
    setCancelingId(null);

    if (res.ok) {
      setRows((current) => current.filter((b) => b.id !== id));
      router.refresh(); // ressincroniza os cards de faturamento/contadores
    } else {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Não foi possível cancelar a reserva.");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl2 bg-white shadow-soft ring-1 ring-forest-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-forest-50 text-ink/50">
          <tr>
            <th className="px-4 py-3">Imóvel</th>
            <th className="px-4 py-3">Hóspede</th>
            <th className="px-4 py-3">WhatsApp</th>
            <th className="px-4 py-3">Datas</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-forest-100">
              <td className="px-4 py-3">{b.property_name}</td>
              <td className="px-4 py-3">{b.guest_name ?? b.guest_email ?? "—"}</td>
              <td className="px-4 py-3">
                {b.guest_phone ? (
                  <a
                    href={whatsAppLink(b.guest_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest-700 hover:underline"
                  >
                    {maskWhatsApp(b.guest_phone)}
                  </a>
                ) : (
                  <span className="text-ink/30">—</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDate(b.check_in)} → {formatDate(b.check_out)}
              </td>
              <td className="px-4 py-3">{formatBRL(b.total_amount)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[b.status]}`}
                >
                  {b.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {b.status === "pendente" ? (
                  <button
                    onClick={() => cancelBooking(b.id)}
                    disabled={cancelingId === b.id}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelingId === b.id ? "Cancelando..." : "Cancelar"}
                  </button>
                ) : (
                  <span className="text-ink/20">—</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-ink/40">
                Nenhuma reserva ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
