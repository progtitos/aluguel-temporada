import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal } = await request.json();

    if (!code || typeof subtotal !== 'number') {
      return NextResponse.json(
        { valid: false, message: 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .rpc('validate_coupon', { p_code: code, p_subtotal: subtotal })
      .single();

    if (error) throw error;

    const result = data as {
      valid: boolean;
      message: string;
      coupon_id: string | null;
      discount_amount: number;
    };

    return NextResponse.json({
      valid: result.valid,
      message: result.message,
      couponId: result.coupon_id,
      discount: Number(result.discount_amount ?? 0),
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, message: 'Erro ao validar o cupom.' },
      { status: 500 }
    );
  }
}
