import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

// Endpoint público (sem autenticação) usado pela página /acompanhar-pedido.
// Por isso NUNCA usamos o client anônimo direto no browser aqui: a busca é
// feita no servidor com a Service Role Key (createAdminClient), e exigimos
// o e-mail do cliente além do número do pedido, para impedir que alguém
// descubra o pedido de outra pessoa só tentando números em sequência.
const trackSchema = z.object({
  orderNumber: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = trackSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Informe o número do pedido e o e-mail usados na compra.' },
        { status: 400 }
      );
    }

    const { orderNumber, email } = parsed.data;
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, customer_name, customer_email, shipping_address, shipping_cost, ' +
          'shipping_method, subtotal, discount, coupon_code, total, payment_status, ' +
          'fulfillment_status, tracking_code, created_at'
      )
      .eq('order_number', orderNumber.trim())
      .ilike('customer_email', email.trim())
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado. Confira o número do pedido e o e-mail informado.' },
        { status: 404 }
      );
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, product_image, unit_price, quantity, total')
      .eq('order_id', order.id);

    // Nunca devolvemos dados sensíveis (id interno, mercadopago_payment_id,
    // notes internas, etc.) — só o necessário para o cliente acompanhar o
    // próprio pedido.
    return NextResponse.json({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      shippingAddress: order.shipping_address,
      shippingCost: order.shipping_cost,
      shippingMethod: order.shipping_method,
      subtotal: order.subtotal,
      discount: order.discount,
      couponCode: order.coupon_code,
      total: order.total,
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.fulfillment_status,
      trackingCode: order.tracking_code,
      createdAt: order.created_at,
      items: items ?? [],
    });
  } catch (error: any) {
    console.error('[pedido/rastrear] erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar o pedido.' }, { status: 500 });
  }
}
