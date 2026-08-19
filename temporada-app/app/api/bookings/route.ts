import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mpPayment } from "@/lib/mercadopago";

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

    // 1. Sanitização
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, "") : "";
    const cleanPhone = whatsapp ? String(whatsapp).replace(/\D/g, "") : "";
    const cleanEmail = email ? String(email).trim() : "";
    const cleanName = full_name ? String(full_name).trim() : "";

    if (!property_id || !check_in || !check_out || !cleanCpf || !cleanEmail) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 2. Buscar imóvel
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: `Imóvel não encontrado: ${propertyError?.message || ''}` },
        { status: 404 }
      );
    }

    const propPrice = (property as any).price_per_day || (property as any).price || (property as any).price_per_night || 0;

    // 3. Montar payload com fallback de nomes de colunas
    const insertData: Record<string, any> = {
      property_id,
      check_in,
      check_out,
      guest_name: cleanName,
      guest_email: cleanEmail,
      guest_phone: cleanPhone,
      guest_cpf: cleanCpf,
      status: "pendente",
      payment_method: method,
      total_amount: propPrice,
    };

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(insertData as any)
      .select()
      .single();

    // Se falhar no Supabase, exibe a mensagem EXATA do erro do banco na tela
    if (bookingError) {
      console.error("Erro no Supabase:", bookingError);
      return NextResponse.json(
        { error: `Banco de Dados: ${bookingError.message} (${bookingError.code})` },
        { status: 500 }
      );
    }

    // 4. Mercado Pago Pix
    if (method === "pix") {
      const nameParts = cleanName.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "Hospede";

      const transactionAmount = Number((booking as any).total_amount || propPrice);

      const paymentResponse = await mpPayment.create({
        body: {
          transaction_amount: transactionAmount,
          description: `Reserva: ${(property as any).title || (property as any).name}`,
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
        total: transactionAmount,
      });
    }

    return NextResponse.json({ success: true, booking_id: booking.id });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: `Erro Servidor: ${error.message}` },
      { status: 500 }
    );
  }
}
