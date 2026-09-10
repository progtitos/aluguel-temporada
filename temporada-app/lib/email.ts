import { Resend } from "resend";
import { formatBRL, formatDate } from "@/lib/utils";

// Remetente do Resend. Antes de verificar seu próprio domínio, o Resend
// permite enviar a partir de "onboarding@resend.dev" — ótimo para testar,
// mas troque por um e-mail do seu domínio assim que verificá-lo (ver
// SETUP.md), pois o remetente de teste tem mais chance de cair em spam.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Reservas <onboarding@resend.dev>";

export type BookingConfirmationEmailData = {
  guestName: string;
  guestEmail: string;
  propertyName: string;
  addressFull: string | null;
  checkIn: string;
  checkOut: string;
  checkinTime: string;
  checkoutTime: string;
  totalAmount: number;
  houseRules: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Envia o e-mail de confirmação após o Mercado Pago aprovar o pagamento.
 * O Mercado Pago NÃO envia nenhum e-mail com os detalhes da reserva para
 * o hóspede — só o próprio recibo genérico da conta MP dele, se tiver uma.
 * Este e-mail é a única confirmação "com cara da sua pousada" que o
 * hóspede recebe, e é aqui que revelamos o endereço exato (a página
 * pública mostra só o mapa, sem o endereço em texto).
 */
export async function sendBookingConfirmationEmail(data: BookingConfirmationEmailData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY não configurada — e-mail de confirmação não enviado. Veja SETUP.md."
    );
    return;
  }

  const resend = new Resend(apiKey);

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #211F1A;">
      <h1 style="font-size: 20px; margin-bottom: 4px;">Reserva confirmada! 🎉</h1>
      <p style="color: #6b6a63; margin-top: 0;">Olá, ${escapeHtml(data.guestName)}. Seu pagamento foi aprovado.</p>

      <div style="background: #FAF7F1; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; font-weight: 600;">${escapeHtml(data.propertyName)}</p>
        <p style="margin: 0; font-size: 14px;">
          Check-in: ${formatDate(data.checkIn)} a partir das ${escapeHtml(data.checkinTime)}<br />
          Check-out: ${formatDate(data.checkOut)} até às ${escapeHtml(data.checkoutTime)}
        </p>
        ${
          data.addressFull
            ? `<p style="margin: 8px 0 0; font-size: 14px;"><strong>Endereço:</strong> ${escapeHtml(data.addressFull)}</p>`
            : ""
        }
        <p style="margin: 8px 0 0; font-size: 14px;"><strong>Total pago:</strong> ${formatBRL(data.totalAmount)}</p>
      </div>

      ${
        data.houseRules
          ? `<div style="margin: 16px 0;">
               <p style="font-weight: 600; margin-bottom: 4px;">Regras da casa</p>
               <p style="font-size: 13px; color: #4a4944; white-space: pre-line;">${escapeHtml(data.houseRules)}</p>
             </div>`
          : ""
      }

      <p style="font-size: 12px; color: #a3a196; margin-top: 24px;">
        Se tiver qualquer dúvida sobre a estadia, é só responder este e-mail.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.guestEmail,
      subject: `Reserva confirmada — ${data.propertyName}`,
      html,
    });
  } catch (error) {
    // Nunca deixamos uma falha de e-mail derrubar a confirmação do
    // pagamento em si — a reserva já está confirmada no banco antes
    // desta chamada. Só registramos para investigar depois.
    console.error("Falha ao enviar e-mail de confirmação:", error);
  }
}
