import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración estándar de Vite para un proyecto React.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // host: true permite entrar desde otros dispositivos de la red
    // durante el desarrollo local (por ejemplo, para probar en una tablet).
    host: true
  }
})
