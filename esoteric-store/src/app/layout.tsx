import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Toaster } from 'react-hot-toast';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const body = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: {
    default: 'Universo Encantado — Esotéricos, Energia e Intuição',
    template: '%s | Universo Encantado',
  },
  description:
    'Cristais, tarôs, incensos, velas e amuletos selecionados com cuidado para sua jornada espiritual.',
  icons: {
    icon: '/images/logo-emblem.png',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#0B0B0F',
              color: '#FAF8F4',
              border: '1px solid rgba(184,150,90,0.3)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}
