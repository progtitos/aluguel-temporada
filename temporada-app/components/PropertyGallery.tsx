"use client";

import Image from "next/image";
import { useState } from "react";
import { Home } from "lucide-react";
import PhotoLightbox from "@/components/PhotoLightbox";
import Carousel from "@/components/Carousel";

export default function PropertyGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-forest-100 text-forest-400 sm:h-96">
        <Home size={28} strokeWidth={1.5} />
      </div>
    );
  }

  const rest = photos.slice(1, 5);
  const extraCount = photos.length - 5;

  return (
    <>
      {/* Mobile: carrossel deslizável (já com lightbox embutido) */}
      <div className="sm:hidden">
        <Carousel photos={photos} alt={alt} />
      </div>

      {/* Desktop: mosaico 1 grande + até 4 pequenas */}
      <div className="hidden h-80 gap-1.5 overflow-hidden rounded-2xl sm:grid sm:grid-cols-[1.4fr_1fr_1fr]">
        <button
          type="button"
          aria-label="Ampliar foto 1"
          onClick={() => setLightboxIndex(0)}
          className="relative row-span-2 cursor-zoom-in bg-forest-100"
        >
          <Image src={photos[0]} alt={`${alt} - foto 1`} fill sizes="45vw" priority className="object-cover" />
        </button>

        {rest.map((src, i) => {
          const isLastVisible = i === rest.length - 1 && extraCount > 0;
          return (
            <button
              key={src + i}
              type="button"
              aria-label={`Ampliar foto ${i + 2}`}
              onClick={() => setLightboxIndex(i + 1)}
              className="relative cursor-zoom-in bg-forest-100"
            >
              <Image src={src} alt={`${alt} - foto ${i + 2}`} fill sizes="20vw" className="object-cover" />
              {isLastVisible && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                  +{extraCount} fotos
                </span>
              )}
            </button>
          );
        })}

        {/* Preenche células vazias quando há menos de 5 fotos, mantendo o grid */}
        {Array.from({ length: Math.max(0, 4 - rest.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-forest-50" />
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          alt={alt}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
