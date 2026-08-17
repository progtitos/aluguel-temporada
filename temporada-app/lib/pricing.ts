import type { PricingRule, Property } from "@/types/database";

export type RateSource = "semana" | "fds" | "feriado";

export type NightBreakdown = {
  /** Data no formato YYYY-MM-DD */
  date: string;
  rate: number;
  source: RateSource;
  /** Nome da regra de feriado aplicada, quando source === "feriado" */
  ruleName?: string;
};

export type PricingResult = {
  nights: NightBreakdown[];
  nightsCount: number;
  accommodationSubtotal: number;
  cleaningFee: number;
  total: number;
  /** Menor número de noites exigido por alguma regra de feriado no período, se houver */
  minNightsRequired: number;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseISODate(value: string): Date {
  // Evita bug de timezone ao interpretar "YYYY-MM-DD" como meia-noite UTC
  return new Date(value + "T00:00:00");
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Sexta (5), sábado (6) e domingo (0) contam como fim de semana. */
export function isWeekendNight(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}

function findRuleForDate(rules: PricingRule[], date: Date): PricingRule | undefined {
  const iso = toISODate(date);
  return rules.find((rule) => iso >= rule.start_date && iso <= rule.end_date);
}

/**
 * Calcula o detalhamento noite a noite e o total da reserva, priorizando
 * regras de feriado/pacote sobre a tarifa padrão de semana/fim de semana.
 * Esta função é a FONTE DA VERDADE do preço e deve ser usada tanto para
 * exibir o resumo ao hóspede quanto (obrigatoriamente) no servidor antes
 * de gerar qualquer cobrança no Mercado Pago.
 */
export function calculatePricing(
  property: Pick<Property, "preco_semana" | "preco_fds" | "cleaning_fee">,
  pricingRules: PricingRule[],
  checkIn: string,
  checkOut: string
): PricingResult {
  const start = parseISODate(checkIn);
  const end = parseISODate(checkOut);
  const nights: NightBreakdown[] = [];
  let minNightsRequired = 1;

  for (let t = start.getTime(); t < end.getTime(); t += MS_PER_DAY) {
    const current = new Date(t);
    const rule = findRuleForDate(pricingRules, current);

    if (rule) {
      nights.push({
        date: toISODate(current),
        rate: Number(rule.price_per_night),
        source: "feriado",
        ruleName: rule.name,
      });
      minNightsRequired = Math.max(minNightsRequired, rule.min_nights);
    } else if (isWeekendNight(current)) {
      nights.push({ date: toISODate(current), rate: Number(property.preco_fds), source: "fds" });
    } else {
      nights.push({
        date: toISODate(current),
        rate: Number(property.preco_semana),
        source: "semana",
      });
    }
  }

  const accommodationSubtotal = nights.reduce((sum, n) => sum + n.rate, 0);
  const cleaningFee = Number(property.cleaning_fee);

  return {
    nights,
    nightsCount: nights.length,
    accommodationSubtotal,
    cleaningFee,
    total: accommodationSubtotal + cleaningFee,
    minNightsRequired,
  };
}

export function rateSourceLabel(source: RateSource, ruleName?: string): string {
  if (source === "feriado") return ruleName ?? "Feriado";
  if (source === "fds") return "Fim de semana";
  return "Semana";
}
