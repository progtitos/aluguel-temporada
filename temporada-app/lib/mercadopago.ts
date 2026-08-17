import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export const mpPayment = new Payment(client);
export const mpPreference = new Preference(client);

/**
 * Cria um pagamento Pix direto (QR Code + copia-e-cola), retornando os
 * dados necessários para exibir na tela de checkout.
 */
export async function createPixPayment(params: {
  amount: number;
  description: string;
  payerEmail: string;
  bookingId: string;
}) {
  const result = await mpPayment.create({
    body: {
      transaction_amount: Number(params.amount.toFixed(2)),
      description: params.description,
      payment_method_id: "pix",
      payer: { email: params.payerEmail },
      external_reference: params.bookingId,
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook`,
    },
  });

  return {
    id: result.id,
    status: result.status,
    qr_code: result.point_of_interaction?.transaction_data?.qr_code,
    qr_code_base64:
      result.point_of_interaction?.transaction_data?.qr_code_base64,
    ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
  };
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
}
