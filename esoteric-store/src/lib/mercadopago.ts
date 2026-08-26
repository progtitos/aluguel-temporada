import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// =====================================================================
// Validação de variáveis de ambiente — falha rápido e com mensagem clara
// em vez de gerar back_urls quebradas como "undefined/checkout/sucesso".
// =====================================================================
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[mercadopago] Variável de ambiente "${name}" não configurada. ` +
        `Defina-a em Project Settings → Environment Variables (Vercel) e faça um novo deploy.`
    );
  }
  return value;
}

function getBaseUrl(): string {
  const raw = requiredEnv('NEXT_PUBLIC_SITE_URL');
  // Remove barra final para evitar "//checkout" nas URLs montadas abaixo.
  return raw.replace(/\/+$/, '');
}

// Cliente Mercado Pago (server-side apenas — nunca importar em componentes client).
// A instanciação do client é feita lazy (dentro das funções) para que erros de
// variável de ambiente ausente apareçam com uma mensagem clara no momento do uso,
// em vez de um erro genérico de import quebrando toda a rota.
function getClient() {
  return new MercadoPagoConfig({
    accessToken: requiredEnv('MERCADOPAGO_ACCESS_TOKEN'),
    options: { timeout: 8000 },
  });
}

export type CheckoutItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  picture_url?: string;
};

/**
 * Cria uma Preference do Checkout Pro do Mercado Pago. Este é o ÚNICO fluxo
 * de pagamento da loja (igual ao projeto temporada-aluguel): o cliente é
 * redirecionado para a página hospedada do Mercado Pago, onde escolhe entre
 * Pix, cartão de crédito/débito, boleto etc. Não fazemos mais Pix via
 * Checkout Transparente — tudo passa pela Preference.
 */
export async function criarPreferenceCheckout(params: {
  orderId: string;
  orderNumber: string;
  items: CheckoutItem[];
  shippingCost: number;
  discount?: number;
  couponCode?: string | null;
  payerEmail?: string;
  payerName?: string;
  payerDocument?: string;
  /**
   * Quando true, não enviamos `shipping_cost` calculado nem endereço —
   * em vez disso pedimos ao Mercado Pago para coletar o endereço de
   * entrega dentro do próprio Checkout Pro (`shipments.mode: 'not_specified'`).
   * Usado no fluxo de "compra rápida" pela sacola lateral, que pula o
   * formulário de endereço/frete do site.
   */
  collectShippingAddress?: boolean;
}) {
  const baseUrl = getBaseUrl();
  const client = getClient();
  const preferenceApi = new Preference(client);

  const items = params.items.map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: Number(item.unit_price.toFixed(2)),
    currency_id: 'BRL' as const,
    picture_url: item.picture_url,
  }));

  if (params.shippingCost > 0) {
    items.push({
      id: 'frete',
      title: 'Frete',
      quantity: 1,
      unit_price: Number(params.shippingCost.toFixed(2)),
      currency_id: 'BRL' as const,
      picture_url: undefined,
    });
  }

  // Desconto de cupom como linha de valor negativo — o Mercado Pago aceita
  // isso para que o total cobrado no Checkout Pro bata com order.total no
  // banco (sem isso, o cliente pagaria o valor cheio, sem o desconto).
  if (params.discount && params.discount > 0) {
    items.push({
      id: 'desconto',
      title: params.couponCode ? `Desconto (cupom ${params.couponCode})` : 'Desconto',
      quantity: 1,
      unit_price: -Number(params.discount.toFixed(2)),
      currency_id: 'BRL' as const,
      picture_url: undefined,
    });
  }

  const [firstName, ...rest] = (params.payerName ?? '').trim().split(/\s+/).filter(Boolean);

  const preference = await preferenceApi.create({
    body: {
      items,
      payer: params.payerEmail
        ? {
            email: params.payerEmail,
            name: firstName || undefined,
            surname: rest.join(' ') || undefined,
            identification: params.payerDocument
              ? { type: 'CPF', number: params.payerDocument.replace(/\D/g, '') }
              : undefined,
          }
        : undefined,
      external_reference: params.orderId,
      // As 3 páginas de retorno pedidas: sucesso, erro e pendente.
      back_urls: {
        success: `${baseUrl}/checkout/sucesso?order=${params.orderNumber}`,
        pending: `${baseUrl}/checkout/pendente?order=${params.orderNumber}`,
        failure: `${baseUrl}/checkout/erro?order=${params.orderNumber}`,
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/webhook/mercadopago`,
      statement_descriptor: 'UNIVERSO ENCANTADO',
      // Compra rápida (sacola lateral): deixa o próprio Checkout Pro
      // perguntar o endereço de entrega ao comprador, já que o site não
      // coletou isso antes de gerar a preference.
      shipments: params.collectShippingAddress ? { mode: 'not_specified' } : undefined,
    },
  });

  // Em credenciais de TESTE (TEST-...) o Mercado Pago só aceita o
  // sandbox_init_point; em produção (APP_USR-...) usamos o init_point normal.
  const accessToken = requiredEnv('MERCADOPAGO_ACCESS_TOKEN');
  const isTestCredential = accessToken.startsWith('TEST-');
  const checkoutUrl = isTestCredential
    ? preference.sandbox_init_point ?? preference.init_point
    : preference.init_point ?? preference.sandbox_init_point;

  return {
    id: preference.id!,
    checkoutUrl: checkoutUrl!,
  };
}

/** Consulta o status atual de um pagamento no Mercado Pago. */
export async function consultarPagamento(paymentId: string | number) {
  const client = getClient();
  const paymentApi = new Payment(client);
  return paymentApi.get({ id: paymentId });
}
