import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

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

// En la compu queda fija a la izquierda. En el celular se abre como
// un panel desde el botón ☰ de la barra superior.
export default function Sidebar({ open, onClose }) {
  const { user, signOut } = useAuth()

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-carbon/50 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-carbon text-crema transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-7">
          <h1 className="font-display text-xl leading-tight text-crema">
            Parrilla
            <br />
            <span className="text-brasa">App</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
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

        <div className="space-y-2 px-6 py-5 text-xs text-crema/50">
          <p className="truncate" title={user?.email}>
            {user?.email}
          </p>
          <button onClick={signOut} className="text-crema/70 underline hover:text-crema">
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
