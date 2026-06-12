/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        background: "var(--color-background)",
        text: "var(--color-text)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        notification: "var(--color-notification)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        surface: "var(--color-surface)",
        "text-secondary": "var(--color-textSecondary)",
        "text-muted": "var(--color-textMuted)",
      },
    },
  },
  plugins: [],
};
