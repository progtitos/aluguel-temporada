export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

export function diffNights(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Divide "Maria da Silva Santos" em first_name/last_name para APIs que
 *  exigem os dois campos separadamente (ex.: Mercado Pago Pix). */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Lista de e-mails com acesso ao painel /admin.
// Configurado via variável de ambiente ADMIN_EMAILS (separados por vírgula).
export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
