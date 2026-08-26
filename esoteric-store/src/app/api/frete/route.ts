import { NextRequest, NextResponse } from 'next/server';
import { calcularFrete } from '@/lib/frete';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cep, items } = body as {
      cep: string;
      items: { weightGrams: number; heightCm: number; widthCm: number; lengthCm: number; quantity: number }[];
    };

    if (!cep || !items?.length) {
      return NextResponse.json(
        { error: 'Informe o CEP e os itens do carrinho.' },
        { status: 400 }
      );
    }

    const totalWeightGrams = items.reduce(
      (sum, i) => sum + i.weightGrams * i.quantity,
      0
    );
    const maxHeightCm = Math.max(...items.map((i) => i.heightCm));
    const maxWidthCm = Math.max(...items.map((i) => i.widthCm));
    const maxLengthCm = Math.max(...items.map((i) => i.lengthCm));

    const opcoes = await calcularFrete(cep, {
      totalWeightGrams,
      maxHeightCm,
      maxWidthCm,
      maxLengthCm,
    });

    return NextResponse.json({ options: opcoes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Erro ao calcular o frete.' },
      { status: 500 }
    );
  }
}
