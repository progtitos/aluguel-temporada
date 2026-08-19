import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { geocodeAddress } from "@/lib/geocoding";

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { address } = await request.json();
  if (!address || String(address).trim().length < 5) {
    return NextResponse.json({ error: "Informe o endereço completo primeiro." }, { status: 400 });
  }

  const result = await geocodeAddress(String(address).trim());

  if (!result) {
    return NextResponse.json(
      { error: "Não foi possível localizar este endereço. Ajuste-o e tente novamente." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
