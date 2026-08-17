import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createCardPreference, createPixPayment } from "@/lib/mercadopago";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "É necessário estar logado." }, { status: 401 });
  }

  const body = await request.json();
  const { property_id, check_in, check_out, total_amount, method } = body as {
    property_id: string;
    check_in: string;
    check_out: string;
    total_amount: number;
    method: "pix" | "cartao";
  };

  if (!property_id || !check_in || !check_out || !total_amount) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select("name")
    .eq("id", property_id)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  // Cria a reserva como "pendente". O trigger no banco impede overbooking.
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      property_id,
      guest_id: user.id,
      guest_name: user.user_metadata?.full_name ?? user.email,
      guest_email: user.email,
      check_in,
      check_out,
      total_amount,
      status: "pendente",
    })
    .select()
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message ?? "Datas indisponíveis." },
      { status: 409 }
    );
  }

  try {
    if (method === "pix") {
      const pix = await createPixPayment({
        amount: total_amount,
        description: `Reserva - ${property.name}`,
        payerEmail: user.email!,
        bookingId: booking.id,
      });

      await admin.from("payments").insert({
        booking_id: booking.id,
        mp_payment_id: String(pix.id),
        method: "pix",
        status: pix.status ?? "pending",
        amount: total_amount,
      });

      return NextResponse.json({
        booking_id: booking.id,
        qr_code: pix.qr_code,
        qr_code_base64: pix.qr_code_base64,
      });
    }

    const pref = await createCardPreference({
      amount: total_amount,
      title: `Reserva - ${property.name}`,
      payerEmail: user.email!,
      bookingId: booking.id,
    });

    await admin.from("payments").insert({
      booking_id: booking.id,
      mp_preference_id: pref.id,
      method: "credit_card",
      status: "pending",
      amount: total_amount,
    });

    return NextResponse.json({ booking_id: booking.id, init_point: pref.init_point });
  } catch (e) {
    // Reserva pendente sem pagamento gerado: remove para não travar as datas.
    await admin.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json(
      { error: "Erro ao gerar pagamento no Mercado Pago." },
      { status: 500 }
    );
  }
}
