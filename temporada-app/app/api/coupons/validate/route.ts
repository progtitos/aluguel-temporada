import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { evaluateCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  const { code, nights_count, total_before_discount } = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Informe o código do cupom." }, { status: 400 });
  }
  if (!nights_count || !total_before_discount) {
    return NextResponse.json({ error: "Selecione as datas antes de aplicar o cupom." }, { status: 400 });
  }

  // Usa o client admin (service role) só para LEITURA — a policy pública já
  // permite select em `coupons`, mas o admin client evita qualquer
  // dependência de sessão/RLS para esta checagem simples.
  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  const result = evaluateCoupon(coupon, {
    nightsCount: Number(nights_count),
    totalBeforeDiscount: Number(total_before_discount),
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: coupon!.code,
    discount_amount: result.discountAmount,
  });
}
