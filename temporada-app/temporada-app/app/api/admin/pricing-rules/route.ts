import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { property_id, name, start_date, end_date, price_per_night, min_nights } =
    await request.json();

  if (!property_id || !name || !start_date || !end_date || !price_per_night) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pricing_rules")
    .insert({
      property_id,
      name,
      start_date,
      end_date,
      price_per_night,
      min_nights: min_nights ?? 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
