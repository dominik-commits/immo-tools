/** @type {import('tailwindcss').Config} */
module.exports = {
  // Nur Templates scannen (kein .ts), dadurch verschwindet die Warnung
  content: [
    "./index.html",
    "./src/**/*.{tsx,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tailwind-Utilities wie bg-card/90, text-foreground, border-border …
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",

        // Brandfarben
        brand: "#1b2c47",
        cta: "#ffde59",
        "accent-2": "hsl(var(--accent-2))",
      },
      boxShadow: {
        soft:
          "0 1px 2px hsl(var(--shadow) / 0.12), 0 1px 1px hsl(var(--shadow) / 0.06)",
        medium:
          "0 6px 24px hsl(var(--shadow) / 0.12), 0 2px 4px hsl(var(--shadow) / 0.08)",
      },
      borderRadius: {
        DEFAULT: "12px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};
