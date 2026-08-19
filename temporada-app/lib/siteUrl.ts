
/**
 * Retorna a URL pública base da aplicação formatada com HTTPS para webhooks e redirecionamentos.
 * Se a URL base for inválida ou ambiente local (http://localhost), retorna null para evitar
 * erros de validação na API do Mercado Pago (ex: notification_url attribute must be url valid).
 */
export function getPublicSiteUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  if (!url) return null;

  // Garante o protocolo https:// caso o domínio venha limpo da Vercel
  const formattedUrl = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;

  // Se for ambiente local ou http não-seguro, retorna null para omitir o notification_url
  if (formattedUrl.includes("localhost") || formattedUrl.startsWith("http://")) {
    return null;
  }

  // Remove barra final se houver
  return formattedUrl.replace(/\/$/, "");
}
