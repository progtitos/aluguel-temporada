import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";
import type { Coupon } from "@/types/database";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await request.json();
  const allowedFields = [
    "is_active",
    "type",
    "value",
    "usage_limit",
    "valid_until",
    "min_nights",
  ] as const;

  const update: Partial<Coupon> = {};
  for (const key of allowedFields) {
    if (key in body) (update as Record<string, unknown>)[key] = body[key];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("coupons").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
