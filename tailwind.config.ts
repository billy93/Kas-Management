import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
