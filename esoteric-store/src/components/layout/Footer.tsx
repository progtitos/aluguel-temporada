import Link from 'next/link';
import Image from 'next/image';
import { Instagram, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-dourado-900/30 bg-noite">
      <div className="container-store grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/images/logo-emblem.png"
              alt="Universo Encantado"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full"
            />
            <span className="font-display text-lg font-semibold leading-none text-dourado-300">
              Universo
              <span className="block text-[10px] font-medium tracking-[0.25em] text-esmeralda-300">
                ENCANTADO
              </span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ivory-200/60">
            Esotéricos, energia e intuição: objetos e ferramentas escolhidos com cuidado para
            acompanhar sua jornada espiritual.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-ivory-100">Categorias</h4>
          <ul className="space-y-2 text-sm text-ivory-200/60">
            <li><Link href="/categorias/cristais" className="hover:text-dourado-300">Cristais</Link></li>
            <li><Link href="/categorias/incensos" className="hover:text-dourado-300">Incensos</Link></li>
            <li><Link href="/categorias/velas" className="hover:text-dourado-300">Velas</Link></li>
            <li><Link href="/categorias/acessorios" className="hover:text-dourado-300">Acessórios</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-ivory-100">Ajuda</h4>
          <ul className="space-y-2 text-sm text-ivory-200/60">
            <li><Link href="/produtos" className="hover:text-dourado-300">Todos os produtos</Link></li>
            <li><Link href="/checkout" className="hover:text-dourado-300">Meu carrinho</Link></li>
            <li><Link href="/acompanhar-pedido" className="hover:text-dourado-300">Acompanhar pedido</Link></li>
            <li><a href="mailto:contato@universoencantado.com.br" className="hover:text-dourado-300">Fale conosco</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-ivory-100">Siga o Universo Encantado</h4>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="rounded-full border border-dourado-300/30 p-2 text-ivory-200/70 hover:border-dourado-300 hover:text-dourado-300">
              <Instagram size={18} />
            </a>
            <a href="#" aria-label="WhatsApp" className="rounded-full border border-dourado-300/30 p-2 text-ivory-200/70 hover:border-dourado-300 hover:text-dourado-300">
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-dourado-900/30 py-5">
        <p className="container-store text-center text-xs text-ivory-200/40">
          © {new Date().getFullYear()} Universo Encantado. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
