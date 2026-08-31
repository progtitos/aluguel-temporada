import type { Coupon } from "@/types/database";

export type CouponEvaluation =
  | { valid: true; discountAmount: number }
  | { valid: false; error: string };

/**
 * Avalia se um cupom pode ser aplicado a uma reserva com `nightsCount`
 * noites e `totalBeforeDiscount` de valor, e calcula o desconto.
 *
 * Esta função NÃO consulta o banco nem consome o cupom — apenas aplica as
 * regras de negócio sobre um `Coupon` já carregado. A consulta a `coupons`
 * deve sempre buscar o registro mais recente (nunca cachear no client),
 * e a CONSUMAÇÃO do uso (incrementar `used_count`) só acontece via
 * trigger no banco, no momento em que a reserva é confirmada — nunca
 * aqui, o que mantém esta função segura para rodar tanto no client
 * (preview) quanto no server (autoritativo).
 */
export function evaluateCoupon(
  coupon: Coupon | null,
  params: { nightsCount: number; totalBeforeDiscount: number }
): CouponEvaluation {
  if (!coupon) {
    return { valid: false, error: "Cupom não encontrado." };
  }
  if (!coupon.is_active) {
    return { valid: false, error: "Este cupom não está mais ativo." };
  }
  if (coupon.used_count >= coupon.usage_limit) {
    return { valid: false, error: "Este cupom já atingiu o limite de usos." };
  }
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < Date.now()) {
    return { valid: false, error: "Este cupom expirou." };
  }
  if (coupon.min_nights && params.nightsCount < coupon.min_nights) {
    return {
      valid: false,
      error: `Este cupom exige uma estadia mínima de ${coupon.min_nights} noites.`,
    };
  }

  const rawDiscount =
    coupon.type === "percentage"
      ? params.totalBeforeDiscount * (Number(coupon.value) / 100)
      : Number(coupon.value);

  // Nunca deixa o desconto ultrapassar o total (evita total negativo).
  const discountAmount = Math.min(rawDiscount, params.totalBeforeDiscount);

  return { valid: true, discountAmount: Number(discountAmount.toFixed(2)) };
}
