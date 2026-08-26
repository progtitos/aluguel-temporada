'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { href: '/admin/cupons', label: 'Cupons', icon: Tag },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
];

export function Sidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Navegação "dura" (não client-side) para garantir que o middleware
    // reavalie a sessão já sem cookies, evitando ficar preso no dashboard.
    window.location.href = '/admin/login';
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-ink/10 bg-ivory-100">
      <div className="flex items-center gap-2.5 border-b border-ink/10 px-6 py-5">
        <Image
          src="/images/logo-emblem.png"
          alt="Universo Encantado"
          width={32}
          height={32}
          className="h-8 w-8 rounded-full"
        />
        <span className="font-display text-lg font-semibold leading-none text-ink-700">
          Universo Encantado
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-dourado-50 hover:text-dourado-700',
                isActive && 'bg-dourado-50 text-dourado-700'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-terracota-100 hover:text-terracota-700"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
