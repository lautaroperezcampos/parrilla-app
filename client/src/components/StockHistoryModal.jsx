import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { getStockMovements } from '../lib/api/products.js'
import { dateTimeLabel, qty } from '../lib/format.js'

const TYPE_LABELS = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  venta: 'Venta'
}

export default function StockHistoryModal({ product, onClose }) {
  const [movements, setMovements] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getStockMovements(product.id)
      .then(setMovements)
      .catch((err) => setErrorMsg(err.message))
  }, [product.id])

  return (
    <Modal title={`Movimientos — ${product.name}`} onClose={onClose} size="lg">
      {!movements ? (
        <p className="text-sm text-carbon/50">{errorMsg || 'Cargando...'}</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-carbon/50">Todavía no hay movimientos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-carbon/50">
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Cantidad</th>
                <th className="pb-2 text-right">Queda</th>
                <th className="pb-2 pl-3">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const sign = m.stock_after >= m.stock_before ? '+' : '−'
                return (
                  <tr key={m.id} className="border-t border-carbon/5">
                    <td className="py-1.5 whitespace-nowrap">{dateTimeLabel(m.created_at)}</td>
                    <td className="py-1.5">{TYPE_LABELS[m.type]}</td>
                    <td className="py-1.5 text-right">
                      {sign}
                      {qty(Math.abs(m.stock_after - m.stock_before))}
                    </td>
                    <td className="py-1.5 text-right">{qty(m.stock_after)}</td>
                    <td className="py-1.5 pl-3 text-carbon/60">{m.reason ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
