import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

// Fallback de "Avenir" para dispositivos sem a fonte instalada no sistema.
// Ver tailwind.config.ts (fontFamily.display) para a pilha completa.
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Fonte sans-serif limpa para todo o corpo de texto.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nossas Acomodações | Reserve sua estadia",
  description:
    "Reserve diretamente 3 acomodações para temporada, com pagamento via Pix ou cartão.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
