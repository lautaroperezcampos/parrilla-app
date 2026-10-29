import { useState } from 'react'
import Modal from './Modal.jsx'
import { PAYMENT_METHODS, todayISO } from '../lib/format.js'
import { btnPrimary, inputClass, labelClass } from '../lib/ui.js'

// Si "expense" viene con datos, es edición. Si viene vacío, es un gasto nuevo.
export default function ExpenseFormModal({ expense, categories, suppliers, products, cashOpen, onSave, onClose }) {
  const editing = Boolean(expense?.id)
  const [form, setForm] = useState({
    date: expense?.date ?? todayISO(),
    description: expense?.description ?? '',
    amount: expense?.amount ?? '',
    category_id: expense?.category_id ?? '',
    supplier_id: expense?.supplier_id ?? '',
    payment_method: expense?.payment_method ?? 'efectivo',
    paid_from_cash: expense?.paid_from_cash ?? cashOpen,
    notes: expense?.notes ?? '',
    product_id: '',
    quantity: ''
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.description.trim()) return setErrorMsg('La descripción es obligatoria')
    if (!(amount > 0)) return setErrorMsg('Ingresá un monto válido')
    if (form.product_id && !(Number(form.quantity) > 0)) {
      return setErrorMsg('Ingresá la cantidad que entra al stock')
    }
    setSaving(true)
    setErrorMsg('')
    try {
      await onSave({
        ...form,
        amount,
        category_id: form.category_id ? Number(form.category_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        product_id: form.product_id ? Number(form.product_id) : null,
        quantity: Number(form.quantity)
      })
    } catch (err) {
      setErrorMsg('No se pudo guardar: ' + err.message)
      setSaving(false)
    }
  }

  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id))

  return (
    <Modal title={editing ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Monto</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className={inputClass}
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <input
            className={inputClass}
            placeholder="Ej: 20 kg de vacío"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Categoría</label>
            <select
              className={inputClass}
              value={form.category_id}
              onChange={(e) => update('category_id', e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Proveedor</label>
            <select
              className={inputClass}
              value={form.supplier_id}
              onChange={(e) => update('supplier_id', e.target.value)}
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md bg-crema/60 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.paid_from_cash}
              disabled={editing || (!cashOpen && !form.paid_from_cash)}
              onChange={(e) => update('paid_from_cash', e.target.checked)}
            />
            Se pagó con plata de la caja
          </label>
          {!editing && !cashOpen && (
            <p className="mt-1 text-xs text-carbon/50">La caja está cerrada, no se puede descontar de ahí.</p>
          )}
          {!form.paid_from_cash && (
            <div className="mt-2">
              <label className={labelClass}>Medio de pago</label>
              <select
                className={inputClass}
                value={form.payment_method}
                onChange={(e) => update('payment_method', e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!editing && (
          <div className="rounded-md bg-crema/60 p-3">
            <label className={labelClass}>¿Es mercadería que entra al stock? (opcional)</label>
            <div className="mt-1 grid grid-cols-[1fr_110px] gap-2">
              <select
                className={inputClass}
                value={form.product_id}
                onChange={(e) => update('product_id', e.target.value)}
              >
                <option value="">No</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder={selectedProduct ? selectedProduct.unit : 'Cantidad'}
                disabled={!form.product_id}
                className={inputClass}
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Notas</label>
          <input className={inputClass} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>

        {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}

        <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  )
}
