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

// El login (Fase 6) va a envolver esto con una verificación de sesión.
// Por ahora, todas las rutas quedan abiertas para poder probar la app.
export default function App() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-y-auto p-8">
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
  )
}
