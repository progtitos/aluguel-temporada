import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Universo Encantado" — dourado místico sobre fundo claro,
        // com preto profundo e verde-sálvia como acentos de marca (fiéis à logomarca).
        ivory: {
          DEFAULT: '#FAF8F4',
          50: '#FFFFFF',
          100: '#FAF8F4',
          200: '#F2EEE6',
          300: '#E9E2D6',
        },
        ink: {
          DEFAULT: '#1C1A1F',
          700: '#2B282F',
          500: '#57525D',
          300: '#948E9B',
        },
        // Dourado — cor de marca principal (substitui o antigo "mirtilo")
        dourado: {
          DEFAULT: '#B8965A',
          50: '#FBF6EC',
          100: '#F0E2C4',
          300: '#D9B77E',
          500: '#B8965A',
          700: '#8C6F3E',
          900: '#5C4826',
        },
        // Verde-sálvia — acento secundário, presente no "ENCANTADO" da logo
        esmeralda: {
          DEFAULT: '#6E8F72',
          50: '#EEF3EE',
          100: '#DCE7DC',
          300: '#9FB89F',
          500: '#6E8F72',
          700: '#4B6350',
        },
        // Preto profundo — usado no header/footer/hero para casar com o fundo da logo
        noite: {
          DEFAULT: '#0B0B0F',
          500: '#211F28',
          700: '#17151C',
        },
        terracota: {
          DEFAULT: '#C17A56',
          100: '#F3E1D4',
          300: '#DDAB78',
          500: '#C17A56',
          700: '#96593B',
        },
        gold: {
          DEFAULT: '#B8965A',
          300: '#E4D3AE',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '14px',
        xl: '22px',
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(11, 11, 15, 0.25)',
        card: '0 2px 12px -4px rgba(28, 26, 31, 0.08)',
      },
      backgroundImage: {
        'stars-fade': 'radial-gradient(circle at 50% 0%, rgba(184,150,90,0.12), transparent 60%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
