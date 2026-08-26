'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const gallery = images.length ? images : [];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-ivory-200">
        {gallery[active] ? (
          <Image
            src={gallery[active]}
            alt={name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">Sem imagem</div>
        )}
      </div>
      {gallery.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {gallery.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border-2',
                active === i ? 'border-dourado-700' : 'border-transparent'
              )}
            >
              <Image src={img} alt={`${name} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
