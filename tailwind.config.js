/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./dashboards/**/*.html",
    "./admin/**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        pyo: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a"
        },
        moe: "#f5a623"
      },
      fontFamily: {
        sans: ["Noto Sans Thai", "Tahoma", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

