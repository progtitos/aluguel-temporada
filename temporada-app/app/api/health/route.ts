import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Endpoint leve de "keep-alive". Faz uma consulta real (não apenas
 * responde 200 sem tocar no banco), para que o tráfego conte como
 * atividade genuína do projeto Supabase e evite a pausa automática por
 * inatividade do plano free (~7 dias sem uso).
 *
 * Chamado periodicamente por .github/workflows/keep-alive.yml — não
 * requer autenticação, só devolve um "ok" mínimo (nenhum dado sensível).
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("properties").select("id").limit(1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 }
    );
  }
}
