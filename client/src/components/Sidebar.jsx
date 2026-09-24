import { NavLink } from 'react-router-dom'

// Cada item define la ruta y la etiqueta que se muestra.
// Agregar una pantalla nueva al sistema es agregar una línea acá
// y su ruta correspondiente en App.jsx.
const items = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/mesas', label: 'Mesas' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/gastos', label: 'Gastos' },
  { to: '/stock', label: 'Stock' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/caja', label: 'Caja' },
  { to: '/reportes', label: 'Reportes' }
]

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col bg-carbon text-crema">
      <div className="px-6 py-7">
        <h1 className="font-display text-xl leading-tight text-crema">
          Parrilla
          <br />
          <span className="text-brasa">App</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brasa text-white'
                  : 'text-crema/70 hover:bg-carbon-light hover:text-crema'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 text-xs text-crema/40">Fase 0 · MVP</div>
    </aside>
  )
}
