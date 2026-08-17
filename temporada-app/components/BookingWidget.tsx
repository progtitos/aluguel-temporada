"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { createClient } from "@/lib/supabase/client";
import { diffNights, formatBRL, formatDate, toISODate } from "@/lib/utils";
import type { Property } from "@/types/database";
import LoginButtons from "@/components/LoginButtons";

type Blocked = { check_in: string; check_out: string };

export default function BookingWidget({
  property,
  blockedRanges,
}: {
  property: Property;
  blockedRanges: Blocked[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [step, setStep] = useState<"datas" | "login" | "pagamento">("datas");
  const [method, setMethod] = useState<"pix" | "cartao">("pix");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
  } | null>(null);

  const disabledDates = useMemo(
    () =>
      blockedRanges.map((b) => ({
        from: new Date(b.check_in + "T00:00:00"),
        to: new Date(new Date(b.check_out + "T00:00:00").getTime() - 86400000),
      })),
    [blockedRanges]
  );

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
        setStep("pagamento");
        sessionStorage.removeItem("pending_booking");
      });
    } catch {
      sessionStorage.removeItem("pending_booking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nights =
    range?.from && range?.to ? diffNights(toISODate(range.from), toISODate(range.to)) : 0;
  const subtotal = nights * Number(property.price_per_night);
  const total = nights > 0 ? subtotal + Number(property.cleaning_fee) : 0;

  async function handleContinue() {
    setError(null);
    if (!range?.from || !range?.to || nights < 1) {
      setError("Selecione as datas de check-in e check-out.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Guarda a intenção de reserva para retomar após o login social
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
          total_amount: total,
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
        {formatBRL(property.price_per_night)}
        <span className="text-base font-normal text-ink/50"> / diária</span>
      </p>

      {step === "datas" && (
        <>
          <div className="mt-4 overflow-x-auto">
            <DayPicker
              mode="range"
              locale={undefined}
              selected={range}
              onSelect={setRange}
              disabled={[{ before: new Date() }, ...disabledDates]}
              numberOfMonths={1}
              className="!font-sans"
            />
          </div>

          {nights > 0 && (
            <div className="mt-4 space-y-1 border-t border-forest-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span>
                  {formatDate(range!.from!)} → {formatDate(range!.to!)} ({nights} noites)
                </span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>Taxa de limpeza</span>
                <span>{formatBRL(property.cleaning_fee)}</span>
              </div>
              <div className="flex justify-between pt-2 font-semibold">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
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
            Entre com sua conta para concluir a reserva de {nights} noites.
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

      {step === "pagamento" && !pixData && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between border-b border-forest-100 pb-3 text-sm font-medium">
            <span>Total a pagar</span>
            <span>{formatBRL(total)}</span>
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
