/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // WCAG AA denetimi (Faz 1): koyu zeminde slate-500 (4.18:1) ve
        // slate-600 (2.63:1) eşiklerin altındaydı. Yalnız metinde kullanıldıkları
        // için tone override'ı ile 55 kullanım tek seferde AA'ya çekildi.
        slate: {
          500: '#74849b', // 5.29:1 on #0a0608 (Faz A zemin)
          600: '#6e7f96', // 4.93:1 on #0a0608
          700: '#6b7c94', // ~4.73:1 — kilitli/înactive etiket + dekoratif ayırıcı
        },
        dark: {
          // Faz A "Aç Kumarhane": soğuk gri-mavi ölçek → sıcak ink-black.
          950: '#0a0608',
          900: '#141016',
          850: '#1b151b',
          800: '#241b22',
          700: '#33262e',
        },
        quantum: {
          blue: '#00f0ff',
          violet: '#a855f7',
          amber: '#f59e0b',
          emerald: '#10b981',
          crimson: '#f43f5e'
        }
      },
      fontFamily: {
        // ADR-0067 (2. dalga — "Aç Kumarhane" UI fontları):
        // mono = Space Mono (retro terminal/CRT telemetri), sans = Space Grotesk
        // (ayla aile, retro-teknik kimlik). İkisi de TR-verified (fonttools cmap).
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        // Display (ADR-0066 "Aç Kumarhane" pivotu): Balatro'nun piksel fontu
        // m6x11plus (Daniel Linssen, atıf zorunlu — public/fonts/ATTRIBUTION.md).
        // TR kapsaması doğrulanmış; ızgara boyutları 18'in katları (style.css @font-face notu).
        display: ['m6x11plus', 'Space Grotesk', 'system-ui', 'sans-serif'],
        // Hand (GIC kolaj katmanı): el yazısı annotasyonlar (K3+ substrat notları).
        hand: ['Caveat', 'Segoe Print', 'cursive'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
