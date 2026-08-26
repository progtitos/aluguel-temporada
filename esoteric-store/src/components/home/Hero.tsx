import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-noite bg-stars-fade">
      <div className="container-store relative flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <Image
          src="/images/logo-emblem.png"
          alt="Universo Encantado"
          width={96}
          height={96}
          className="h-24 w-24 rounded-full"
          priority
        />
        <span className="eyebrow flex items-center gap-2 text-dourado-300">
          <Sparkles size={14} /> Esotéricos · Energia · Intuição
        </span>
        <h1 className="max-w-2xl font-display text-4xl font-medium leading-tight text-ivory-100 sm:text-6xl">
          Ferramentas para sua jornada interior
        </h1>
        <p className="max-w-xl text-balance text-base text-ivory-200/80 sm:text-lg">
          Cristais, tarôs, incensos e velas selecionados para acompanhar seus rituais,
          intenções e momentos de autoconhecimento.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Link href="/produtos" className="btn-primary">
            Explorar Produtos
          </Link>
          <Link
            href="/categorias/cristais"
            className="btn-secondary border-ivory-100/30 text-ivory-100 hover:border-dourado-300 hover:text-dourado-300"
          >
            Ver Cristais
          </Link>
        </div>
      </div>
    </section>
  );
}
