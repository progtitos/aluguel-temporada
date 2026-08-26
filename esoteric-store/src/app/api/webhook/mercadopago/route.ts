import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { consultarPagamento } from '@/lib/mercadopago';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Valida a assinatura `x-signature` enviada pelo Mercado Pago, conforme
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks#editor_5
 * Só é aplicada se MERCADOPAGO_WEBHOOK_SECRET estiver configurada — sem essa
 * variável, o request é aceito sem validação (com aviso no log), para não
 * quebrar ambientes que ainda não configuraram o secret no painel do MP.
 */
function isValidSignature(request: NextRequest, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      '[webhook/mercadopago] MERCADOPAGO_WEBHOOK_SECRET não configurada — pulando validação de assinatura.'
    );
    return true;
  }

  const signatureHeader = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id');
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * Webhook de notificações do Mercado Pago.
 * Configure a URL `https://SEU_DOMINIO/api/webhook/mercadopago` no painel
 * de integrações do Mercado Pago (Suas integrações > Webhooks) para os
 * eventos `payment.created` e `payment.updated`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);

    // O Mercado Pago pode notificar via querystring (?data.id=...&type=payment)
    // ou via corpo da requisição, dependendo da versão da integração.
    const paymentId =
      body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');
    const type = body?.type ?? url.searchParams.get('type');

    if (type !== 'payment' || !paymentId) {
      // Ignora notificações que não são de pagamento (ex: merchant_order)
      return NextResponse.json({ received: true });
    }

    if (!isValidSignature(request, String(paymentId))) {
      console.error('[webhook/mercadopago] assinatura inválida — requisição rejeitada.');
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const payment = await consultarPagamento(paymentId);
    const orderId = payment.external_reference;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const statusMap: Record<string, string> = {
      approved: 'paid',
      pending: 'pending',
      in_process: 'pending',
      rejected: 'rejected',
      refunded: 'refunded',
      cancelled: 'cancelled',
      charged_back: 'refunded',
    };

    const paymentStatus = statusMap[payment.status ?? ''] ?? 'pending';

    const supabase = createAdminClient();

    // Busca o pedido atual para saber se ele já tem nome/e-mail/endereço
    // preenchidos (fluxo /checkout completo) ou se veio da compra rápida
    // pela sacola (order_source = 'quick_buy'), caso em que preenchemos
    // esses dados agora com o que o Mercado Pago coletou do pagador.
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('customer_name, customer_email, order_source')
      .eq('id', orderId)
      .single();

    const updatePayload: Record<string, unknown> = {
      payment_status: paymentStatus,
      mercadopago_payment_id: String(payment.id),
      // payment_type_id vem como 'credit_card', 'debit_card', 'pix',
      // 'ticket', 'bank_transfer', etc. — é o método que o cliente
      // efetivamente escolheu dentro do Checkout Pro.
      payment_method: payment.payment_type_id ?? null,
      mercadopago_status_detail: payment.status_detail ?? null,
    };

    if (existingOrder && !existingOrder.customer_email && payment.payer?.email) {
      // Compra rápida: nome/e-mail ainda não existiam — preenche com o
      // que o pagador informou no Checkout Pro.
      const payerName = [payment.payer.first_name, payment.payer.last_name]
        .filter(Boolean)
        .join(' ');
      updatePayload.customer_email = payment.payer.email;
      updatePayload.customer_name = payerName || null;
      updatePayload.customer_document = payment.payer.identification?.number ?? null;

      // Endereço: a API de Payments só devolve um endereço PARCIAL para
      // shipments.mode = 'not_specified' (bairro/cidade/estado, sem rua
      // nem CEP). Guardamos o que vier, mas o time ainda precisa
      // confirmar o endereço completo com o cliente antes de despachar.
      const partialAddress = (payment as any)?.additional_info?.shipments?.receiver_address;
      if (partialAddress) {
        updatePayload.shipping_address = {
          cep: '',
          street: '',
          number: '',
          complement: partialAddress.apartment ?? '',
          neighborhood: '',
          city: partialAddress.city_name ?? '',
          state: partialAddress.state_name ?? '',
        };
      }
    }

    await supabase.from('orders').update(updatePayload).eq('id', orderId);

    // Se o pagamento foi recusado/cancelado, devolve o estoque reservado.
    if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (items) {
        for (const item of items) {
          if (!item.product_id) continue;
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook/mercadopago] erro:', error);
    // Retorna 200 mesmo em erro interno para evitar reenvios agressivos do MP
    // enquanto o problema é investigado nos logs.
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
