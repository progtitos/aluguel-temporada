import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export const mpPayment = new Payment(client);
export const mpPreference = new Preference(client);

export class MercadoPagoRequestError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MercadoPagoRequestError";
  }
}

/**
 * Cria um pagamento Pix direto (QR Code + copia-e-cola).
 *
 * BUG CORRIGIDO: o Mercado Pago rejeita a criação de um pagamento Pix
 * (erro 400 "invalid payer identification" / "invalid parameter") quando
 * o payload não inclui `payer.first_name`, `payer.last_name` e
 * `payer.identification` (CPF). Antes só enviávamos `payer.email`, o que
 * derrubava a chamada e caía no catch genérico da rota de checkout.
 */
export async function createPixPayment(params: {
  amount: number;
  description: string;
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
  payerCpf: string;
  bookingId: string;
}) {
  try {
    const result = await mpPayment.create({
      body: {
        transaction_amount: Number(params.amount.toFixed(2)),
        description: params.description,
        payment_method_id: "pix",
        payer: {
          email: params.payerEmail,
          first_name: params.payerFirstName,
          last_name: params.payerLastName,
          identification: {
            type: "CPF",
            number: params.payerCpf.replace(/\D/g, ""),
          },
        },
        external_reference: params.bookingId,
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook`,
      },
    });

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qrCode || !qrCodeBase64) {
      throw new MercadoPagoRequestError(
        "O Mercado Pago não retornou o QR Code do Pix nesta resposta."
      );
    }

    return {
      id: result.id,
      status: result.status,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
    };
  } catch (error) {
    // Propaga a causa real (em vez de um erro genérico) para facilitar o
    // diagnóstico em logs da Vercel — a mensagem da API do MP costuma
    // apontar exatamente qual campo do payload está inválido/faltando.
    const mpMessage =
      (error as { cause?: { message?: string }; message?: string })?.cause?.message ??
      (error as Error)?.message;
    throw new MercadoPagoRequestError(
      mpMessage ? `Mercado Pago (Pix): ${mpMessage}` : "Falha ao gerar pagamento Pix.",
      error
    );
  }
}

/**
 * Cria uma Preference (Checkout Pro) para pagamento com cartão de crédito.
 * O hóspede é redirecionado para o checkout hospedado do Mercado Pago.
 */
export async function createCardPreference(params: {
  amount: number;
  title: string;
  payerEmail: string;
  bookingId: string;
}) {
  try {
    const result = await mpPreference.create({
      body: {
        items: [
          {
            id: params.bookingId,
            title: params.title,
            quantity: 1,
            unit_price: Number(params.amount.toFixed(2)),
            currency_id: "BRL",
          },
        ],
        payer: { email: params.payerEmail },
        external_reference: params.bookingId,
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook`,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/reserva/${params.bookingId}`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/reserva/${params.bookingId}`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/reserva/${params.bookingId}`,
        },
        auto_return: "approved",
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }],
        },
      },
    });

    return { id: result.id, init_point: result.init_point };
  } catch (error) {
    const mpMessage =
      (error as { cause?: { message?: string }; message?: string })?.cause?.message ??
      (error as Error)?.message;
    throw new MercadoPagoRequestError(
      mpMessage ? `Mercado Pago (Cartão): ${mpMessage}` : "Falha ao gerar preferência de pagamento.",
      error
    );
  }
}
