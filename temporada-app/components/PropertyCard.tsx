import Image from "next/image";
import Link from "next/link";
import { Home, Users, MapPin, ArrowRight } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { Property } from "@/types/database";

export default function PropertyCard({ property }: { property: Property }) {
  const cover = property.photos?.[0];

  return (
    <Link
      href={`/imovel/${property.slug}`}
      className="group overflow-hidden rounded-2xl border border-forest-100 bg-white transition active:scale-[0.98]"
    >
      <div className="relative h-40 w-full bg-forest-100 sm:h-44">
        {cover ? (
          <Image
            src={cover}
            alt={property.name}
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-forest-400">
            <Home size={28} strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-forest-700 shadow-soft">
          A partir de {formatBRL(Math.min(property.preco_semana, property.preco_fds))}
        </span>
      </div>

      <div className="p-4">
        <h3 className="truncate font-display text-base font-semibold text-ink">{property.name}</h3>
        <p className="mt-0.5 truncate text-sm text-ink/50">{property.short_description}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-3 text-xs text-ink/50">
            <span className="flex items-center gap-1">
              <Users size={13} /> {property.max_guests}
            </span>
            {property.address_approx && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {property.address_approx}
              </span>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-forest-700">
            Ver detalhes
            <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
