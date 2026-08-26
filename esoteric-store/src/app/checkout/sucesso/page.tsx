import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { ClearCartOnMount } from '@/components/checkout/ClearCartOnMount';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="container-store flex flex-col items-center py-24 text-center">
      <ClearCartOnMount />
      <CheckCircle2 className="mb-4 text-dourado-700" size={48} />
      <h1 className="font-display text-3xl font-medium text-ink-700">Pedido confirmado!</h1>
      {order && (
        <p className="mt-2 text-sm text-ink-500">
          Número do pedido: <span className="font-semibold text-ink-700">{order}</span>
        </p>
      )}
      <p className="mt-3 max-w-md text-sm text-ink-500">
        Você receberá um e-mail com os detalhes e a atualização do envio do seu pedido.
      </p>
      <Link href="/produtos" className="btn-primary mt-6">
        Continuar comprando
      </Link>
    </div>
  );
}
