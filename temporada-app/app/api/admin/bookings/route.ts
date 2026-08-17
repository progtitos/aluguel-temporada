import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";

// Cria um bloqueio manual de datas (sem hóspede) para um imóvel.
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { property_id, check_in, check_out } = await request.json();
  if (!property_id || !check_in || !check_out) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .insert({
      property_id,
      check_in,
      check_out,
      status: "bloqueio",
      total_amount: 0,
      guest_name: "Bloqueio manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json(data);
}
