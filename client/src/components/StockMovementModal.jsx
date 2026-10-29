import { useState } from 'react'
import Modal from './Modal.jsx'
import { qty } from '../lib/format.js'
import { btnPrimary, inputClass, labelClass } from '../lib/ui.js'

const TITLES = {
  entrada: 'Registrar entrada',
  salida: 'Registrar salida',
  ajuste: 'Ajustar stock (conteo)'
}

export default function StockMovementModal({ product, type, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const value = Number(quantity)
    const valid = type === 'ajuste' ? quantity !== '' && value >= 0 : value > 0
    if (!valid) {
      setErrorMsg('Ingresá una cantidad válida')
      return
    }
    setSaving(true)
    setErrorMsg('')
    try {
      await onConfirm(value, reason)
    } catch (err) {
      setErrorMsg(err.message)
      setSaving(false)
    }
  }

  const placeholders = {
    entrada: 'Ej: compra a proveedor',
    salida: 'Ej: producto vencido',
    ajuste: 'Ej: conteo de fin de mes'
  }

  return (
    <Modal title={`${TITLES[type]} — ${product.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-carbon/60">
          Stock actual: {qty(product.stock)} {product.unit}
        </p>
        <div>
          <label className={labelClass}>
            {type === 'ajuste' ? `Cantidad contada (${product.unit})` : `Cantidad (${product.unit})`}
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            autoFocus
            className={inputClass}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Motivo (opcional)</label>
          <input
            className={inputClass}
            placeholder={placeholders[type]}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
          {saving ? 'Guardando...' : 'Confirmar'}
        </button>
      </form>
    </Modal>
  )
}
