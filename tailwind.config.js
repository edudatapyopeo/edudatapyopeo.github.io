/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./dashboards/**/*.html",
    "./sdg4/**/*.html",
    "./admin/**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        pyo: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a"
        },
        moe: "#f5a623"
      },
      fontFamily: {
        sans: ["Noto Sans Thai", "Tahoma", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

