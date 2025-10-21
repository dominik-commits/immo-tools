/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // === Propora Design Integration ===
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // Fonts (Propora = Inter / System Sans)
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // Schatten / Tiefen
      boxShadow: {
        'soft': '0 6px 18px rgba(0,0,0,.05)',
        'medium': '0 10px 28px rgba(15,44,138,.08)',
        'lift': '0 16px 36px rgba(15,44,138,.12)',
      },

      // Farben (über shadcn-Tokens + Propora-Aliase)
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // === Propora spezifische Aliase ===
        brand: 'hsl(var(--primary))',   // Hauptblau (#0F2C8A)
        surface: 'hsl(var(--surface))', // Hellgrauer Sektionen-Hintergrund (#EAEAEE)
        cta: 'hsl(var(--accent))',      // Gelb (#FFD43B)
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
