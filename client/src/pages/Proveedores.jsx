import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import {
  deactivateSupplier,
  getExpenses,
  getSupplierTotals,
  getSuppliers,
  saveSupplier
} from '../lib/api/expenses.js'
import { dateLabel, money } from '../lib/format.js'
import { btnPrimary, btnSmall, card, emptyBox, inputClass, labelClass } from '../lib/ui.js'

export default function Proveedores() {
  const [suppliers, setSuppliers] = useState([])
  const [totals, setTotals] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [editing, setEditing] = useState(null) // null=cerrado, {}=nuevo, {...}=editar
  const [historyOf, setHistoryOf] = useState(null)

  async function loadAll() {
    setLoading(true)
    setErrorMsg('')
    try {
      const [s, t] = await Promise.all([getSuppliers(), getSupplierTotals()])
      setSuppliers(s)
      setTotals(t)
    } catch (err) {
      setErrorMsg('No se pudieron cargar los proveedores: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleDelete(s) {
    if (!confirm(`¿Dar de baja a "${s.name}"? Sus compras anteriores quedan registradas.`)) return
    try {
      await deactivateSupplier(s.id)
      await loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-carbon">Proveedores</h2>
          <p className="mt-1 text-sm text-carbon/60">
            Contactos y total comprado (sale de los gastos cargados con ese proveedor).
          </p>
        </div>
        <button onClick={() => setEditing({})} className={btnPrimary}>
          + Nuevo proveedor
        </button>
      </div>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : suppliers.length === 0 ? (
        <div className={`mt-6 ${emptyBox}`}>Todavía no cargaste proveedores.</div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => {
            const t = totals[s.id]
            return (
              <div key={s.id} className={`${card} p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg">{s.name}</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditing(s)} className={btnSmall}>
                      Editar
                    </button>
                    <button onClick={() => handleDelete(s)} className={`${btnSmall} text-estado-ocupada`}>
                      Baja
                    </button>
                  </div>
                </div>
                {s.products_sold && <p className="mt-1 text-sm text-carbon/60">{s.products_sold}</p>}
                {s.phone && (
                  <p className="mt-2 flex gap-3 text-sm">
                    <a href={`tel:${s.phone}`} className="text-brasa underline">
                      {s.phone}
                    </a>
                    <a
                      href={`https://wa.me/${whatsappNumber(s.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-estado-libre underline"
                    >
                      WhatsApp
                    </a>
                  </p>
                )}
                {s.notes && <p className="mt-2 text-xs text-carbon/50">{s.notes}</p>}
                <div className="mt-3 flex items-end justify-between border-t border-carbon/5 pt-3 text-sm">
                  <div>
                    <p className="text-xs text-carbon/50">Total comprado</p>
                    <p className="font-medium">{money(t?.total ?? 0)}</p>
                    {t?.last && <p className="text-xs text-carbon/50">Última compra: {dateLabel(t.last)}</p>}
                  </div>
                  {t && (
                    <button onClick={() => setHistoryOf(s)} className="text-xs text-brasa underline">
                      Ver compras ({t.count})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <SupplierFormModal
          supplier={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            loadAll()
          }}
        />
      )}

      {historyOf && <SupplierHistoryModal supplier={historyOf} onClose={() => setHistoryOf(null)} />}
    </div>
  )
}

// Argentina: le agregamos el 549 si el número no lo trae.
function whatsappNumber(phone) {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!digits.startsWith('54')) digits = '549' + digits
  return digits
}

function SupplierFormModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    phone: supplier?.phone ?? '',
    products_sold: supplier?.products_sold ?? '',
    notes: supplier?.notes ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setErrorMsg('El nombre es obligatorio')
    setSaving(true)
    try {
      await saveSupplier(supplier?.id, form)
      onSaved()
    } catch (err) {
      setErrorMsg('No se pudo guardar: ' + err.message)
      setSaving(false)
    }
  }

  const field = (key, label, placeholder) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        className={inputClass}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  )

  return (
    <Modal title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {field('name', 'Nombre')}
        {field('phone', 'Teléfono', 'Ej: 11 2345-6789')}
        {field('products_sold', 'Qué vende', 'Ej: carne vacuna, achuras')}
        {field('notes', 'Notas', 'Ej: entrega martes y viernes')}
        {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  )
}

function SupplierHistoryModal({ supplier, onClose }) {
  const [expenses, setExpenses] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getExpenses({ supplierId: supplier.id })
      .then(setExpenses)
      .catch((err) => setErrorMsg(err.message))
  }, [supplier.id])

  return (
    <Modal title={`Compras a ${supplier.name}`} onClose={onClose} size="lg">
      {!expenses ? (
        <p className="text-sm text-carbon/50">{errorMsg || 'Cargando...'}</p>
      ) : (
        <ul className="divide-y divide-carbon/5 text-sm">
          {expenses.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2">
              <span className="text-carbon/60">{dateLabel(e.date)}</span>
              <span className="flex-1">{e.description}</span>
              <span className="font-medium">{money(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
