'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';

/**
 * Limpa o carrinho assim que o cliente chega na página de sucesso do
 * checkout. Fica isolado num componente client separado porque a página
 * de sucesso em si é um Server Component (lê `searchParams` via async
 * function) e o store do carrinho só existe no client.
 */
export function ClearCartOnMount() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
