import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./data/**/*.{js,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b8d1ff",
          300: "#8ab2ff",
          400: "#5c8dff",
          500: "#3366ff",
          600: "#2450db",
          700: "#1c3fb0",
          800: "#193689",
          900: "#182f6d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
