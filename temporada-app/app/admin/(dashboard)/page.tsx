import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "@/lib/dateLocale";
import { createAdminClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import AdminBookingsTable, { type BookingRow } from "@/components/AdminBookingsTable";
import AdminRevenueChart, { type MonthlyRevenue } from "@/components/AdminRevenueChart";

export const revalidate = 0;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default async function AdminDashboard() {
  const admin = createAdminClient();

  // Duas consultas simples em vez de um join embutido (`properties(name)`):
  // nosso `Database` tipado usa `Relationships: []` (sem metadados de FK),
  // então o supabase-js não consegue inferir o formato do recurso
  // aninhado e a linha inteira vira `never`. Buscar e juntar em memória
  // evita esse problema sem precisar de `as any`.
  const [{ data: bookingsData }, { data: propertiesData }] = await Promise.all([
    admin
      .from("bookings")
      .select("id, property_id, check_in, check_out, total_amount, status, guest_name, guest_email, guest_phone")
      .neq("status", "bloqueio")
      .order("created_at", { ascending: false }),
    admin.from("properties").select("id, name, is_active"),
  ]);

  const properties = propertiesData ?? [];
  const propertyNameById = new Map(properties.map((p) => [p.id, p.name]));

  const bookings: BookingRow[] = (bookingsData ?? []).map((b) => ({
    id: b.id,
    property_id: b.property_id,
    property_name: propertyNameById.get(b.property_id) ?? "—",
    guest_name: b.guest_name,
    guest_email: b.guest_email,
    guest_phone: b.guest_phone,
    check_in: b.check_in,
    check_out: b.check_out,
    total_amount: Number(b.total_amount),
    status: b.status,
  }));

  const confirmadas = bookings.filter((b) => b.status === "confirmada");
  const pendentes = bookings.filter((b) => b.status === "pendente");
  const faturamentoTotal = confirmadas.reduce((sum, b) => sum + b.total_amount, 0);

  // Faturamento mensal (últimos 6 meses), agrupado pelo mês do check-in.
  const monthKeys: { key: string; label: string; date: Date }[] = Array.from({ length: 6 }).map((_, i) => {
    const date = startOfMonth(subMonths(new Date(), 5 - i));
    return { key: format(date, "yyyy-MM"), label: format(date, "MMM", { locale: ptBR }), date };
  });
  const revenueByMonth = new Map(monthKeys.map((m) => [m.key, 0]));
  for (const b of confirmadas) {
    const key = b.check_in.slice(0, 7);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + b.total_amount);
    }
  }
  const monthlyRevenue: MonthlyRevenue[] = monthKeys.map((m) => ({
    label: m.label.charAt(0).toUpperCase() + m.label.slice(1).replace(".", ""),
    total: revenueByMonth.get(m.key) ?? 0,
  }));

  // Taxa de ocupação: noites já reservadas (confirmada/pendente) nos
  // próximos 30 dias, sobre o total de noites disponíveis nesse período
  // em todos os imóveis ativos.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today.getTime() + 30 * MS_PER_DAY);
  const activeProperties = properties.filter((p) => p.is_active).length;
  const totalAvailableNights = Math.max(1, activeProperties * 30);

  let occupiedNights = 0;
  for (const b of bookings) {
    if (b.status !== "confirmada" && b.status !== "pendente") continue;
    const start = new Date(b.check_in + "T00:00:00");
    const end = new Date(b.check_out + "T00:00:00");
    const overlapStart = start > today ? start : today;
    const overlapEnd = end < windowEnd ? end : windowEnd;
    const nights = Math.max(0, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY));
    occupiedNights += nights;
  }
  const occupancyRate = Math.min(100, Math.round((occupiedNights / totalAvailableNights) * 100));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Visão geral</h1>
      <p className="mt-0.5 text-sm text-ink/50">Acompanhe o desempenho de todos os imóveis</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Faturamento confirmado</p>
          <p className="mt-1 font-display text-2xl font-semibold text-forest-700">
            {formatBRL(faturamentoTotal)}
          </p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Reservas confirmadas</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">{confirmadas.length}</p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Aguardando pagamento</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-500">{pendentes.length}</p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Ocupação (30 dias)</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">{occupancyRate}%</p>
        </div>
      </div>

      <div className="mt-4">
        <AdminRevenueChart data={monthlyRevenue} />
      </div>

      <div className="mt-4">
        <AdminBookingsTable bookings={bookings} properties={properties} />
      </div>
    </div>
  );
}
