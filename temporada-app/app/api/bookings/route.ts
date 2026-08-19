import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createCardPreference, createPixPayment, MercadoPagoRequestError } from "@/lib/mercadopago";
import { calculatePricing } from "@/lib/pricing";
import { isWithinAvailabilityWindow } from "@/lib/availability";
import { splitFullName } from "@/lib/utils";
import { isValidBrazilianPhone, unmaskDigits } from "@/lib/phoneMask";
import { isValidCPF, unmaskCPFDigits } from "@/lib/cpfMask";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json();
  const {
    property_id,
    check_in,
    check_out,
    method,
    full_name,
    email,
    whatsapp,
    cpf,
  } = body as {
    property_id: string;
    check_in: string;
    check_out: string;
    method: "pix" | "cartao";
    full_name: string;
    email: string;
    whatsapp: string;
    cpf: string;
  };

  if (!property_id || !check_in || !check_out) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  // Dados do hóspede coletados no checkout e validados no servidor
  if (!full_name || full_name.trim().length < 3) {
    return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!whatsapp || !isValidBrazilianPhone(whatsapp)) {
    return NextResponse.json({ error: "Informe um WhatsApp válido, com DDD." }, { status: 400 });
  }
  if (!cpf || !isValidCPF(cpf)) {
    return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 });
  }

  const cleanCpf = unmaskCPFDigits(cpf);
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = full_name.trim();

  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select("*")
    .eq("id", property_id)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  // Reforça no servidor a janela de disponibilidade
  if (!isWithinAvailabilityWindow(check_out, property.janela_disponibilidade_meses)) {
    return NextResponse.json(
      {
        error:
          property.janela_disponibilidade_meses === 1
            ? "Este imóvel só aceita reservas para o próximo mês."
            : `Este imóvel só aceita reservas para os próximos ${property.janela_disponibilidade_meses} meses.`,
      },
      { status: 400 }
    );
  }

  const { data: pricingRules } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("property_id", property_id);

  // Recálculo seguro das tarifas
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

  // Registra reserva no banco de dados
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      property_id,
      guest_id: null,
      guest_name: cleanName,
      guest_email: cleanEmail,
      guest_phone: unmaskDigits(whatsapp),
      guest_cpf: cleanCpf,
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
      const { firstName, lastName } = splitFullName(cleanName);

      const pix = await createPixPayment({
        amount: pricing.total,
        description: `Reserva - ${property.name}`,
        payerEmail: cleanEmail,
        payerFirstName: firstName,
        payerLastName: lastName || "Hospede", // Garante um sobrenome caso seja nome único
        payerCpf: cleanCpf, // CPF limpo contendo exatamente 11 dígitos
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
      payerEmail: cleanEmail,
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
  } catch (error) {
    // Caso falhe na API do Mercado Pago, estorna a reserva pendente do banco
    await admin.from("bookings").delete().eq("id", booking.id);

    const message =
      error instanceof MercadoPagoRequestError
        ? error.message
        : "Erro ao gerar pagamento no Mercado Pago.";

    console.error("Falha ao gerar pagamento:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
