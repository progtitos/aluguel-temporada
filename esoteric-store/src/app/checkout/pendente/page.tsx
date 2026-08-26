import Link from 'next/link';
import { Clock } from 'lucide-react';

export default async function CheckoutPendentePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="container-store flex flex-col items-center py-24 text-center">
      <Clock className="mb-4 text-terracota-700" size={48} />
      <h1 className="font-display text-3xl font-medium text-ink-700">
        Pagamento em análise
      </h1>
      {order && (
        <p className="mt-2 text-sm text-ink-500">
          Número do pedido: <span className="font-semibold text-ink-700">{order}</span>
        </p>
      )}
      <p className="mt-3 max-w-md text-sm text-ink-500">
        Recebemos seu pedido e estamos aguardando a confirmação do pagamento pelo Mercado
        Pago. Isso pode levar alguns minutos (Pix) ou até 2 dias úteis (boleto). Você
        receberá um e-mail assim que o pagamento for aprovado.
      </p>
      <Link href="/produtos" className="btn-primary mt-6">
        Continuar comprando
      </Link>
    </div>
  );
}
