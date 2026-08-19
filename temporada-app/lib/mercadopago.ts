import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { getPublicSiteUrl } from "@/lib/siteUrl";

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

function extractMpMessage(error: unknown): string | undefined {
  return (
    (error as { cause?: { message?: string } })?.cause?.message ??
    (error as Error)?.message
  );
}

/**
 * Cria um pagamento Pix direto (QR Code + copia-e-cola).
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
  const siteUrl = getPublicSiteUrl();
  const notificationUrl = siteUrl ? `${siteUrl}/api/mercadopago/webhook` : undefined;

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
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
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
    if (error instanceof MercadoPagoRequestError) throw error;

    const mpMessage = extractMpMessage(error);
    throw new MercadoPagoRequestError(
      mpMessage ? `Mercado Pago (Pix): ${mpMessage}` : "Falha ao gerar pagamento Pix.",
      error
    );
  }
}

/**
 * Cria uma Preference (Checkout Pro) para pagamento com cartão de crédito.
 */
export async function createCardPreference(params: {
  amount: number;
  title: string;
  payerEmail: string;
  bookingId: string;
}) {
  const siteUrl = getPublicSiteUrl();
  const notificationUrl = siteUrl ? `${siteUrl}/api/mercadopago/webhook` : undefined;
  const backUrls = siteUrl
    ? {
        success: `${siteUrl}/reserva/${params.bookingId}`,
        pending: `${siteUrl}/reserva/${params.bookingId}`,
        failure: `${siteUrl}/reserva/${params.bookingId}`,
      }
    : undefined;

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
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        ...(backUrls ? { back_urls: backUrls, auto_return: "approved" as const } : {}),
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }],
        },
      },
    });

    return { id: result.id, init_point: result.init_point };
  } catch (error) {
    const mpMessage = extractMpMessage(error);
    throw new MercadoPagoRequestError(
      mpMessage ? `Mercado Pago (Cartão): ${mpMessage}` : "Falha ao gerar preferência de pagamento.",
      error
    );
  }
}
