import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { mpPayment } from "@/lib/mercadopago";
import { sendBookingConfirmationEmail } from "@/lib/email";

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
      const { data: booking } = await admin
        .from("bookings")
        .update({ status: "confirmada" })
        .eq("id", bookingId)
        .select()
        .single();

      // E-mail é "melhor esforço": se falhar, não desfaz a confirmação
      // (que já está garantida acima) nem impede o Mercado Pago de
      // considerar o webhook como recebido com sucesso.
      if (booking?.guest_email) {
        const { data: property } = await admin
          .from("properties")
          .select("name, address_full, checkin_time, checkout_time, house_rules")
          .eq("id", booking.property_id)
          .single();

        if (property) {
          await sendBookingConfirmationEmail({
            guestName: booking.guest_name ?? "hóspede",
            guestEmail: booking.guest_email,
            propertyName: property.name,
            addressFull: property.address_full,
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            checkinTime: property.checkin_time,
            checkoutTime: property.checkout_time,
            totalAmount: Number(booking.total_amount),
            houseRules: property.house_rules,
          });
        }
      }
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
