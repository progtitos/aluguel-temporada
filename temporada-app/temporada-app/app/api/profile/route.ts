import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidBrazilianPhone, unmaskDigits } from "@/lib/phoneMask";
import { isValidCPF, unmaskCPFDigits } from "@/lib/cpfMask";

// NOTA: desde que o fluxo de reserva do hóspede deixou de exigir login
// social (ver components/BookingWidget.tsx), esta rota e a tabela
// `profiles` ficaram sem consumidor ativo — o checkout agora grava nome/
// e-mail/WhatsApp/CPF diretamente em `bookings`. Mantida aqui sem uso por
// enquanto (não quebra nada), caso um cadastro de hóspede recorrente
// volte a fazer sentido no futuro. Removível com segurança se preferir
// simplificar o schema.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return NextResponse.json(data ?? null);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { full_name, whatsapp, cpf } = await request.json();

  if (!full_name || String(full_name).trim().length < 3) {
    return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
  }
  if (!whatsapp || !isValidBrazilianPhone(whatsapp)) {
    return NextResponse.json({ error: "Informe um WhatsApp válido." }, { status: 400 });
  }
  if (!cpf || !isValidCPF(cpf)) {
    return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: String(full_name).trim(),
      whatsapp: unmaskDigits(whatsapp),
      cpf: unmaskCPFDigits(cpf),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
