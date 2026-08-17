import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createCardPreference, createPixPayment } from "@/lib/mercadopago";
import { calculatePricing } from "@/lib/pricing";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "É necessário estar logado." }, { status: 401 });
  }

  // Perfil (nome completo + WhatsApp) é obrigatório antes de qualquer cobrança.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, whatsapp")
    .eq("id", user.id)
    .single();

  if (!profile?.full_name || !profile?.whatsapp) {
    return NextResponse.json(
      { error: "Complete seu nome e WhatsApp antes de finalizar a reserva." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { property_id, check_in, check_out, method } = body as {
    property_id: string;
    check_in: string;
    check_out: string;
    method: "pix" | "cartao";
  };

  if (!property_id || !check_in || !check_out) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select("*")
    .eq("id", property_id)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  const { data: pricingRules } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("property_id", property_id);

  // Preço SEMPRE recalculado a partir das tarifas cadastradas — o valor
  // enviado pelo client (se algum) é ignorado. Isso evita que alguém
  // manipule o total via DevTools/API diretamente.
  const pricing = calculatePricing(property, pricingRules ?? [], check_in, check_out);

  if (pricing.nightsCount < 1) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }
  if (pricing.nightsCount < pricing.minNightsRequired) {
    return NextResponse.json(
      {
        error: `Este período exige uma estadia mínima de ${pricing.minNightsRequired} noites.`,
      },
      { status: 400 }
    );
  }

  // Cria a reserva como "pendente". O trigger no banco impede overbooking.
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      property_id,
      guest_id: user.id,
      guest_name: profile.full_name,
      guest_email: user.email,
      guest_phone: profile.whatsapp,
      check_in,
      check_out,
      total_amount: pricing.total,
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
        amount: pricing.total,
        description: `Reserva - ${property.name}`,
        payerEmail: user.email!,
        bookingId: booking.id,
      });

      await admin.from("payments").insert({
        booking_id: booking.id,
        mp_payment_id: String(pix.id),
        method: "pix",
        status: pix.status ?? "pending",
        amount: pricing.total,
      });

      return NextResponse.json({
        booking_id: booking.id,
        total: pricing.total,
        qr_code: pix.qr_code,
        qr_code_base64: pix.qr_code_base64,
      });
    }

    const pref = await createCardPreference({
      amount: pricing.total,
      title: `Reserva - ${property.name}`,
      payerEmail: user.email!,
      bookingId: booking.id,
    });

    await admin.from("payments").insert({
      booking_id: booking.id,
      mp_preference_id: pref.id,
      method: "credit_card",
      status: "pending",
      amount: pricing.total,
    });

    return NextResponse.json({
      booking_id: booking.id,
      total: pricing.total,
      init_point: pref.init_point,
    });
  } catch {
    // Reserva pendente sem pagamento gerado: remove para não travar as datas.
    await admin.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json(
      { error: "Erro ao gerar pagamento no Mercado Pago." },
      { status: 500 }
    );
  }
}
