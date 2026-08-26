import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { criarPreferenceCheckout } from '@/lib/mercadopago';

/**
 * ⚠️ DEPRECADO — não é mais chamado por nenhuma tela do site.
 *
 * Este era o checkout "rápido" disparado pelo botão "Finalizar Compra" da
 * sacola lateral (CartDrawer). Por pedido explícito do time, o cadastro
 * (nome, sobrenome, e-mail, CEP, número, bairro, cidade, estado) e a
 * seleção de frete passaram a ser OBRIGATÓRIOS antes do pagamento — então
 * o CartDrawer agora sempre redireciona para /checkout (ver
 * src/components/layout/CartDrawer.tsx), que usa /api/checkout (o outro
 * arquivo nesta mesma pasta), não este aqui.
 *
 * Mantido no repositório apenas para referência/rollback. Pode ser
 * removido com segurança quando não for mais necessário.
 *
 * Diferente de /api/checkout (que exige endereço e frete calculado via
 * formulário), aqui só recebíamos os itens do carrinho — nome, e-mail e
 * endereço de entrega eram coletados pelo próprio Mercado Pago dentro do
 * Checkout Pro (ver `collectShippingAddress` em criarPreferenceCheckout) e
 * preenchidos depois via webhook.
 *
 * Consequência: o pedido nascia sem frete calculado (shipping_cost = 0) e
 * sem endereço. Ver aviso em supabase/migration_quick_buy.sql.
 */
const quickCheckoutSchema = z.object({
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
    const parsed = quickCheckoutSchema.safeParse(await request.json());

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
        throw new Error('Produto indisponível no pedido.');
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

    // Sem frete calculado: a compra rápida não passa pelo formulário de
    // endereço/frete. O Mercado Pago vai coletar o endereço, e o frete
    // (se houver) precisa ser tratado manualmente pelo time — ver a nota
    // em supabase/migration_quick_buy.sql.
    const total = Math.max(0, subtotal - discount);

    // 3. Criar o pedido (status inicial: pending, origem: quick_buy)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        customer_document: null,
        shipping_address: null,
        shipping_cost: 0,
        shipping_method: null,
        subtotal,
        discount,
        total,
        coupon_id: couponId,
        coupon_code: couponId ? body.couponCode : null,
        payment_method: null,
        payment_status: 'pending',
        order_source: 'quick_buy',
        notes:
          'Compra rápida via sacola lateral: endereço de entrega e frete ' +
          'ainda não confirmados. Verifique o e-mail do pagador (preenchido ' +
          'pelo webhook após o pagamento) e confirme o endereço com o cliente.',
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

    // 6. Criar a Preference do Checkout Pro, deixando o Mercado Pago
    // coletar o endereço de entrega (collectShippingAddress: true).
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
        shippingCost: 0,
        discount,
        couponCode: couponId ? body.couponCode : null,
        collectShippingAddress: true,
      });
    } catch (mpError: any) {
      console.error('[checkout/quick] erro ao criar preference no Mercado Pago:', mpError);
      await supabase
        .from('orders')
        .update({
          payment_status: 'rejected',
          notes: `Falha ao criar preferência MP: ${mpError.message}`,
        })
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
      // Mantido pelo nome pedido para compatibilidade com o texto da
      // especificação ("receber o init_point da API") — é o mesmo valor.
      init_point: preference.checkoutUrl,
    });
  } catch (error: any) {
    console.error('[checkout/quick] erro:', error);
    return NextResponse.json(
      { error: error.message ?? 'Erro ao processar o checkout.' },
      { status: 500 }
    );
  }
}
