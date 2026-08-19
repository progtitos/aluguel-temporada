
import { addMonths } from "date-fns";

/**
 * Retorna a última data reservável a partir de hoje, de acordo com a
 * janela de disponibilidade configurada no imóvel (1, 2 ou 3 meses).
 * Retorna `null` quando a janela é "Sem limite" (calendário aberto).
 */
export function getAvailabilityWindowEnd(janelaMeses: number | null): Date | null {
  if (!janelaMeses) return null;
  return addMonths(new Date(), janelaMeses);
}

/**
 * Valida se um check-out (YYYY-MM-DD) está dentro da janela de
 * disponibilidade do imóvel. Usada no servidor para impedir que alguém
 * contorne a restrição chamando a API de reservas diretamente.
 */
export function isWithinAvailabilityWindow(
  checkOutISO: string,
  janelaMeses: number | null
): boolean {
  const windowEnd = getAvailabilityWindowEnd(janelaMeses);
  if (!windowEnd) return true; // sem limite
  return new Date(checkOutISO + "T00:00:00") <= windowEnd;
}
