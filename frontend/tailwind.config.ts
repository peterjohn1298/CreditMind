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
        "navy-900": "#080808",
        "navy-800": "#111111",
        "navy-700": "#1C1C1C",
        "navy-600": "#2A2A2A",
        "navy-500": "#333333",
        accent:    "#C9A84C",
        success:   "#00D4A4",
        danger:    "#FF3B5C",
        warning:   "#FFB300",
        muted:     "#888888",
        primary:   "#F0EEE8",
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
