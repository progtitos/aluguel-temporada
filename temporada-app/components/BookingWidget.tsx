"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";
import { calculatePricing, rateSourceLabel } from "@/lib/pricing";
import { maskCPF, isValidCPF } from "@/lib/cpfMask";
import { getAvailabilityWindowEnd } from "@/lib/availability";
import { formatBRL, formatDate, toISODate } from "@/lib/utils";
import type { PricingRule, Property } from "@/types/database";

type Blocked = { check_in: string; check_out: string };
type Step = "datas" | "dados" | "pagamento";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const calendarStyle: CSSProperties = {
  ["--rdp-day_button-width" as string]: "clamp(1.9rem, 8vw, 2.5rem)",
  ["--rdp-day_button-height" as string]: "clamp(1.9rem, 8vw, 2.5rem)",
};

export default function BookingWidget({
  property,
  pricingRules = [],
  blockedRanges = [],
}: {
  property: Property;
  pricingRules?: PricingRule[];
  blockedRanges?: Blocked[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [step, setStep] = useState<Step>("datas");
  const [method, setMethod] = useState<"pix" | "cartao">("pix");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");

  // Máscara local de telefone para evitar erros de exportação
  const handleWhatsappChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setWhatsapp(formatted);
  };

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

  function handleContinueToPayment() {
    setError(null);
    if (fullName.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      setError("Informe um número de WhatsApp válido, com DDD.");
      return;
    }
    if (!isValidCPF(cpf)) {
      setError("Informe um CPF válido (necessário para gerar o Pix).");
      return;
    }
    setStep("pagamento");
  }

  async function handlePay() {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          check_in: toISODate(range.from),
          check_out: toISODate(range.to),
          method,
          full_name: fullName.trim(),
          email: email.trim(),
          whatsapp,
          cpf,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar a reserva.");

      if (method === "cartao" && data.init_point) {
        window.location.href = data.init_point;
        return;
      }
      if (method === "pix") {
        setPixData({ qr_code: data.qr_code, qr_code_base64: data.qr_code_base64 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-forest-100 bg-white p-5 shadow-soft max-w-md mx-auto">
      <p className="font-display text-2xl font-semibold text-ink">
        {formatBRL(property.preco_semana)}
        <span className="text-base font-normal text-ink/50"> / diária (semana)</span>
      </p>
      <p className="text-sm text-ink/50">
        {formatBRL(property.preco_fds)} / diária (sexta a domingo)
      </p>
      {property.minimo_noites > 1 && (
        <p className="mt-1 text-xs text-amber-600 font-medium">
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
          {/* Container ajustado para remover a barra de scroll cinza */}
          <div className="mt-4 w-full flex justify-center overflow-hidden">
            <DayPicker
              mode="range"
              locale={ptBR}
              selected={range}
              onSelect={setRange}
              disabled={disabledDates}
              numberOfMonths={1}
              className="!font-sans m-0"
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
              <div className="flex justify-between pt-2 font-semibold text-base">
                <span>Total</span>
                <span>{formatBRL(pricing.total)}</span>
              </div>
              {pricing.nightsCount < pricing.minNightsRequired && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 mt-2">
                  Este período exige uma estadia mínima de {pricing.minNightsRequired} noites.
                  Selecione um intervalo maior para continuar.
                </p>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleContinue}
            className="mt-4 w-full rounded-full bg-forest-700 py-3 font-medium text-white transition active:scale-[0.98] hover:bg-emerald-800"
          >
            Continuar
          </button>
        </>
      )}

      {step === "dados" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink/70">
            Para gerar o pagamento, precisamos do seu nome completo, e-mail, WhatsApp e CPF
            (exigido pelo Mercado Pago para o Pix).
          </p>
          <label className="block text-sm">
            Nome completo
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
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
              className="mt-1 w-full rounded-lg border border-forest-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            WhatsApp
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
              value={whatsapp}
              onChange={(e) => handleWhatsappChange(e.target.value)}
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </label>
          <label className="block text-sm">
            CPF
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleContinueToPayment}
            className="w-full rounded-full bg-forest-700 py-3 font-medium text-white transition active:scale-[0.98] hover:bg-emerald-800"
          >
            Continuar para pagamento
          </button>
          <button
            onClick={() => setStep("datas")}
            className="w-full text-center text-xs text-ink/50 underline py-1"
          >
            Voltar
          </button>
        </div>
      )}

      {step === "pagamento" && !pixData && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between border-b border-forest-100 pb-3 text-sm font-medium">
            <span>Total a pagar</span>
            <span>{formatBRL(pricing?.total ?? 0)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMethod("pix")}
              className={`flex-1 rounded-full border py-2 text-sm font-medium transition ${
                method === "pix"
                  ? "border-forest-700 bg-forest-700 text-white"
                  : "border-forest-100 text-ink/70"
              }`}
            >
              Pix
            </button>
            <button
              onClick={() => setMethod("cartao")}
              className={`flex-1 rounded-full border py-2 text-sm font-medium transition ${
                method === "cartao"
                  ? "border-forest-700 bg-forest-700 text-white"
                  : "border-forest-100 text-ink/70"
              }`}
            >
              Cartão de crédito
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full rounded-full bg-amber-500 py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-60 hover:bg-amber-600"
          >
            {loading ? "Gerando pagamento..." : "Pagar agora"}
          </button>
          <button
            onClick={() => setStep("dados")}
            className="w-full text-center text-xs text-ink/50 underline py-1"
          >
            Voltar
          </button>
        </div>
      )}

      {pixData && (
        <div className="mt-4 space-y-3 text-center">
          <p className="text-sm text-ink/70">
            Escaneie o QR Code ou use o Pix Copia e Cola. A reserva é confirmada
            automaticamente após a aprovação do pagamento.
          </p>
          {pixData.qr_code_base64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code Pix"
              className="mx-auto h-56 w-56 rounded-xl border border-forest-100 p-2"
            />
          )}
          {pixData.qr_code && (
            <textarea
              readOnly
              value={pixData.qr_code}
              className="h-20 w-full resize-none rounded-lg border border-forest-100 p-2 text-xs focus:outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      )}
    </div>
  );
}
