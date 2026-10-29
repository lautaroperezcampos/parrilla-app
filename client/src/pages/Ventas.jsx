import { useCallback, useEffect, useState } from 'react'
import OrderEditor from '../components/OrderEditor.jsx'
import SaleDetailModal from '../components/SaleDetailModal.jsx'
import DateRangeFilter from '../components/DateRangeFilter.jsx'
import { getActiveOrders, getSales, openOrder } from '../lib/api/orders.js'
import {
  dateTimeLabel,
  dayRangeToTimestamps,
  money,
  paymentLabel,
  PAYMENT_METHODS,
  todayISO
} from '../lib/format.js'
import { btnPrimary, card, emptyBox, inputClass } from '../lib/ui.js'

export default function Ventas() {
  const [range, setRange] = useState({ from: todayISO(), to: todayISO() })
  const [method, setMethod] = useState('')
  const [sales, setSales] = useState([])
  const [counterOrders, setCounterOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { start, end } = dayRangeToTimestamps(range.from, range.to)
      const [s, active] = await Promise.all([
        getSales({ start, end, paymentMethod: method }),
        getActiveOrders()
      ])
      setSales(s)
      setCounterOrders(active.filter((o) => !o.table_id && o.order_items.length > 0))
    } catch (err) {
      setErrorMsg('No se pudieron cargar las ventas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [range, method])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function handleNewCounterSale() {
    try {
      const order = await openOrder(null)
      setEditingOrderId(order.id)
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  const paid = sales.filter((s) => s.status === 'pagado')
  const total = paid.reduce((sum, s) => sum + Number(s.total), 0)
  const byMethod = PAYMENT_METHODS.map((m) => ({
    ...m,
    total: paid.filter((s) => s.payment_method === m.value).reduce((sum, s) => sum + Number(s.total), 0)
  })).filter((m) => m.total > 0)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-carbon">Ventas</h2>
          <p className="mt-1 text-sm text-carbon/60">Ventas cobradas, de mesa y de mostrador.</p>
        </div>
        <button onClick={handleNewCounterSale} className={btnPrimary}>
          + Venta de mostrador
        </button>
      </div>

      {counterOrders.length > 0 && (
        <div className="mt-4 rounded-md bg-estado-preparacion/10 px-4 py-3 text-sm">
          <p className="font-medium">Ventas de mostrador sin cobrar:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {counterOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => setEditingOrderId(o.id)}
                className="rounded border border-carbon/15 bg-white px-3 py-1 text-xs hover:bg-crema"
              >
                #{o.id} · {money(o.total)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        <select className={`${inputClass} w-auto`} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">Todos los medios de pago</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-carbon/60">Total: </span>
          <strong>{money(total)}</strong> ({paid.length} ventas)
        </span>
        {byMethod.map((m) => (
          <span key={m.value} className="text-carbon/70">
            {m.label}: {money(m.total)}
          </span>
        ))}
      </div>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : sales.length === 0 ? (
        <div className={`mt-4 ${emptyBox}`}>No hay ventas en este período.</div>
      ) : (
        <div className={`mt-4 overflow-x-auto ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon/10 text-left text-xs text-carbon/50">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setDetailId(s.id)}
                  className={`cursor-pointer border-b border-carbon/5 last:border-0 hover:bg-crema/50 ${
                    s.status === 'cancelado' ? 'text-carbon/40 line-through' : ''
                  }`}
                >
                  <td className="px-4 py-3">{s.id}</td>
                  <td className="px-4 py-3">{dateTimeLabel(s.paid_at)}</td>
                  <td className="px-4 py-3">{s.tables ? `Mesa ${s.tables.number}` : 'Mostrador'}</td>
                  <td className="px-4 py-3">{paymentLabel(s.payment_method)}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingOrderId && (
        <OrderEditor
          orderId={editingOrderId}
          onClose={() => {
            setEditingOrderId(null)
            loadAll()
          }}
        />
      )}

      {detailId && (
        <SaleDetailModal
          orderId={detailId}
          onClose={() => setDetailId(null)}
          onVoided={() => {
            setDetailId(null)
            loadAll()
          }}
        />
      )}
    </div>
  )
}
