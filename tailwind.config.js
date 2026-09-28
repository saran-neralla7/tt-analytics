/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bookman Old Style"', '"URW Bookman"', 'Bookman', '"Times New Roman"', 'Times', 'Georgia', 'serif'],
        serif: ['"Bookman Old Style"', '"URW Bookman"', 'Bookman', '"Times New Roman"', 'Times', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        }
      }
    },
  },
  plugins: [],
}
