import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { getOrder, voidOrder } from '../lib/api/orders.js'
import { dateTimeLabel, money, paymentLabel, qty } from '../lib/format.js'
import { btnSecondary } from '../lib/ui.js'

export default function SaleDetailModal({ orderId, onClose, onVoided }) {
  const [order, setOrder] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getOrder(orderId)
      .then(setOrder)
      .catch((err) => setErrorMsg(err.message))
  }, [orderId])

  async function handleVoid() {
    const reason = prompt(
      'Vas a anular esta venta: se devuelve el stock y deja de contar en la caja.\nMotivo (opcional):'
    )
    if (reason === null) return
    setBusy(true)
    setErrorMsg('')
    try {
      await voidOrder(orderId, reason)
      onVoided()
    } catch (err) {
      setErrorMsg(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={`Venta #${orderId}`} onClose={onClose}>
      {!order ? (
        <p className="text-sm text-carbon/50">{errorMsg || 'Cargando...'}</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 text-carbon/70">
            <span>{order.tables ? `Mesa ${order.tables.number}` : 'Mostrador'}</span>
            <span className="text-right">{dateTimeLabel(order.paid_at)}</span>
            <span>Pago: {paymentLabel(order.payment_method)}</span>
            <span className="text-right">
              {order.status === 'cancelado' ? (
                <span className="font-medium text-estado-ocupada">Anulada</span>
              ) : (
                'Cobrada'
              )}
            </span>
          </div>

          <ul className="divide-y divide-carbon/5 rounded-md border border-carbon/10">
            {order.order_items.map((i) => (
              <li key={i.id} className="flex justify-between px-3 py-2">
                <span>
                  {qty(i.quantity)} × {i.product_name}
                </span>
                <span>{money(i.quantity * i.unit_price)}</span>
              </li>
            ))}
            <li className="flex justify-between px-3 py-2 font-medium">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </li>
          </ul>

          {order.notes && <p className="text-carbon/60">Notas: {order.notes}</p>}
          {errorMsg && <p className="text-estado-ocupada">{errorMsg}</p>}

          {order.status === 'pagado' && (
            <button onClick={handleVoid} disabled={busy} className={`${btnSecondary} w-full text-estado-ocupada`}>
              Anular venta
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
