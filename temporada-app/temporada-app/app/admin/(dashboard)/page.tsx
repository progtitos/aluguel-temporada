import { createAdminClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import AdminBookingsTable, { type BookingRow } from "@/components/AdminBookingsTable";

export const revalidate = 0;

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
    admin.from("properties").select("id, name"),
  ]);

  const propertyNameById = new Map((propertiesData ?? []).map((p) => [p.id, p.name]));

  const bookings: BookingRow[] = (bookingsData ?? []).map((b) => ({
    id: b.id,
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

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Visão geral</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Faturamento confirmado</p>
          <p className="mt-1 font-display text-2xl font-semibold text-forest-700">
            {formatBRL(faturamentoTotal)}
          </p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Reservas confirmadas</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">
            {confirmadas.length}
          </p>
        </div>
        <div className="rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-forest-100">
          <p className="text-sm text-ink/50">Aguardando pagamento</p>
          <p className="mt-1 font-display text-2xl font-semibold text-amber-500">
            {pendentes.length}
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-ink">
        Últimas reservas
      </h2>
      <AdminBookingsTable bookings={bookings} />
    </div>
  );
}
