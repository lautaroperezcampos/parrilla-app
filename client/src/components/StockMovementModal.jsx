import { useState } from 'react'
import Modal from './Modal.jsx'

export default function StockMovementModal({ product, type, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const title = type === 'entrada' ? 'Registrar entrada' : 'Registrar salida'

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      setErrorMsg('Ingresá una cantidad válida')
      return
    }
    setSaving(true)
    setErrorMsg('')
    try {
      await onConfirm(qty, reason)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`${title} — ${product.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-carbon/60">
          Stock actual: {product.stock} {product.unit}
        </p>
        <div>
          <label className="text-xs text-carbon/60">Cantidad ({product.unit})</label>
          <input
            type="number"
            step="0.01"
            autoFocus
            className="w-full rounded-md border border-carbon/15 px-3 py-2 text-sm focus:border-brasa focus:outline-none"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-carbon/60">Motivo (opcional)</label>
          <input
            className="w-full rounded-md border border-carbon/15 px-3 py-2 text-sm focus:border-brasa focus:outline-none"
            placeholder={type === 'entrada' ? 'Ej: compra a proveedor' : 'Ej: producto vencido'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-brasa py-2.5 text-sm font-medium text-white hover:bg-brasa-dark disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Confirmar'}
        </button>
      </form>
    </Modal>
  )
}