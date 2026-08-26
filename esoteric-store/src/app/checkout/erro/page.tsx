import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default async function CheckoutErroPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="container-store flex flex-col items-center py-24 text-center">
      <XCircle className="mb-4 text-terracota-700" size={48} />
      <h1 className="font-display text-3xl font-medium text-ink-700">
        Não foi possível concluir o pagamento
      </h1>
      {order && (
        <p className="mt-2 text-sm text-ink-500">
          Número do pedido: <span className="font-semibold text-ink-700">{order}</span>
        </p>
      )}
      <p className="mt-3 max-w-md text-sm text-ink-500">
        O pagamento foi recusado ou cancelado. Nenhum valor foi cobrado. Você pode tentar
        novamente com outro método de pagamento ou entrar em contato conosco se o problema
        persistir.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/checkout" className="btn-primary">
          Tentar novamente
        </Link>
        <Link href="/produtos" className="btn-secondary">
          Voltar para a loja
        </Link>
      </div>
    </div>
  );
}
