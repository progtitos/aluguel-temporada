import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Carousel from "@/components/Carousel";
import BookingWidget from "@/components/BookingWidget";

export const revalidate = 0;

export default async function PropertyPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (!property) notFound();

  const { data: blockedRanges } = await supabase
    .from("public_availability")
    .select("check_in, check_out")
    .eq("property_id", property.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link href="/" className="text-sm text-ink/50 hover:text-ink">
        ← Voltar
      </Link>

      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
        {property.name}
      </h1>
      <p className="mt-1 text-ink/60">{property.address_approx}</p>

      <div className="mt-4">
        <Carousel photos={property.photos ?? []} alt={property.name} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Sobre o espaço</h2>
            <p className="mt-2 whitespace-pre-line text-ink/70">{property.description}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Regras da casa</h2>
            <p className="mt-2 whitespace-pre-line text-ink/70">{property.house_rules}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Localização</h2>
            <p className="mt-2 text-ink/70">{property.address_approx}</p>
            {property.latitude && property.longitude && (
              <div className="mt-3 overflow-hidden rounded-xl2 border border-forest-100">
                <iframe
                  title="Mapa aproximado"
                  className="h-64 w-full"
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${property.latitude},${property.longitude}&z=13&output=embed`}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-ink/40">
              Localização aproximada — o endereço exato é enviado após a confirmação do
              pagamento.
            </p>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <BookingWidget property={property} blockedRanges={blockedRanges ?? []} />
          </div>
        </div>
      </div>
    </main>
  );
}
