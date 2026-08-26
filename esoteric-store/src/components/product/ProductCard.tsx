'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import toast from 'react-hot-toast';

export function ProductCard({
  product,
  badge,
}: {
  product: Product;
  badge?: 'bestseller' | 'promo';
}) {
  const addItem = useCartStore((s) => s.addItem);

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : null;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.images?.[0] ?? null,
        stock: product.stock,
      },
      1
    );
    toast.success(`${product.name} adicionado à sacola`);
  }

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-ink/10 bg-white transition-shadow hover:shadow-card"
    >
      <div className="relative aspect-square overflow-hidden bg-ivory-200">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">Sem imagem</div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {badge === 'bestseller' && <span className="badge-bestseller">Mais vendido</span>}
          {badge === 'promo' && discountPercent !== null && (
            <span className="badge-promo">-{discountPercent}%</span>
          )}
          {product.stock <= 0 && (
            <span className="rounded-sm bg-ink-700 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ivory-100">
              Esgotado
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory-100/95 text-dourado-700 opacity-0 shadow-card transition-opacity group-hover:opacity-100 disabled:hidden"
          aria-label="Adicionar ao carrinho"
        >
          <ShoppingBag size={16} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.categories?.name && (
          <span className="text-[11px] uppercase tracking-wide text-esmeralda-700">
            {product.categories.name}
          </span>
        )}
        <h3 className="font-display text-lg font-medium leading-snug text-ink-700">
          {product.name}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-base font-semibold text-ink-700">
            {formatCurrency(product.price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-ink-300 line-through">
              {formatCurrency(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
