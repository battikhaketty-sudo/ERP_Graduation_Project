/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        hr: {
          primary: "#2F80ED",
          "primary-hover": "#2569C7",
          bg: "#F4F6F9",
          text: "#333333",
          muted: "#828282",
          border: "#E8ECF1",
          "header-bg": "#F8FAFC",
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
        card: "0 2px 12px rgba(0, 0, 0, 0.06)",
        glow: "0 0 40px -8px rgba(249, 115, 22, 0.35)",
      },
    },
  },
  plugins: [],
};
