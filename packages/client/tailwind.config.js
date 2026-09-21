/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        shiba: {
          50: "#fffbf5",
          100: "#fef5e7",
          200: "#fce6c5",
          300: "#fad198",
          400: "#f6b45f",
          500: "#f19229",
          600: "#dc7318",
          700: "#b75315",
          800: "#924119",
          900: "#773617",
        },
      },
    },
  },
  plugins: [],
};
