"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { ptBR } from "@/lib/dateLocale";
import { createClient } from "@/lib/supabase/client";
import { calculatePricing, rateSourceLabel } from "@/lib/pricing";
import { maskWhatsApp, isValidBrazilianPhone } from "@/lib/phoneMask";
import { formatBRL, formatDate, toISODate } from "@/lib/utils";
import type { PricingRule, Property } from "@/types/database";
import LoginButtons from "@/components/LoginButtons";

type Blocked = { check_in: string; check_out: string };
type Step = "datas" | "login" | "perfil" | "pagamento";

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
  const [method, setMethod] = useState<"pix" | "cartao">("pix");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const disabledDates = useMemo(
    () =>
      blockedRanges.map((b) => ({
        from: new Date(b.check_in + "T00:00:00"),
        to: new Date(new Date(b.check_out + "T00:00:00").getTime() - 86400000),
      })),
    [blockedRanges]
  );

  const pricing = useMemo(() => {
    if (!range?.from || !range?.to) return null;
    return calculatePricing(property, pricingRules, toISODate(range.from), toISODate(range.to));
  }, [range, property, pricingRules]);

  // Retoma uma reserva iniciada antes do login social (ver LoginButtons)
  useEffect(() => {
    const raw = sessionStorage.getItem("pending_booking");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      if (pending.property_id !== property.id) return;

      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        setRange({
          from: new Date(pending.check_in + "T00:00:00"),
          to: new Date(pending.check_out + "T00:00:00"),
        });
        sessionStorage.removeItem("pending_booking");
        goToProfileOrPayment();
      });
    } catch {
      sessionStorage.removeItem("pending_booking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function goToProfileOrPayment() {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const profile = await res.json();
      if (profile?.full_name && profile?.whatsapp) {
        setFullName(profile.full_name);
        setWhatsapp(maskWhatsApp(profile.whatsapp));
        setStep("pagamento");
        return;
      }
      if (profile?.full_name) setFullName(profile.full_name);
    }
    setStep("perfil");
  }

  async function handleContinue() {
    setError(null);
    if (!range?.from || !range?.to || !pricing || pricing.nightsCount < 1) {
      setError("Selecione as datas de check-in e check-out.");
      return;
    }
    if (pricing.nightsCount < pricing.minNightsRequired) {
      setError(
        `Este período exige uma estadia mínima de ${pricing.minNightsRequired} noites.`
      );
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      sessionStorage.setItem(
        "pending_booking",
        JSON.stringify({
          property_id: property.id,
          check_in: toISODate(range.from),
          check_out: toISODate(range.to),
        })
      );
      setStep("login");
      return;
    }

    await goToProfileOrPayment();
  }

  async function handleSaveProfile() {
    setError(null);
    if (fullName.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!isValidBrazilianPhone(whatsapp)) {
      setError("Informe um número de WhatsApp válido, com DDD.");
      return;
    }

    setSavingProfile(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), whatsapp }),
    });
    setSavingProfile(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar seus dados.");
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
    <div className="rounded-xl2 border border-forest-100 bg-white p-5 shadow-soft">
      <p className="font-display text-2xl font-semibold text-ink">
        {formatBRL(property.preco_semana)}
        <span className="text-base font-normal text-ink/50"> / diária (semana)</span>
      </p>
      <p className="text-sm text-ink/50">
        {formatBRL(property.preco_fds)} / diária (sexta a domingo)
      </p>

      {step === "datas" && (
        <>
          <div className="mt-4 overflow-x-auto">
            <DayPicker
              mode="range"
              locale={ptBR}
              selected={range}
              onSelect={setRange}
              disabled={[{ before: new Date() }, ...disabledDates]}
              numberOfMonths={1}
              className="!font-sans"
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

      {step === "login" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink/70">
            Entre com sua conta para concluir a reserva de {pricing?.nightsCount ?? ""} noites.
          </p>
          <LoginButtons redirectTo="/auth/callback" />
          <button
            onClick={() => setStep("datas")}
            className="w-full text-center text-xs text-ink/50 underline"
          >
            Voltar
          </button>
        </div>
      )}

      {step === "perfil" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink/70">
            Para confirmarmos sua reserva, precisamos do seu nome completo e WhatsApp.
          </p>
          <label className="block text-sm">
            Nome completo
            <input
              className="mt-1 w-full rounded-lg border border-forest-100 p-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="w-full rounded-full bg-forest-700 py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {savingProfile ? "Salvando..." : "Continuar para pagamento"}
          </button>
          <button
            onClick={() => setStep("datas")}
            className="w-full text-center text-xs text-ink/50 underline"
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
              className={`flex-1 rounded-full border py-2 text-sm font-medium ${
                method === "pix"
                  ? "border-forest-700 bg-forest-700 text-white"
                  : "border-forest-100 text-ink/70"
              }`}
            >
              Pix
            </button>
            <button
              onClick={() => setMethod("cartao")}
              className={`flex-1 rounded-full border py-2 text-sm font-medium ${
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
            className="w-full rounded-full bg-amber-500 py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Gerando pagamento..." : "Pagar agora"}
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
              className="mx-auto h-56 w-56 rounded-xl border border-forest-100"
            />
          )}
          {pixData.qr_code && (
            <textarea
              readOnly
              value={pixData.qr_code}
              className="h-20 w-full resize-none rounded-lg border border-forest-100 p-2 text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      )}
    </div>
  );
}
