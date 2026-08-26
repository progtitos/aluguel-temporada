'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { name: 'Cristais', slug: 'cristais' },
  { name: 'Incensos', slug: 'incensos' },
  { name: 'Velas', slug: 'velas' },
  { name: 'Acessórios', slug: 'acessorios' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount());
  const toggleCart = useCartStore((s) => s.toggleCart);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/produtos?busca=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setQuery('');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-dourado-900/20 bg-noite/95 backdrop-blur">
      <div className="container-store flex h-[72px] items-center justify-between gap-4">
        <button
          className="p-2 text-ivory-100 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/logo-emblem.png"
            alt="Universo Encantado"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
            priority
          />
          <span className="hidden font-display text-xl font-semibold leading-none tracking-wide text-dourado-300 sm:block">
            Universo
            <span className="block text-[11px] font-medium tracking-[0.25em] text-esmeralda-300">
              ENCANTADO
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categorias/${cat.slug}`}
              className="text-sm text-ivory-200/80 transition-colors hover:text-dourado-300"
            >
              {cat.name}
            </Link>
          ))}
          <Link
            href="/acompanhar-pedido"
            className="text-sm text-ivory-200/80 transition-colors hover:text-dourado-300"
          >
            Acompanhar pedido
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <button
            className="p-2 text-ivory-100 hover:text-dourado-300"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Buscar produtos"
          >
            <Search size={20} />
          </button>
          <button
            className="relative p-2 text-ivory-100 hover:text-dourado-300"
            onClick={toggleCart}
            aria-label="Abrir carrinho"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-esmeralda-500 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-dourado-900/20 bg-noite-700 px-5 py-3">
          <form onSubmit={handleSearch} className="container-store flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cristais, tarôs, incensos..."
              className="input-store"
            />
            <button type="submit" className="btn-primary">
              Buscar
            </button>
          </form>
        </div>
      )}

      <nav
        className={cn(
          'grid gap-1 overflow-hidden border-t border-dourado-900/20 bg-noite-700 px-5 transition-all md:hidden',
          menuOpen ? 'max-h-96 py-3' : 'max-h-0 py-0'
        )}
      >
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categorias/${cat.slug}`}
            onClick={() => setMenuOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-ivory-200/80 hover:bg-dourado-900/30 hover:text-dourado-300"
          >
            {cat.name}
          </Link>
        ))}
        <Link
          href="/acompanhar-pedido"
          onClick={() => setMenuOpen(false)}
          className="rounded-md px-3 py-2 text-sm text-ivory-200/80 hover:bg-dourado-900/30 hover:text-dourado-300"
        >
          Acompanhar pedido
        </Link>
      </nav>
    </header>
  );
}
