import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { createTable, getTables, updateTable } from '../lib/api/orders.js'
import { btnPrimary, btnSmall, inputClass, labelClass } from '../lib/ui.js'

// Agregar mesas, cambiar los lugares o dar de baja (y volver a activar).
export default function TablesAdminModal({ onClose }) {
  const [tables, setTables] = useState([])
  const [number, setNumber] = useState('')
  const [seats, setSeats] = useState(4)
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
      await createTable({ number: n, seats: Number(seats) || 4 })
      setNumber('')
    })
  }

  return (
    <Modal title="Administrar mesas" onClose={onClose}>
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1">
          <label className={labelClass}>Número</label>
          <input
            type="number"
            className={inputClass}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
        <div className="w-24">
          <label className={labelClass}>Lugares</label>
          <input
            type="number"
            className={inputClass}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </div>
        <button type="submit" className={btnPrimary}>
          Agregar
        </button>
      </form>

      {errorMsg && <p className="mt-3 text-sm text-estado-ocupada">{errorMsg}</p>}

      <ul className="mt-4 divide-y divide-carbon/5">
        {tables.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-2 text-sm">
            <span className={t.active ? '' : 'text-carbon/40 line-through'}>
              Mesa {t.number} · {t.seats} lugares
            </span>
            <button
              className={btnSmall}
              onClick={() => run(() => updateTable(t.id, { active: !t.active }))}
            >
              {t.active ? 'Dar de baja' : 'Reactivar'}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
