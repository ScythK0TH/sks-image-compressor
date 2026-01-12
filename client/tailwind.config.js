/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          850: "#0f172a",
        },
      },
      boxShadow: {
        card: "0 20px 60px -25px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};

