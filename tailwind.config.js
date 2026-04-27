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
        void: "#05050a",
        night: "#090d18",
        obsidian: "#10111d",
        phantom: "#8b5cf6",
        veil: "#4c1d95",
        relic: "#d8b45a",
        ember: "#ffce73"
      },
      boxShadow: {
        glow: "0 0 36px rgba(139, 92, 246, 0.22)",
        gold: "0 0 30px rgba(216, 180, 90, 0.15)"
      }
    }
  },
  plugins: []
};
