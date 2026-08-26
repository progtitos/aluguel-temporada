import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { criarPreferenceCheckout } from '@/lib/mercadopago';

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    document: z.string().optional(),
  }),
  shippingAddress: z.object({
    cep: z.string().min(8),
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(2),
  }),
  shippingMethod: z.string(),
  shippingCost: z.number().min(0),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  couponCode: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = checkoutSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados de checkout inválidos.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const supabase = createAdminClient();

    // 1. Buscar produtos reais no banco (nunca confiar no preço enviado pelo client)
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, images, stock, is_active')
      .in('id', productIds);

    if (productsError || !products) {
      throw new Error('Não foi possível carregar os produtos do pedido.');
    }

    const orderItems = body.items.map((item) => {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product || !product.is_active) {
        throw new Error(`Produto indisponível no pedido.`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Estoque insuficiente para "${product.name}".`);
      }
      return {
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] ?? null,
        unit_price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);

    // 2. Validar cupom (se houver)
    let discount = 0;
    let couponId: string | null = null;

    if (body.couponCode) {
      const { data: couponResult } = await supabase
        .rpc('validate_coupon', { p_code: body.couponCode, p_subtotal: subtotal })
        .single();

      const result = couponResult as {
        valid: boolean;
        coupon_id: string | null;
        discount_amount: number;
      } | null;

      if (result?.valid) {
        discount = Number(result.discount_amount);
        couponId = result.coupon_id;
      }
    }

    const total = Math.max(0, subtotal - discount + body.shippingCost);

    // 3. Criar o pedido (status inicial: pending)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: body.customer.name,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone,
        customer_document: body.customer.document,
        shipping_address: body.shippingAddress,
        shipping_cost: body.shippingCost,
        shipping_method: body.shippingMethod,
        subtotal,
        discount,
        total,
        coupon_id: couponId,
        coupon_code: couponId ? body.couponCode : null,
        // O método de pagamento efetivo (pix, credit_card, ticket, etc.) só é
        // conhecido depois que o cliente escolhe na página do Checkout Pro,
        // então começamos com null e o webhook preenche esse campo.
        payment_method: null,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Não foi possível criar o pedido.');
    }

    // 4. Inserir os itens do pedido
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemsError) {
      throw new Error('Não foi possível registrar os itens do pedido.');
    }

    // 5. Incrementar contador de uso do cupom e reservar estoque
    if (couponId) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .single();
      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: coupon.used_count + 1 })
          .eq('id', couponId);
      }
    }

    await Promise.all(
      orderItems.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) return Promise.resolve();
        return supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.product_id);
      })
    );

    // 6. Criar a Preference do Checkout Pro e redirecionar o cliente para lá.
    // O desconto do cupom entra como uma linha de valor negativo (ver
    // criarPreferenceCheckout) para que o valor cobrado no Mercado Pago
    // bata exatamente com `order.total` gravado no banco.
    let preference;
    try {
      preference = await criarPreferenceCheckout({
        orderId: order.id,
        orderNumber: order.order_number,
        items: orderItems.map((item) => ({
          id: item.product_id ?? item.product_name,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          picture_url: item.product_image ?? undefined,
        })),
        shippingCost: body.shippingCost,
        discount,
        couponCode: couponId ? body.couponCode : null,
        payerEmail: body.customer.email,
        payerName: body.customer.name,
        payerDocument: body.customer.document,
      });
    } catch (mpError: any) {
      // Se a criação da preferência falhar, o pedido já foi criado no banco
      // (status pending) — não deixamos o cliente preso sem saber o que houve.
      console.error('[checkout] erro ao criar preference no Mercado Pago:', mpError);
      await supabase
        .from('orders')
        .update({ payment_status: 'rejected', notes: `Falha ao criar preferência MP: ${mpError.message}` })
        .eq('id', order.id);
      throw new Error(
        'Não foi possível iniciar o pagamento com o Mercado Pago. Verifique as credenciais configuradas.'
      );
    }

    await supabase
      .from('orders')
      .update({ mercadopago_preference_id: preference.id })
      .eq('id', order.id);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      checkoutUrl: preference.checkoutUrl,
    });
  } catch (error: any) {
    console.error('[checkout] erro:', error);
    return NextResponse.json(
      { error: error.message ?? 'Erro ao processar o checkout.' },
      { status: 500 }
    );
  }
}
