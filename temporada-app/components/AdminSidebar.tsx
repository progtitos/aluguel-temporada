"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  const linkClass = (active: boolean) =>
    `block truncate rounded-lg px-3 py-2 text-sm transition ${
      active ? "bg-forest-700 text-white" : "text-ink/70 hover:bg-forest-50"
    }`;

  return (
    <aside className="w-full shrink-0 border-b border-forest-100 bg-white p-4 sm:w-56 sm:border-b-0 sm:border-r sm:p-5">
      <p className="mb-4 font-display text-lg font-semibold text-ink">Admin</p>
      <nav className="space-y-1">
        <Link href="/admin" className={linkClass(pathname === "/admin")}>
          Visão geral
        </Link>
        <Link href="/admin/cupons" className={linkClass(pathname === "/admin/cupons")}>
          Cupons
        </Link>
        <p className="px-3 pt-3 text-xs uppercase tracking-wide text-ink/40">Imóveis</p>
        {properties.map((p) => (
          <Link
            key={p.id}
            href={`/admin/imoveis/${p.id}`}
            className={linkClass(pathname === `/admin/imoveis/${p.id}`)}
          >
            {p.name}
          </Link>
        ))}
      </nav>
      <button
        onClick={logout}
        className="mt-6 w-full rounded-lg border border-forest-100 px-3 py-2 text-left text-sm text-ink/60 hover:bg-forest-50"
      >
        Sair
      </button>
    </aside>
  );
}
