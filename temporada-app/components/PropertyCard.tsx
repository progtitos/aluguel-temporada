import Image from "next/image";
import Link from "next/link";
import { formatBRL } from "@/lib/utils";
import type { Property } from "@/types/database";

export default function PropertyCard({ property }: { property: Property }) {
  const cover = property.photos?.[0];

  return (
    <Link
      href={`/imovel/${property.slug}`}
      className="group flex items-center gap-4 rounded-xl2 bg-white p-3 shadow-soft ring-1 ring-forest-100 transition active:scale-[0.98] sm:p-4"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-forest-100 sm:h-24 sm:w-24">
        {cover ? (
          <Image
            src={cover}
            alt={property.name}
            fill
            sizes="96px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-forest-400">
            🏠
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-semibold text-ink">
          {property.name}
        </h3>
        <p className="truncate text-sm text-ink/60">{property.short_description}</p>
        <p className="mt-1 text-sm font-medium text-forest-700">
          {formatBRL(property.price_per_night)}{" "}
          <span className="font-normal text-ink/50">/ diária</span>
        </p>
      </div>

      <span className="shrink-0 text-forest-600 transition group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}
