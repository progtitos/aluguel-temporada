import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";
import { slugify } from "@/lib/slug";
import type { Property } from "@/types/database";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await request.json();
  const allowedFields = [
    "name",
    "slug",
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
    "minimo_noites",
    "checkin_time",
    "checkout_time",
    "max_guests",
    "is_active",
    "photos",
  ] as const;

  const update: Partial<Property> = {};
  for (const key of allowedFields) {
    if (key in body) (update as Record<string, unknown>)[key] = body[key];
  }

  if (
    "photos" in update &&
    (!Array.isArray(update.photos) || update.photos.some((p) => typeof p !== "string"))
  ) {
    return NextResponse.json({ error: "Lista de fotos inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  if ("slug" in update) {
    const normalized = slugify(String(update.slug ?? ""));
    if (!normalized) {
      return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
    }
    update.slug = normalized;

    // Garante que a URL final continue única entre os imóveis (evita
    // colisão de duas acomodações com o mesmo /imovel/[slug]).
    const { data: existing } = await admin
      .from("properties")
      .select("id")
      .eq("slug", normalized)
      .neq("id", params.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Já existe outro imóvel usando esta URL. Escolha outro slug." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await admin
    .from("properties")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
