"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "@/lib/dateLocale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { BookingStatus } from "@/types/database";

type CalendarBooking = {
  id: string;
  property_id: string;
  property_name: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  status: BookingStatus;
};

const STATUS_STYLES: Record<"confirmada" | "pendente" | "bloqueio", { bg: string; text: string; dot: string }> = {
  confirmada: { bg: "bg-green-50", text: "text-green-900", dot: "bg-green-600" },
  pendente: { bg: "bg-amber-50", text: "text-amber-900", dot: "bg-amber-500" },
  bloqueio: { bg: "bg-ink/10", text: "text-ink/60", dot: "bg-ink/40" },
};

// Confirmada > pendente > bloqueio, quando dois períodos se sobrepõem no
// mesmo dia (ex.: um bloqueio manual criado por engano sobre uma reserva).
const STATUS_PRIORITY: Record<string, number> = { confirmada: 3, pendente: 2, bloqueio: 1 };

export default function AdminAvailabilityCalendar({
  properties,
  bookings,
}: {
  properties: { id: string; name: string }[];
  bookings: CalendarBooking[];
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const filteredBookings = useMemo(
    () => (propertyFilter === "all" ? bookings : bookings.filter((b) => b.property_id === propertyFilter)),
    [bookings, propertyFilter]
  );

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const leadingBlanks = getDay(startOfMonth(month)); // 0 = domingo

  function statusForDay(day: Date): "confirmada" | "pendente" | "bloqueio" | null {
    let best: "confirmada" | "pendente" | "bloqueio" | null = null;
    for (const b of filteredBookings) {
      const start = new Date(b.check_in + "T00:00:00");
      const end = new Date(new Date(b.check_out + "T00:00:00").getTime() - 86400000);
      if (isWithinInterval(day, { start, end })) {
        if (!best || STATUS_PRIORITY[b.status] > STATUS_PRIORITY[best]) {
          best = b.status as "confirmada" | "pendente" | "bloqueio";
        }
      }
    }
    return best;
  }

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredBookings
      .filter((b) => b.status !== "bloqueio" && new Date(b.check_in + "T00:00:00") >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .slice(0, 8);
  }, [filteredBookings]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Calendário</h1>
          <p className="mt-0.5 text-sm text-ink/50">Veja e cruze a disponibilidade de todos os imóveis</p>
        </div>
        <select
          className="h-9 rounded-lg border border-forest-100 bg-white px-3 text-sm"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          <option value="all">Todos os imóveis</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl2 bg-white p-4 shadow-soft ring-1 ring-forest-100 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-forest-100 hover:bg-forest-50"
            >
              <ChevronLeft size={14} />
            </button>
            <h2 className="font-display text-base font-semibold capitalize text-ink">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button
              aria-label="Próximo mês"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-forest-100 hover:bg-forest-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-3 text-xs text-ink/60">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-green-600" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-500" /> Pendente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-ink/40" /> Bloqueada
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] text-ink/40">
          <span>dom</span>
          <span>seg</span>
          <span>ter</span>
          <span>qua</span>
          <span>qui</span>
          <span>sex</span>
          <span>sáb</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const status = statusForDay(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const style = status ? STATUS_STYLES[status] : null;
            return (
              <div
                key={day.toISOString()}
                className={`flex aspect-square items-center justify-center rounded-md text-[11px] ${
                  style ? `${style.bg} ${style.text}` : "border border-forest-100 text-ink/70"
                } ${isToday ? "ring-2 ring-amber-500" : ""}`}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl2 bg-white p-4 shadow-soft ring-1 ring-forest-100">
        <p className="mb-2 text-sm font-medium text-ink">Próximos check-ins</p>
        <ul className="divide-y divide-forest-100 text-sm">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span>
                {formatDate(b.check_in)} · {b.guest_name ?? "—"}
              </span>
              <span className="text-ink/50">{b.property_name}</span>
            </li>
          ))}
          {upcoming.length === 0 && <li className="py-2 text-ink/40">Nada agendado.</li>}
        </ul>
      </div>
    </div>
  );
}
