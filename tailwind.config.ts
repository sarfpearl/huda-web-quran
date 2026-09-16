import type { Config } from "tailwindcss";

/**
 * Huda Bayan design tokens.
 * Calm, spiritual, elegant, minimal, premium. Deep Islamic green primary,
 * warm gold accent (used sparingly), off-white / warm-neutral surfaces,
 * deep charcoal (not pure black) for dark mode.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Islamic green scale
        primary: {
          50: "#eef6f1",
          100: "#d6ebe0",
          200: "#aed7c1",
          300: "#7dbd9d",
          400: "#4e9d78",
          500: "#2f8060",
          600: "#1f664c",
          700: "#1a5140", // core brand green
          800: "#153f32",
          900: "#0f2e25",
          950: "#081b16",
        },
        // Warm gold accent — use sparingly
        gold: {
          300: "#e8d19a",
          400: "#d9b871",
          500: "#c69749",
          600: "#a97c33",
        },
        // Warm neutral surfaces
        sand: {
          50: "#fbf9f4",
          100: "#f5f1e8",
          200: "#e9e2d3",
          300: "#d8cdb8",
        },
        // Dark charcoal (near-black, not pure black)
        charcoal: {
          800: "#1c1f1e",
          900: "#141716",
          950: "#0e100f",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-poppins)",
          "Poppins",
          "var(--font-sans)",
          "var(--font-tamil)",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-poppins)",
          "Poppins",
          "sans-serif",
        ],
        poppins: ["var(--font-poppins)", "Poppins", "sans-serif"],
        tamil: ["var(--font-tamil)", "Noto Serif Tamil", "serif"],
        arabic: ["var(--font-arabic)", "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 2px 12px -2px rgba(20, 40, 30, 0.10), 0 4px 24px -8px rgba(20, 40, 30, 0.08)",
        "soft-lg": "0 8px 32px -8px rgba(20, 40, 30, 0.18)",
        player: "0 -4px 24px -6px rgba(0, 0, 0, 0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "equalizer": {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
