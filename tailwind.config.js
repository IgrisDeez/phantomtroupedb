/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        void: "#030304",
        night: "#080809",
        obsidian: "#100608",
        cellar: "#16070b",
        marrow: "#210b11",
        charcoal: "#18191c",
        steel: "#9ca3af",
        silver: "#d4d4d8",
        bone: "#f4f4f5",
        wine: "#4a0f1b",
        blood: "#7f1d1d",
        garnet: "#b91c1c",
        phantom: "#5f1f2e"
      },
      boxShadow: {
        glow: "0 18px 70px rgba(0, 0, 0, 0.45)",
        knife: "0 0 0 1px rgba(127,29,29,0.18), 0 24px 80px rgba(0,0,0,0.5)",
        veil: "0 0 30px rgba(127,29,29,0.16)"
      }
    }
  },
  plugins: []
};
