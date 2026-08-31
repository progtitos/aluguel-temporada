import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { code, type, value, usage_limit, valid_until, min_nights } = await request.json();

  if (!code || typeof code !== "string" || code.trim().length < 3) {
    return NextResponse.json({ error: "Informe um código de cupom válido." }, { status: 400 });
  }
  if (type !== "fixed" && type !== "percentage") {
    return NextResponse.json({ error: "Tipo de cupom inválido." }, { status: 400 });
  }
  if (!value || Number(value) <= 0) {
    return NextResponse.json({ error: "Informe um valor de desconto maior que zero." }, { status: 400 });
  }
  if (type === "percentage" && Number(value) > 100) {
    return NextResponse.json({ error: "Desconto percentual não pode passar de 100%." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .insert({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      usage_limit: usage_limit ? Number(usage_limit) : 1,
      valid_until: valid_until || null,
      min_nights: min_nights ? Number(min_nights) : null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    // Violação de unicidade do código (23505) vira uma mensagem amigável.
    const message = error.code === "23505" ? "Já existe um cupom com este código." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(data);
}
