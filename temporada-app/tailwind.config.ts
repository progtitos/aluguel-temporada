import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#211F1A",
        parchment: "#FAF7F1",
        forest: {
          50: "#EEF3F0",
          100: "#D3E0D8",
          400: "#3E6B54",
          600: "#25493A",
          700: "#1B3A2C",
          900: "#122A20",
        },
        amber: {
          200: "#F0D9A6",
          400: "#D9A544",
          500: "#C88B3D",
          600: "#A56B25",
        },
      },
      fontFamily: {
        // Avenir é uma fonte licenciada (não distribuível via next/font/google).
        // Em dispositivos Apple ela já vem instalada no sistema, então é usada
        // diretamente quando disponível. Como fallback universal, carregamos
        // "Poppins" via next/font — uma geométrica sans-serif com peso e
        // proporções muito próximas de Avenir — garantindo consistência
        // visual em qualquer dispositivo/SO.
        display: [
          "Avenir Next",
          "Avenir",
          "var(--font-heading)",
          "Poppins",
          "sans-serif",
        ],
        sans: ["var(--font-body)", "Inter", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(18, 42, 32, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
