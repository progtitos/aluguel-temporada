// Sanitiza CPF e WhatsApp para enviar apenas números ao Mercado Pago
const cleanCpf = cpf ? cpf.replace(/\D/g, "") : "";
const cleanPhone = whatsapp ? whatsapp.replace(/\D/g, "") : "";

// Exemplo da estrutura enviada ao Mercado Pago
const paymentData = {
  transaction_amount: Number(total),
  description: `Reserva - ${property.title}`,
  payment_method_id: "pix",
  payer: {
    email: email.trim(),
    first_name: fullName.trim().split(" ")[0],
    last_name: fullName.trim().split(" ").slice(1).join(" ") || "Hospede",
    identification: {
      type: "CPF",
      number: cleanCpf, // <--- Apenas os 11 dígitos numéricos
    },
  },
};
