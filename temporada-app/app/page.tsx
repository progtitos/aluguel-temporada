import { ShieldCheck, Zap, Home as HomeIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PropertyCard from "@/components/PropertyCard";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10 sm:max-w-lg">
      <header className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-forest-700">
          <HomeIcon size={24} className="text-amber-200" strokeWidth={2} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink">Nossas Acomodações</h1>
        <p className="mt-1 text-sm text-ink/60">
          Escolha um imóvel para ver fotos, datas disponíveis e reservar.
        </p>
      </header>

      <div className="mb-6 flex justify-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-ink/50">
          <ShieldCheck size={14} className="text-forest-500" /> Pagamento seguro
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink/50">
          <Zap size={14} className="text-forest-500" /> Confirmação automática
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {properties?.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}

        {(!properties || properties.length === 0) && (
          <p className="text-center text-sm text-ink/50">
            Nenhuma acomodação disponível no momento.
          </p>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-ink/40">
        Reservas seguras via Pix ou cartão · Mercado Pago
      </footer>
    </main>
  );
}
