/** Aplica a máscara 999.999.999-99 progressivamente enquanto o usuário digita. */
export function maskCPF(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function unmaskCPFDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Valida os dígitos verificadores do CPF (algoritmo oficial da Receita Federal). */
export function isValidCPF(value: string): boolean {
  const cpf = unmaskCPFDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // sequências repetidas (111.111.111-11 etc.)

  const digits = cpf.split("").map(Number);

  function checkDigit(sliceLength: number): number {
    let sum = 0;
    for (let i = 0; i < sliceLength; i++) {
      sum += digits[i] * (sliceLength + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  }

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}
