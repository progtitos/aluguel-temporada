"use client";

import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Property, PricingRule } from "@/types/database";
import { maskPhone, isValidPhone } from "@/lib/phoneMask";
import { maskCPF, isValidCPF } from "@/lib/cpfMask";

interface BlockedRange {
  start: Date;
  end: Date;
}

interface BookingWidgetProps {
  property: Property;
  pricingRules?: PricingRule[];
  blockedRanges?: BlockedRange[];
  disabledDates?: Date[];
}

export default function BookingWidget({
  property,
  pricingRules = [],
  blockedRanges = [],
  disabledDates = [],
}: BookingWidgetProps) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [step, setStep] = useState<"dates" | "guest_info" | "pix_checkout">("dates");

  // Dados do hóspede
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  // Estados de processamento e resposta do Pix
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qrCodeBase64?: string;
    qrCodeCopyPaste?: string;
    bookingId?: string;
  } | null>(null);

  const checkIn = range?.from;
  const checkOut = range?.to;
  const totalNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  // Cálculo básico de valor estimado
  const pricePerNight = property.preco_semana || 0;
  const rawSubtotal = totalNights * pricePerNight;
  const cleaningFee = property.cleaning_fee || 0;
  const estimatedTotal = rawSubtotal + cleaningFee;

  // Validação da Janela de Disponibilidade
  const maxAvailableDate = property.janela_disponibilidade_meses
    ? new Date(new Date().setMonth(new Date().getMonth() + property.janela_disponibilidade_meses))
    : undefined;

  const handleAdvanceToGuestInfo = () => {
    setErrorMsg(null);
    if (!checkIn || !checkOut) {
      setErrorMsg("Por favor, selecione as datas de entrada e saída.");
      return;
    }
    if (totalNights < (property.minimo_noites || 1)) {
      setErrorMsg(`O número mínimo de noites para esta acomodação é ${property.minimo_noites}.`);
      return;
    }
    setStep("guest_info");
  };

  const handleGeneratePixPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Informe seu nome completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Informe um e-mail válido.");
      return;
    }
    if (!isValidPhone(phone)) {
      setErrorMsg("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (!isValidCPF(cpf)) {
      setErrorMsg("Informe um CPF válido para a emissão do Pix.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          check_in: format(checkIn!, "yyyy-MM-dd"),
          check_out: format(checkOut!, "yyyy-MM-dd"),
          guest_name: fullName,
          guest_email: email,
          guest_phone: phone,
          guest_cpf: cpf,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao gerar o pagamento Pix.");
      }

      setPixData({
        qrCodeBase64: data.qr_code_base64,
        qrCodeCopyPaste: data.qr_code,
        bookingId: data.booking_id,
      });
      setStep("pix_checkout");
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao processar sua reserva.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl w-full max-w-md mx-auto">
      <div className="mb-4 pb-4 border-b border-gray-100 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-gray-900">
            R$ {pricePerNight.toLocaleString("pt-BR")}
          </span>
          <span className="text-gray-500 text-sm"> / noite</span>
        </div>
        {property.minimo_noites > 1 && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            Mínimo {property.minimo_noites} noites
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* ETAPA 1: SELEÇÃO DE DATAS */}
      {step === "dates" && (
        <div className="space-y-4">
          <div className="overflow-x-auto flex justify-center">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              locale={ptBR}
              disabled={[
                { before: new Date() },
                ...(maxAvailableDate ? [{ after: maxAvailableDate }] : []),
                ...disabledDates,
              ]}
              numberOfMonths={1}
            />
          </div>

          {totalNights > 0 && (
            <div className="space-y-2 pt-2 border-t text-sm text-gray-600">
              <div className="flex justify-between">
                <span>R$ {pricePerNight} x {totalNights} noites</span>
                <span>R$ {rawSubtotal.toLocaleString("pt-BR")}</span>
              </div>
              {cleaningFee > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de limpeza</span>
                  <span>R$ {cleaningFee.toLocaleString("pt-BR")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t">
                <span>Total estimado</span>
                <span>R$ {estimatedTotal.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleAdvanceToGuestInfo}
            disabled={!checkIn || !checkOut}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition"
          >
            Continuar para dados de contato
          </button>
        </div>
      )}

      {/* ETAPA 2: DADOS DO HÓSPEDE (SEM LOGIN SOCIAL) */}
      {step === "guest_info" && (
        <form onSubmit={handleGeneratePixPayment} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Seus dados para reserva</h3>
            <button
              type="button"
              onClick={() => setStep("dates")}
              className="text-xs text-gray-500 hover:underline"
            >
              Alterar datas
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digite seu nome"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 90000-0000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Gerando Pix..." : "Pagar com Pix"}
          </button>
        </form>
      )}

      {/* ETAPA 3: PAGAMENTO PIX */}
      {step === "pix_checkout" && pixData && (
        <div className="text-center space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">Pagamento via Pix</h3>
          <p className="text-xs text-gray-500">
            Escaneie o QR Code abaixo ou copie o código Pix para finalizar sua reserva.
          </p>

          {pixData.qrCodeBase64 && (
            <div className="flex justify-center py-2">
              <img
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code Pix"
                className="w-48 h-48 border p-2 rounded-xl"
              />
            </div>
          )}

          {pixData.qrCodeCopyPaste && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(pixData.qrCodeCopyPaste!);
                alert("Código Pix Copia e Cola copiado!");
              }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition"
            >
              Copiar Código Pix (Copia e Cola)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
