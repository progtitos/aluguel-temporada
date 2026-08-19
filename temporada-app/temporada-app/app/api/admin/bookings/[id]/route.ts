import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
  }

  // Reservas confirmadas têm pagamento aprovado no Mercado Pago: nunca são
  // apagadas por esta rota (evita perda acidental de histórico financeiro).
  // Só "pendente" (aguardando pagamento) e "bloqueio" (manual) podem ser removidos.
  if (booking.status === "confirmada") {
    return NextResponse.json(
      { error: "Reservas confirmadas não podem ser removidas por aqui." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("bookings").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
