import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminGuard";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });

  const admin = createAdminClient();
  const ext = file.name.split(".").pop();
  const path = `${params.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("property-photos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrl } = admin.storage.from("property-photos").getPublicUrl(path);

  const { data: property } = await admin
    .from("properties")
    .select("photos")
    .eq("id", params.id)
    .single();

  const photos = [...(property?.photos ?? []), publicUrl.publicUrl];

  const { data, error } = await admin
    .from("properties")
    .update({ photos })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { photoUrl } = await request.json();
  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select("photos")
    .eq("id", params.id)
    .single();

  const photos = (property?.photos ?? []).filter((p: string) => p !== photoUrl);

  const { data, error } = await admin
    .from("properties")
    .update({ photos })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
