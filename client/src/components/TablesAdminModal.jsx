import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { createTable, getTables, updateTable } from '../lib/api/orders.js'
import { btnPrimary, btnSmall, inputClass, labelClass } from '../lib/ui.js'

// Agregar mesas, cambiar la zona (Salón, Patio...), o dar de baja y
// volver a activar.
export default function TablesAdminModal({ onClose }) {
  const [tables, setTables] = useState([])
  const [number, setNumber] = useState('')
  const [seats, setSeats] = useState(4)
  const [zone, setZone] = useState('Salón')
  const [errorMsg, setErrorMsg] = useState('')

  async function load() {
    setTables(await getTables({ includeInactive: true }))
  }

  useEffect(() => {
    load().catch((err) => setErrorMsg(err.message))
  }, [])

  async function run(action) {
    setErrorMsg('')
    try {
      await action()
      await load()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  function handleAdd(e) {
    e.preventDefault()
    const n = Number(number)
    if (!Number.isInteger(n) || n <= 0) return setErrorMsg('Ingresá un número de mesa válido')
    run(async () => {
      await createTable({ number: n, seats: Number(seats) || 4, zone: zone.trim() || 'Salón' })
      setNumber('')
    })
  }

  // Al cambiar de zona, la mesa se acomoda sola en la zona nueva.
  function handleZoneChange(table, newZone) {
    const value = newZone.trim() || 'Salón'
    if (value === table.zone) return
    run(() => updateTable(table.id, { zone: value, pos_x: null, pos_y: null }))
  }

  const zones = [...new Set(['Salón', ...tables.map((t) => t.zone).filter(Boolean)])]

  return (
    <Modal title="Administrar mesas" onClose={onClose} size="lg">
      <datalist id="zonas">
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>

      <form onSubmit={handleAdd} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_90px_1fr_auto]">
        <div>
          <label className={labelClass}>Número</label>
          <input type="number" className={inputClass} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Lugares</label>
          <input type="number" className={inputClass} value={seats} onChange={(e) => setSeats(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Zona</label>
          <input list="zonas" className={inputClass} value={zone} onChange={(e) => setZone(e.target.value)} />
        </div>
        <button type="submit" className={btnPrimary}>
          Agregar
        </button>
      </form>

      {errorMsg && <p className="mt-3 text-sm text-estado-ocupada">{errorMsg}</p>}

      <ul className="mt-4 divide-y divide-carbon/5">
        {tables.map((t) => (
          <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
            <span className={`flex-1 ${t.active ? '' : 'text-carbon/40 line-through'}`}>
              Mesa {t.number} · {t.seats} lugares
            </span>
            <input
              list="zonas"
              defaultValue={t.zone}
              key={`${t.id}-${t.zone}`}
              onBlur={(e) => handleZoneChange(t, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-28 rounded border border-carbon/15 px-2 py-1 text-xs"
              aria-label={`Zona de la mesa ${t.number}`}
            />
            <button className={btnSmall} onClick={() => run(() => updateTable(t.id, { active: !t.active }))}>
              {t.active ? 'Dar de baja' : 'Reactivar'}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
