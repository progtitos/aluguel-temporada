'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '@/types';
import { useCartStore } from '@/store/cart-store';

export function AddToCartPanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const inStock = product.stock > 0;

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.images?.[0] ?? null,
        stock: product.stock,
      },
      quantity
    );
    toast.success(`${product.name} adicionado à sacola`);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 rounded-md border border-ink/15 px-2 py-2">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="p-1 text-ink-500 hover:text-dourado-700"
          aria-label="Diminuir quantidade"
        >
          <Minus size={16} />
        </button>
        <span className="w-6 text-center text-sm">{quantity}</span>
        <button
          onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
          className="p-1 text-ink-500 hover:text-dourado-700"
          aria-label="Aumentar quantidade"
        >
          <Plus size={16} />
        </button>
      </div>
      <button onClick={handleAdd} disabled={!inStock} className="btn-primary flex-1">
        <ShoppingBag size={18} />
        {inStock ? 'Adicionar à Sacola' : 'Produto Esgotado'}
      </button>
    </div>
  );
}
