/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        milling: ["Milling", "sans-serif"],
      },
      colors: {
        primary: "#9AED59",
        secondary: "#444444",
        accent: "#0070f3",
        "white-200": "#f9f9f9",
        "zinc-100": "#f4f3f3",
        "gray-200": "#ECECEC",
        "gray-300": "#D9D9D9",
        "gray-500": "#bdbcbb",
        blue: "#C4EEFE",
        "light-purple": "#FBDFFF",
        "light-pink": "#FFDFEB",
        red: "#e22e22",
        generate: "#FDE3AE",
        green: "#5FD269",
        "confidence-high": "#30710e",
        "confidence-medium": "#846617",
      },
      animation: {
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
