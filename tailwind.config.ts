import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aruna: {
          DEFAULT: "#174A3A", // Primary deep forest green
          dark: "#11382C",
          light: "#236550",
          surface: "#F2F7F4",
          50: "#F2F7F4",
          100: "#E1EDE6",
          200: "#C4DBD0",
          300: "#9FBFA8",
          400: "#5D8E6F",
          500: "#174A3A",
          600: "#134032",
          700: "#103429",
          800: "#0D2A21",
          900: "#081B15",
        },
        sage: {
          DEFAULT: "#DCE8DF", // Secondary sage green
          dark: "#BDD1C2",
          light: "#EEF4F0",
          50: "#F8FAF8",
          100: "#EEF4F0",
          200: "#DCE8DF",
          300: "#BDD1C2",
          400: "#9DB9A4",
        },
        gold: {
          DEFAULT: "#C6A15B", // Accent warm gold
          dark: "#A88544",
          light: "#DFBE7F",
          surface: "#FAF5EB",
          50: "#FDFBF7",
          100: "#FAF5EB",
          200: "#F4E7CE",
          300: "#E9D2A3",
          400: "#DFBE7F",
          500: "#C6A15B",
          600: "#A88544",
        },
        charcoal: {
          DEFAULT: "#202824", // Text utama
          50: "#F7F8F5",      // Background canvas
          100: "#EBECE8",
          200: "#D5D8D3",
          300: "#ADB2AA",
          400: "#758078",     // Text sekunder
          500: "#525B55",
          600: "#3B423D",
          700: "#2B312D",
          800: "#202824",
          900: "#151A18",
        },
        // Kept for backward compatibility
        odoo: {
          purple: "#174A3A", // Remapped to primary deep green for instant aesthetic upgrade
          "purple-dark": "#11382C",
          "purple-light": "#236550",
          teal: "#C6A15B",   // Remapped to accent gold
          "teal-dark": "#A88544",
          gray: {
            50: "#F7F8F5",
            100: "#F1F3F5",
            200: "#E9ECEF",
            300: "#DEE2E6",
            400: "#CED4DA",
            500: "#ADB5BD",
            600: "#758078",
            700: "#495057",
            800: "#202824",
            900: "#151A18",
          }
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(23, 74, 58, 0.05), 0 1px 2px -1px rgba(23, 74, 58, 0.03)",
        card: "0 2px 8px -2px rgba(23, 74, 58, 0.08), 0 1px 4px -1px rgba(23, 74, 58, 0.04)",
        dropdown: "0 10px 25px -5px rgba(23, 74, 58, 0.12), 0 8px 10px -6px rgba(23, 74, 58, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
