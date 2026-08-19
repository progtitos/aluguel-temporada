import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { mpPayment } from "@/lib/mercadopago";

// O Mercado Pago chama esta rota sempre que o status de um pagamento muda.
// Nunca confie no client para "confirmar" uma reserva — a confirmação
// só acontece aqui, depois de consultar o pagamento diretamente na API
// do Mercado Pago (evita fraude por payload falso).
export async function POST(request: Request) {
  const admin = createAdminClient();

  try {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);

    const paymentId =
      body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    // Busca o pagamento real na API do Mercado Pago (fonte da verdade)
    const payment = await mpPayment.get({ id: paymentId });
    const bookingId = payment.external_reference;
    if (!bookingId) return NextResponse.json({ received: true });

    const mpStatus = payment.status; // approved | pending | rejected | cancelled ...

    await admin
      .from("payments")
      .update({
        mp_payment_id: String(payment.id),
        status: mpStatus,
        raw_payload: payment as unknown as Record<string, unknown>,
      })
      .eq("booking_id", bookingId);

    if (mpStatus === "approved") {
      await admin.from("bookings").update({ status: "confirmada" }).eq("id", bookingId);
    } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
      await admin.from("bookings").update({ status: "cancelada" }).eq("id", bookingId);
    }
    // "pending"/"in_process": mantém a reserva como "pendente"

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    // Retorna 200 mesmo em erro para evitar reenvios agressivos do MP;
    // o erro fica registrado nos logs da Vercel para investigação.
    return NextResponse.json({ received: true });
  }
}
