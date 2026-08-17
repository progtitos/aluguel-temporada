/**
 * Aplica a máscara (99) 99999-9999 progressivamente enquanto o usuário
 * digita. Aceita colar números com ou sem formatação/DDI.
 */
export function maskWhatsApp(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Extrai só os dígitos, para validar/gravar no banco em formato normalizado. */
export function unmaskDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidBrazilianPhone(value: string): boolean {
  const digits = unmaskDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** Monta o link wa.me a partir do telefone mascarado (assume DDI +55). */
export function whatsAppLink(value: string): string {
  const digits = unmaskDigits(value);
  return `https://wa.me/55${digits}`;
}
