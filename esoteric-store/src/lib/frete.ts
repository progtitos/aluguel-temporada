import type { ShippingOption } from '@/types';

type CartDimensions = {
  totalWeightGrams: number;
  maxHeightCm: number;
  maxWidthCm: number;
  maxLengthCm: number;
};

/**
 * Calcula opções de frete a partir de um CEP de destino.
 *
 * Estratégia:
 * 1. Se MELHOR_ENVIO_TOKEN estiver configurado, usa a API de cálculo
 *    de fretes do Melhor Envio (multi-transportadora: Correios, Jadlog etc).
 * 2. Caso contrário, cai para uma simulação local baseada em faixas de CEP
 *    e peso, para permitir testar a loja sem credenciais externas.
 */
export async function calcularFrete(
  cepDestino: string,
  dimensoes: CartDimensions
): Promise<ShippingOption[]> {
  const cep = cepDestino.replace(/\D/g, '');

  if (cep.length !== 8) {
    throw new Error('CEP inválido. Informe um CEP com 8 dígitos.');
  }

  const token = process.env.MELHOR_ENVIO_TOKEN;
  const cepOrigem = process.env.LOJA_CEP_ORIGEM;

  if (token && cepOrigem) {
    return calcularFreteMelhorEnvio(cep, cepOrigem, dimensoes, token);
  }

  return calcularFreteSimulado(cep, dimensoes);
}

async function calcularFreteMelhorEnvio(
  cepDestino: string,
  cepOrigem: string,
  dimensoes: CartDimensions,
  token: string
): Promise<ShippingOption[]> {
  const response = await fetch(
    'https://melhorenvio.com.br/api/v2/me/shipment/calculate',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Loja Esoterica (contato@sualoja.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino },
        package: {
          height: Math.max(2, dimensoes.maxHeightCm),
          width: Math.max(11, dimensoes.maxWidthCm),
          length: Math.max(16, dimensoes.maxLengthCm),
          weight: Math.max(0.1, dimensoes.totalWeightGrams / 1000),
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Não foi possível calcular o frete no momento.');
  }

  const data = await response.json();

  return (data as any[])
    .filter((option) => !option.error)
    .map((option) => ({
      method: String(option.id),
      label: `${option.company?.name ?? 'Transportadora'} - ${option.name}`,
      price: Number(option.price),
      deadlineDays: Number(option.delivery_time ?? 7),
    }));
}

/**
 * Simulação local de frete, usada em ambiente de desenvolvimento ou quando
 * nenhuma integração de frete está configurada. Baseada em região de CEP.
 */
function calcularFreteSimulado(cep: string, dimensoes: CartDimensions): ShippingOption[] {
  const regiao = Number(cep[0]);
  const pesoKg = dimensoes.totalWeightGrams / 1000;

  // Faixas de preço aproximadas por região (0-9) e peso.
  const baseRegiao: Record<number, number> = {
    0: 22, 1: 24, // SP
    2: 26, // RJ/ES
    3: 25, // MG
    4: 28, // BA/SE
    5: 30, // PE/AL/PB/RN
    6: 32, // CE/PI/MA/PA/AM
    7: 27, // DF/GO/TO/MT/MS
    8: 29, // PR/SC
    9: 29, // RS
  };

  const base = baseRegiao[regiao] ?? 30;
  const pesoExtra = Math.max(0, pesoKg - 0.3) * 8;

  const pac = Math.round((base + pesoExtra) * 100) / 100;
  const sedex = Math.round((base * 1.7 + pesoExtra * 1.3) * 100) / 100;

  return [
    { method: 'pac', label: 'Correios PAC', price: pac, deadlineDays: 8 },
    { method: 'sedex', label: 'Correios SEDEX', price: sedex, deadlineDays: 3 },
  ];
}
