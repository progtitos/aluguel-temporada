"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Ticket, Building2, LogOut, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminProperties } from "@/components/AdminPropertiesProvider";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { properties } = useAdminProperties();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const itemClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
      active ? "bg-white/10 font-medium text-white" : "text-forest-100/70 hover:bg-white/5 hover:text-forest-100"
    }`;

  return (
    <aside className="flex w-full shrink-0 flex-col bg-forest-900 p-3 sm:sticky sm:top-0 sm:h-screen sm:w-52">
      <div className="flex items-center gap-2 px-2 pb-4 pt-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
          <Home size={15} className="text-amber-900" strokeWidth={2.2} />
        </div>
        <span className="text-sm font-medium text-white">Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <Link href="/admin" className={itemClass(pathname === "/admin")}>
          <LayoutDashboard size={16} strokeWidth={2} />
          Visão geral
        </Link>
        <Link href="/admin/calendario" className={itemClass(pathname === "/admin/calendario")}>
          <CalendarDays size={16} strokeWidth={2} />
          Calendário
        </Link>
        <Link href="/admin/cupons" className={itemClass(pathname === "/admin/cupons")}>
          <Ticket size={16} strokeWidth={2} />
          Cupons
        </Link>

        <p className="px-2.5 pb-1 pt-4 text-[10px] font-medium uppercase tracking-wide text-forest-100/40">
          Imóveis
        </p>
        {properties.map((p) => (
          <Link
            key={p.id}
            href={`/admin/imoveis/${p.id}`}
            className={itemClass(pathname === `/admin/imoveis/${p.id}`)}
          >
            <Building2 size={16} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mt-3 flex items-center gap-2.5 rounded-lg border-t border-white/10 px-2.5 pt-4 text-sm text-forest-100/60 transition hover:text-forest-100"
      >
        <LogOut size={16} strokeWidth={2} />
        Sair
      </button>
    </aside>
  );
}
