'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency, cn } from '@/lib/utils';

export function CartDrawer() {
  const router = useRouter();
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  // "Finalizar Compra" sempre leva para /checkout, que exige o cadastro
  // completo (nome, sobrenome, e-mail, CEP, número, bairro, cidade, estado)
  // e o cálculo/seleção de frete ANTES de gerar o pedido e ir para o
  // Mercado Pago. O antigo fluxo de "compra rápida" (/api/checkout/quick),
  // que pulava esse formulário, foi desativado por aqui de propósito — ver
  // o comentário no topo de src/app/api/checkout/quick/route.ts.
  function handleFinalizarCompra() {
    closeCart();
    router.push('/checkout');
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm transition-opacity',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeCart}
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-ivory-100 shadow-soft transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-display text-xl font-semibold text-ink-700">Sua Sacola</h2>
          <button onClick={closeCart} aria-label="Fechar carrinho" className="p-1 text-ink-500 hover:text-dourado-700">
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag size={40} className="text-ink-300" />
            <p className="text-sm text-ink-500">Sua sacola está vazia por enquanto.</p>
            <button onClick={closeCart} className="btn-secondary mt-2">
              Continuar explorando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-ivory-200">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-700">{item.name}</p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-ink-300 hover:text-terracota-700"
                        aria-label="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-md border border-ink/15">
                        <button
                          className="p-1.5 text-ink-500 hover:text-dourado-700"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-sm">{item.quantity}</span>
                        <button
                          className="p-1.5 text-ink-500 hover:text-dourado-700"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-ink-700">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-ink/10 px-6 py-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="font-semibold text-ink-700">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mb-4 text-xs text-ink-300">
                Frete e cupom de desconto são calculados na próxima etapa, junto com seus
                dados de entrega.
              </p>
              <button
                onClick={handleFinalizarCompra}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                Finalizar Compra
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
