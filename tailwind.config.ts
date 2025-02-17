import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [
    require("daisyui"),
  ],
  daisyui: {
    themes: [
      {
        mytheme: {
          "primary": "#1E3A8A",
          "secondary": "#9333EA",
          "accent": "#2563EB",
          "neutral": "#3D4451",
          "base-100": "var(--background)", // Tetap pakai var agar sesuai dengan global.css
          "base-content": "var(--foreground)", // Tambahan untuk teks utama
        },
      },
    ],
  },
} satisfies Config;