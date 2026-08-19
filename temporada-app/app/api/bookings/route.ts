import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { payment } from "@/lib/mercadopago";

export async function POST(request: Request) {
  try {
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
    } = body;

    // 1. Sanitização dos dados (apenas números para CPF e telefone)
    const cleanCpf = cpf ? cpf.replace(/\D/g, "") : "";
    const cleanPhone = whatsapp ? whatsapp.replace(/\D/g, "") : "";
    const cleanEmail = email ? email.trim() : "";

    if (!property_id || !check_in || !check_out || !cleanCpf || !cleanEmail) {
      return NextResponse.json(
        { error: "Dados incompletos para processar a reserva." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 2. Buscar detalhes do imóvel
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Imóvel não encontrado." },
        { status: 404 }
      );
    }

    // 3. Criar registro da reserva
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        property_id,
        check_in,
        check_out,
        full_name: full_name.trim(),
        email: cleanEmail,
        whatsapp: cleanPhone,
        cpf: cleanCpf,
        status: "pendente",
        payment_method: method,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Erro ao registrar reserva no banco de dados." },
        { status: 500 }
      );
    }

    // 4. Integração Pix via Mercado Pago SDK
    if (method === "pix") {
      const nameParts = full_name.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "Hospede";

      const paymentResponse = await payment.create({
        body: {
          transaction_amount: Number(booking.total_price || property.price_per_night),
          description: `Reserva: ${property.title}`,
          payment_method_id: "pix",
          payer: {
            email: cleanEmail,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: "CPF",
              number: cleanCpf,
            },
          },
        },
      });

      const pixData = paymentResponse.point_of_interaction?.transaction_data;

      return NextResponse.json({
        success: true,
        booking_id: booking.id,
        qr_code: pixData?.qr_code,
        qr_code_base64: pixData?.qr_code_base64,
        total: booking.total_price || property.price_per_night,
      });
    }

    return NextResponse.json({ success: true, booking_id: booking.id });
  } catch (error: any) {
    console.error("Erro na API de reservas:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
