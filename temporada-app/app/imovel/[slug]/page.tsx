import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PropertyGallery from "@/components/PropertyGallery";
import BookingWidget from "@/components/BookingWidget";
import PropertyMap from "@/components/PropertyMap";
import { AMENITY_OPTIONS } from "@/lib/amenities";

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

  const [{ data: blockedRanges }, { data: pricingRules }] = await Promise.all([
    supabase
      .from("public_availability")
      .select("check_in, check_out")
      .eq("property_id", property.id),
    supabase.from("pricing_rules").select("*").eq("property_id", property.id),
  ]);

  const selectedAmenities = AMENITY_OPTIONS.filter((a) => property.amenities?.includes(a.key));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{property.name}</h1>
      <div className="mt-1 flex items-center gap-4 text-sm text-ink/60">
        {property.address_approx && (
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {property.address_approx}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={14} /> até {property.max_guests} hóspedes
        </span>
      </div>

      <div className="mt-4">
        <PropertyGallery photos={property.photos ?? []} alt={property.name} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Sobre o espaço</h2>
            <p className="mt-2 whitespace-pre-line text-ink/70">{property.description}</p>
          </section>

          {selectedAmenities.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-ink">Comodidades</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selectedAmenities.map((a) => {
                  const Icon = a.icon;
                  return (
                    <span key={a.key} className="flex items-center gap-2 text-sm text-ink/70">
                      <Icon size={17} className="text-forest-500" strokeWidth={2} />
                      {a.label}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Check-in e check-out</h2>
            <div className="mt-3 flex gap-8">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/40">Check-in a partir de</p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-medium text-ink">
                  <Clock size={16} className="text-forest-500" /> {property.checkin_time}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/40">Check-out até</p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-medium text-ink">
                  <Clock size={16} className="text-forest-500" /> {property.checkout_time}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Regras da casa</h2>
            <p className="mt-2 whitespace-pre-line text-ink/70">{property.house_rules}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-ink">Localização</h2>
            <p className="mt-2 text-ink/70">{property.address_full ?? property.address_approx}</p>
            <PropertyMap
              latitude={property.latitude}
              longitude={property.longitude}
              addressFull={property.address_full}
              addressApprox={property.address_approx}
            />
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <BookingWidget
              property={property}
              pricingRules={pricingRules ?? []}
              blockedRanges={blockedRanges ?? []}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
