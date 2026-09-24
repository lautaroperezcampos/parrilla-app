/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta propia del proyecto. Usamos estos nombres en vez de
        // "orange-500" genérico, para que el significado quede claro
        // en todo el código (bg-carbon, text-brasa, etc.)
        carbon: {
          DEFAULT: '#1F1A17',
          light: '#2B2420'
        },
        brasa: {
          DEFAULT: '#D9531E',
          dark: '#B84316'
        },
        crema: '#F5EFE6',
        estado: {
          libre: '#3F7D53',
          ocupada: '#C1432D',
          preparacion: '#D98E04',
          listo: '#2F6FB0',
          pagando: '#7C5CBF'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Work Sans"', 'sans-serif']
      }
    }
  },
  plugins: []
}
