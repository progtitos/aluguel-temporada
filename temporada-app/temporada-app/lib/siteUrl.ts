/**
 * Retorna a origem pública do site (ex.: "https://seu-app.vercel.app")
 * SOMENTE quando `NEXT_PUBLIC_SITE_URL` for uma URL HTTPS válida.
 *
 * Por quê: a API do Mercado Pago rejeita `notification_url` (e reclama de
 * `back_urls`) quando o valor não é uma URL pública em HTTPS — o que
 * acontece sempre que rodamos localmente com
 * `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, ou quando a variável nem
 * está definida (gerando literalmente a string "undefined/..." ao
 * concatenar). Em vez de deixar isso quebrar a chamada, os callers desta
 * função devem OMITIR o campo inteiro quando ela retornar `null`.
 */
export function getPublicSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null; // http://localhost cai aqui
    return url.origin;
  } catch {
    return null; // valor mal formatado (ex.: "localhost:3000" sem protocolo)
  }
}
