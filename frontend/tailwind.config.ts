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
        "navy-900": "#111318",
        "navy-800": "#1A1D24",
        "navy-700": "#22262F",
        "navy-600": "#2C3340",
        "navy-500": "#3A3F4D",
        accent:    "#5B6BFF",
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
