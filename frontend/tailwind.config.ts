import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "navy-900": "#0A1628",
        "navy-800": "#0F2040",
        "navy-700": "#162B52",
        "navy-600": "#1E3A6E",
        accent:    "#1B7FE5",
        success:   "#00D4A4",
        danger:    "#FF3B5C",
        warning:   "#FFB300",
        muted:     "#6B7FA3",
        primary:   "#E8EDF5",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
