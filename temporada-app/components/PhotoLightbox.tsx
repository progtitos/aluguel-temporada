"use client";

import Image from "next/image";
import { useEffect, useCallback } from "react";

export default function PhotoLightbox({
  photos,
  index,
  alt,
  onClose,
  onNavigate,
}: {
  photos: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const goNext = useCallback(
    () => onNavigate((index + 1) % photos.length),
    [index, photos.length, onNavigate]
  );
  const goPrev = useCallback(
    () => onNavigate((index - 1 + photos.length) % photos.length),
    [index, photos.length, onNavigate]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galeria de fotos: ${alt}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        aria-label="Fechar galeria"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
      >
        ✕
      </button>

      <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
        {index + 1} / {photos.length}
      </div>

      {photos.length > 1 && (
        <button
          aria-label="Foto anterior"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-6"
        >
          ‹
        </button>
      )}

      <div
        className="relative h-[80vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photos[index]}
          alt={`${alt} - foto ${index + 1}`}
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />
      </div>

      {photos.length > 1 && (
        <button
          aria-label="Próxima foto"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-6"
        >
          ›
        </button>
      )}
    </div>
  );
}
