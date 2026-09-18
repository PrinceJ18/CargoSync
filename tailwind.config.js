/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./cargosync-freight-flow.jsx"
  ],
  theme: {
    extend: {
      colors: {
        // Base Palette (Locked)
        ink: "#14171F",
        navy: "#1B2333",
        charcoal: "#2A2F3B",
        ivory: "#FAF6EF",
        cream: "#F3EEE3",
        stone: "#EDE7D9",
        coral: {
          DEFAULT: "#E8542E",
          deep: "#C4401E",
        },
        peach: "#F4C9AE",
        slate: {
          DEFAULT: "#8A8D96",
          light: "#E2E4E9"
        },
        emerald: "#1E8F6B",
        amber: "#C98A1B",
        red: "#C23B2E",
        blue: "#2563EB",

        // Semantic Roles
        background: "#FAF6EF", // ivory
        surface: "#FFFFFF", // crisp white cards
        "surface-elevated": "#F3EEE3", // cream
        border: "#EDE7D9", // stone
        "text-primary": "#14171F", // ink
        "text-secondary": "#8A8D96", // slate
        primary: "#1B2333", // navy
        accent: "#E8542E", // coral
        success: "#1E8F6B", // emerald
        warning: "#C98A1B", // amber
        error: "#C23B2E", // red
        info: "#2563EB", // blue for route lines
      },
      fontFamily: {
        sans: ["'Inter'", "'Helvetica Neue'", "Arial", "sans-serif"],
        mono: ["'IBM Plex Mono'", "'SFMono-Regular'", "Menlo", "monospace"],
      },
      borderRadius: {
        'card': '12px', // rounded-xl style
        'control': '6px', // generic control radius
        'pill': '9999px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(20, 23, 31, 0.05)',
        'elevated': '0 8px 30px -4px rgba(20, 23, 31, 0.1)',
      }
    },
  },
  plugins: [],
}
