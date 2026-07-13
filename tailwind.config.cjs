/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        hr: {
          primary: "rgb(var(--hr-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--hr-primary-hover) / <alpha-value>)",
          bg: "rgb(var(--hr-bg) / <alpha-value>)",
          surface: "rgb(var(--hr-surface) / <alpha-value>)",
          text: "rgb(var(--hr-text) / <alpha-value>)",
          muted: "rgb(var(--hr-muted) / <alpha-value>)",
          border: "rgb(var(--hr-border) / <alpha-value>)",
          "header-bg": "rgb(var(--hr-header-bg) / <alpha-value>)",
          "nav-active": "rgb(var(--hr-nav-active) / <alpha-value>)",
          "accent-bg": "rgb(var(--hr-accent-bg) / <alpha-value>)",
          "accent-text": "rgb(var(--hr-accent-text) / <alpha-value>)",
          hover: "rgb(var(--hr-hover) / <alpha-value>)",
          "input-bg": "rgb(var(--hr-input-bg) / <alpha-value>)",
          "table-head": "rgb(var(--hr-table-head) / <alpha-value>)",
          "table-alt": "rgb(var(--hr-table-alt) / <alpha-value>)",
          "table-hover": "rgb(var(--hr-table-hover) / <alpha-value>)",
          "info-bg": "rgb(var(--hr-info-bg) / <alpha-value>)",
          "info-text": "rgb(var(--hr-info-text) / <alpha-value>)",
          highlight: "rgb(var(--hr-highlight) / <alpha-value>)",
        },
        role: {
          test: { bg: "#E8F5E9", text: "#2E7D32" },
          frontend: { bg: "#FFEBEE", text: "#C62828" },
          uiux: { bg: "#E3F2FD", text: "#1565C0" },
          backend: { bg: "#EDE7F6", text: "#5E35B1" },
        },
        brand: {
          navy: "#0a1628",
          "navy-light": "#132a4a",
          accent: "#f97316",
          "accent-hover": "#ea580c",
          surface: "#f8fafc",
        },
      },
      boxShadow: {
        card: "var(--hr-card-shadow)",
        glow: "0 0 40px -8px rgba(249, 115, 22, 0.35)",
      },
    },
  },
  plugins: [],
};
