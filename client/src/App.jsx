import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Mesas from './pages/Mesas.jsx'
import Ventas from './pages/Ventas.jsx'
import Gastos from './pages/Gastos.jsx'
import Stock from './pages/Stock.jsx'
import Proveedores from './pages/Proveedores.jsx'
import Caja from './pages/Caja.jsx'
import Reportes from './pages/Reportes.jsx'
import Login from './pages/Login.jsx'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { supabaseConfigured } from './lib/supabaseClient.js'

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm">
        Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisá el archivo .env
        (o las variables de entorno en Vercel).
      </div>
    )
  }
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

// Sin sesión iniciada solo se ve la pantalla de login.
function AuthGate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8 text-sm text-carbon/50">Cargando...</div>
  if (!session) return <Login />
  return <Layout />
}

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="md:flex">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-carbon px-4 py-3 text-crema md:hidden">
          <button onClick={() => setMenuOpen(true)} className="text-xl" aria-label="Abrir menú">
            ☰
          </button>
          <span className="font-display">
            Parrilla <span className="text-brasa">App</span>
          </span>
        </header>

        <main className="min-h-screen p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/reportes" element={<Reportes />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
