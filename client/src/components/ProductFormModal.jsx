import { useState } from 'react'
import Modal from './Modal.jsx'

const UNIDADES = ['unidad', 'kg', 'litro', 'porción']

// Si "product" viene con datos, es edición. Si viene vacío, es creación.
export default function ProductFormModal({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    category_id: product?.category_id ?? '',
    unit: product?.unit ?? 'unidad',
    stock: product?.stock ?? 0,
    min_stock: product?.min_stock ?? 0,
    cost_price: product?.cost_price ?? 0,
    sale_price: product?.sale_price ?? 0,
    track_stock: product?.track_stock ?? true
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setErrorMsg('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setErrorMsg('')
    try {
      await onSave({
        ...form,
        category_id: form.category_id || null,
        stock: Number(form.stock),
        min_stock: Number(form.min_stock),
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price)
      })
    } catch (err) {
      setErrorMsg('No se pudo guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-carbon/15 px-3 py-2 text-sm focus:border-brasa focus:outline-none'

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-carbon/60">Nombre</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-carbon/60">Categoría</label>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-carbon/60">Unidad</label>
            <select
              className={inputClass}
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-carbon/60">Stock inicial</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.stock}
              onChange={(e) => update('stock', e.target.value)}
              disabled={!!product}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-carbon/60">Stock mínimo</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.min_stock}
              onChange={(e) => update('min_stock', e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              id="track_stock"
              checked={form.track_stock}
              onChange={(e) => update('track_stock', e.target.checked)}
            />
            <label htmlFor="track_stock" className="text-xs text-carbon/70">
              Descontar stock al vender
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-carbon/60">Precio de compra</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.cost_price}
              onChange={(e) => update('cost_price', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-carbon/60">Precio de venta</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.sale_price}
              onChange={(e) => update('sale_price', e.target.value)}
            />
          </div>
        </div>

        {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-brasa py-2.5 text-sm font-medium text-white hover:bg-brasa-dark disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  )
}