import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { createTable, deleteTable, getTables, updateTable } from '../lib/api/orders.js'
import { btnPrimary, btnSmall, inputClass, labelClass } from '../lib/ui.js'

// Agregar, editar (número, lugares, zona) y borrar mesas. Los cambios de
// cada mesa se guardan solos al salir del campo.
export default function TablesAdminModal({ onClose }) {
  const [tables, setTables] = useState([])
  const [number, setNumber] = useState('')
  const [seats, setSeats] = useState(4)
  const [zone, setZone] = useState('Salón')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [version, setVersion] = useState(0)

  async function load() {
    setTables(await getTables({ includeInactive: true }))
    setVersion((v) => v + 1)
  }

  useEffect(() => {
    load().catch((err) => setErrorMsg(err.message))
  }, [])

  async function run(action, okMsg) {
    setErrorMsg('')
    setSavedMsg('')
    try {
      await action()
      await load()
      if (okMsg) setSavedMsg(okMsg)
    } catch (err) {
      setErrorMsg(err.message)
      await load().catch(() => {})
    }
  }

  function handleAdd(e) {
    e.preventDefault()
    const n = Number(number)
    if (!Number.isInteger(n) || n <= 0) return setErrorMsg('Ingresá un número de mesa válido')
    run(async () => {
      await createTable({ number: n, seats: Number(seats) || 4, zone: zone.trim() || 'Salón' })
      setNumber('')
    }, `Mesa ${n} agregada`)
  }

  function handleField(table, field, raw) {
    let value = typeof raw === 'string' ? raw.trim() : raw
    if (field === 'number' || field === 'seats') {
      value = Number(value)
      if (!Number.isInteger(value) || value <= 0) {
        setErrorMsg(field === 'number' ? 'El número de mesa tiene que ser mayor a 0' : 'Los lugares tienen que ser mayor a 0')
        return load()
      }
    }
    if (field === 'zone' && !value) value = 'Salón'
    if (value === table[field]) return

    // Al cambiar de zona, la mesa se acomoda sola en la zona nueva.
    const changes = field === 'zone' ? { zone: value, pos_x: null, pos_y: null } : { [field]: value }
    run(() => updateTable(table.id, changes), `Mesa ${field === 'number' ? value : table.number} guardada`)
  }

  function handleDelete(table) {
    if (!confirm(`¿Borrar la mesa ${table.number}? Las ventas que ya se hicieron en esa mesa quedan en el historial.`)) return
    run(() => deleteTable(table.id), `Mesa ${table.number} borrada`)
  }

  const zones = [...new Set(['Salón', ...tables.map((t) => t.zone).filter(Boolean)])]
  const cell = 'rounded border border-carbon/15 px-2 py-1.5 text-sm focus:border-brasa focus:outline-none'
  const commitOnEnter = (e) => e.key === 'Enter' && e.currentTarget.blur()

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
      {savedMsg && !errorMsg && <p className="mt-3 text-sm text-estado-libre">{savedMsg}</p>}

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-carbon/50">
            <th className="pb-2 font-normal">Número</th>
            <th className="pb-2 font-normal">Lugares</th>
            <th className="pb-2 font-normal">Zona</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {tables.map((t) => (
            // La key cambia en cada recarga para que los campos muestren lo
            // guardado (y vuelvan atrás si un cambio no se pudo guardar).
            <tr key={`${t.id}-${version}`} className={`border-t border-carbon/5 ${t.active ? '' : 'opacity-50'}`}>
              <td className="py-1.5 pr-2">
                <input
                  type="number"
                  defaultValue={t.number}
                  onBlur={(e) => handleField(t, 'number', e.target.value)}
                  onKeyDown={commitOnEnter}
                  className={`${cell} w-20`}
                  aria-label="Número de mesa"
                />
              </td>
              <td className="py-1.5 pr-2">
                <input
                  type="number"
                  defaultValue={t.seats}
                  onBlur={(e) => handleField(t, 'seats', e.target.value)}
                  onKeyDown={commitOnEnter}
                  className={`${cell} w-20`}
                  aria-label={`Lugares de la mesa ${t.number}`}
                />
              </td>
              <td className="py-1.5 pr-2">
                <input
                  list="zonas"
                  defaultValue={t.zone}
                  onBlur={(e) => handleField(t, 'zone', e.target.value)}
                  onKeyDown={commitOnEnter}
                  className={`${cell} w-full min-w-24`}
                  aria-label={`Zona de la mesa ${t.number}`}
                />
              </td>
              <td className="py-1.5">
                <div className="flex justify-end gap-1.5">
                  {!t.active && (
                    <button className={btnSmall} onClick={() => run(() => updateTable(t.id, { active: true }), `Mesa ${t.number} reactivada`)}>
                      Reactivar
                    </button>
                  )}
                  <button className={`${btnSmall} text-estado-ocupada`} onClick={() => handleDelete(t)}>
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-carbon/50">
        Los cambios se guardan solos al salir de cada casillero (o con Enter).
      </p>
    </Modal>
  )
}
