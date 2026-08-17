import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";
import type { Property } from "@/types/database";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await request.json();
  const allowedFields = [
    "name",
    "short_description",
    "description",
    "house_rules",
    "address_approx",
    "address_full",
    "latitude",
    "longitude",
    "preco_semana",
    "preco_fds",
    "cleaning_fee",
    "checkin_time",
    "checkout_time",
    "max_guests",
    "is_active",
  ] as const;

  const update: Partial<Property> = {};
  for (const key of allowedFields) {
    if (key in body) (update as Record<string, unknown>)[key] = body[key];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("properties")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
