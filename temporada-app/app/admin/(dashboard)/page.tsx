import { createAdminClient } from "@/lib/supabase/server";
import { formatBRL, formatDate } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const { data: bookings } = await admin
    .from("bookings")
    .select("*, properties(name)")
    .neq("status", "bloqueio")
    .order("created_at", { ascending: false });

  const confirmadas = bookings?.filter((b: any) => b.status === "confirmada") ?? [];
  const pendentes = bookings?.filter((b: any) => b.status === "pendente") ?? [];
  const faturamentoTotal = confirmadas.reduce(
    (sum: number, b: any) => sum + Number(b.total_amount),
    0
  );

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
      <div className="overflow-x-auto rounded-xl2 bg-white shadow-soft ring-1 ring-forest-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-forest-50 text-ink/50">
            <tr>
              <th className="px-4 py-3">Imóvel</th>
              <th className="px-4 py-3">Hóspede</th>
              <th className="px-4 py-3">Datas</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings?.map((b: any) => (
              <tr key={b.id} className="border-t border-forest-100">
                <td className="px-4 py-3">{b.properties?.name}</td>
                <td className="px-4 py-3">{b.guest_name ?? b.guest_email}</td>
                <td className="px-4 py-3">
                  {formatDate(b.check_in)} → {formatDate(b.check_out)}
                </td>
                <td className="px-4 py-3">{formatBRL(Number(b.total_amount))}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      b.status === "confirmada"
                        ? "bg-forest-100 text-forest-700"
                        : b.status === "pendente"
                        ? "bg-amber-200 text-amber-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!bookings || bookings.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Nenhuma reserva ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
