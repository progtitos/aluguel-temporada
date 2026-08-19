"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { ptBR } from "@/lib/dateLocale";
import { calculatePricing, rateSourceLabel } from "@/lib/pricing";
import { maskWhatsApp, isValidBrazilianPhone } from "@/lib/phoneMask";
import { maskCPF, isValidCPF } from "@/lib/cpfMask";
import { getAvailabilityWindowEnd } from "@/lib/availability";
import { formatBRL, formatDate, toISODate } from "@/lib/utils";
import type { PricingRule, Property } from "@/types/database";

type Blocked = { check_in: string; check_out: string };
type Step = "datas" | "dados";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const calendarStyle: CSSProperties = {
  ["--rdp-day_button-width" as string]: "clamp(1.9rem, 8vw, 2.5rem)",
  ["--rdp-day_button-height" as string]: "clamp(1.9rem, 8vw, 2.5rem)",
};

export default function BookingWidget({
  property,
  pricingRules,
  blockedRanges,
}: {
  property: Property;
  pricingRules: PricingRule[];
  blockedRanges: Blocked[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [step, setStep] = useState<Step>("datas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");

  const windowEnd = useMemo(
    () => getAvailabilityWindowEnd(property.janela_disponibilidade_meses),
    [property.janela_disponibilidade_meses]
  );

  const disabledDates = useMemo(() => {
    const matchers: Matcher[] = [
      { before: new Date() },
      ...blockedRanges.map((b) => ({
        from: new Date(b.check_in + "T00:00:00"),
        to: new Date(new Date(b.check_out + "T00:00:00").getTime() - 86400000),
      })),
    ];
    if (windowEnd) matchers.push({ after: windowEnd });
    return matchers;
  }, [blockedRanges, windowEnd]);

  const pricing = useMemo(() => {
    if (!range?.from || !range?.to) return null;
    return calculatePricing(property, pricingRules, toISODate(range.from), toISODate(range.to));
  }, [range, property, pricingRules]);

  function handleContinue() {
    setError(null);
    if (!range?.from || !range?.to || !pricing || pricing.nightsCount < 1) {
      setError("Selecione as datas de check-in e check-out.");
      return;
    }
    if (pricing.nightsCount < pricing.minNightsRequired) {
      setError(`Este período exige uma estadia mínima de ${pricing.minNightsRequired} noites.`);
      return;
    }
    setStep("dados");
  }

  async function handlePay() {
    if (!range?.from || !range?.to) return;

    setError(null);
    if (fullName.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!isValidBrazilianPhone(whatsapp)) {
      setError("Informe um número de WhatsApp válido, com DDD.");
      return;
    }
    if (!isValidCPF(cpf)) {
      setError("Informe um CPF válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          check_in: toISODate(range.from),
          check_out: toISODate(range.to),
          method: "pix", // O Mercado Pago gerenciará a escolha final no Checkout Pro
          full_name: fullName.trim(),
          email: email.trim(),
          whatsapp,
          cpf,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar a reserva.");

      // Redireciona o hóspede diretamente para o Mercado Pago
      if (data.init_point) {
        window.location.href = data.init_point;
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-forest-100 bg-white p-5 shadow-soft">
      <p className="font-display text-2xl font-semibold text-ink">
        {formatBRL(property.preco_semana)}
        <span className="text-base font-normal text-ink/50"> / diária (semana)</span>
      </p>
      <p className="text-sm text-ink/50">
        {formatBRL(property.preco_fds)} / diária (sexta a domingo)
      </p>
      {property.minimo_noites > 1 && (
        <p className="mt-1 text-xs text-amber-600">
          Estadia mínima: {property.minimo_noites} noites
        </p>
      )}
      {windowEnd && (
        <p className="mt-1 text-xs text-ink/40">
          Reservas disponíveis até {formatDate(toISODate(windowEnd))}
        </p>
      )}

      {step === "datas" && (
        <>
          <div className="mt-4 w-full">
            <DayPicker
              mode="range"
              locale={ptBR}
              selected={range}
              onSelect={setRange}
              disabled={disabledDates}
              numberOfMonths={1}
              className="!font-sans w-full"
              style={calendarStyle}
            />
          </div>

          {pricing && pricing.nightsCount > 0 && (
            <div className="mt-4 space-y-1 border-t border-forest-100 pt-4 text-sm">
              <div className="flex justify-between font-medium">
                <span>
                  {formatDate(range!.from!)} → {formatDate(range!.to!)} ({pricing.nightsCount}{" "}
                  noites)
                </span>
                <span>{formatBRL(pricing.accommodationSubtotal)}</span>
              </div>
              <ul className="space-y-0.5 pl-1 text-xs text-ink/50">
                {pricing.nights.map((n) => (
                  <li key={n.date} className="flex justify-between">
                    <span>
                      {formatDate(n.date)} · {rateSourceLabel(n.source, n.ruleName)}
                    </span>
                    <span>{formatBRL(n.rate)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-ink/60">
                <span>Taxa de limpeza</span>
                <span>{formatBRL(pricing.cleaningFee)}</span>
              </div>
              <div className="flex justify-between pt-2 font-semibold">
                <span>Total</span>
                <span>{formatBRL(pricing.total)}</span>
              </div>
              {pricing.nightsCount < pricing.minNightsRequired && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Este período exige uma estadia mínima de {pricing.minNightsRequired} noites.
                  Selecione um intervalo maior para continuar.
                </p>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleContinue}
            className="mt-4 w-full rounded-full bg-forest-700 py-3 font-medium text-white transition active:scale-[0.98]"
          >
            Continuar
          </button>
        </>
      )}

      {step === "dados" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink/70">
            Informe seus dados para prosseguir com a reserva e pagamento seguro.
          </p>
          <label className="block text-sm">
            Nome completo
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            E-mail
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            WhatsApp
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsApp(e.target.value))}
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </label>
          <label className="block text-sm">
            CPF
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full rounded-full bg-forest-700 py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Redirecionando para o pagamento..." : "Ir para o pagamento"}
          </button>
          <button
            onClick={() => setStep("datas")}
            className="w-full text-center text-xs text-ink/50 underline"
            disabled={loading}
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
