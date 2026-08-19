"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import PhotoLightbox from "@/components/PhotoLightbox";

export default function Carousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-forest-100 text-forest-400 sm:h-96">
        Sem fotos ainda
      </div>
    );
  }

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    setIndex(clamped);
    trackRef.current?.children[clamped]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
    });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar flex h-64 w-full snap-x snap-mandatory overflow-x-auto rounded-2xl sm:h-96"
        onScroll={(e) => {
          const w = e.currentTarget.clientWidth;
          const i = Math.round(e.currentTarget.scrollLeft / w);
          setIndex(i);
        }}
      >
        {photos.map((src, i) => (
          <button
            key={src + i}
            type="button"
            aria-label={`Ampliar foto ${i + 1} de ${photos.length}`}
            className="relative h-full w-full shrink-0 snap-start cursor-zoom-in"
            onClick={() => {
              setIndex(i);
              setLightboxOpen(true);
            }}
          >
            <Image
              src={src}
              alt={`${alt} - foto ${i + 1}`}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            aria-label="Foto anterior"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-soft"
          >
            ‹
          </button>
          <button
            aria-label="Próxima foto"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-soft"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  i === index ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {lightboxOpen && (
        <PhotoLightbox
          photos={photos}
          index={index}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(next) => {
            setIndex(next);
            goTo(next);
          }}
        />
      )}
    </div>
  );
}
