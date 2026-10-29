import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OrderEditor from '../components/OrderEditor.jsx'
import TablesAdminModal from '../components/TablesAdminModal.jsx'
import { getActiveOrders, getTables, openOrder, subscribeToOrders } from '../lib/api/orders.js'
import { getOpenCashSession } from '../lib/api/cash.js'
import { elapsedLabel, money } from '../lib/format.js'
import { btnSecondary, emptyBox } from '../lib/ui.js'

// Estado visual de la mesa según el estado de su pedido activo.
const ESTADOS = {
  libre: { label: 'Libre', className: 'bg-estado-libre' },
  abierto: { label: 'Ocupada', className: 'bg-estado-ocupada' },
  en_preparacion: { label: 'En preparación', className: 'bg-estado-preparacion' },
  listo: { label: 'Lista para servir', className: 'bg-estado-listo' },
  pagando: { label: 'Pidió la cuenta', className: 'bg-estado-pagando' }
}

export default function Mesas() {
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [cashOpen, setCashOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const [t, o, cash] = await Promise.all([getTables(), getActiveOrders(), getOpenCashSession()])
      setTables(t)
      setOrders(o)
      setCashOpen(Boolean(cash))
      setErrorMsg('')
    } catch (err) {
      setErrorMsg('No se pudieron cargar las mesas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
    // Si otro dispositivo cambia un pedido, esta pantalla se actualiza sola.
    const unsubscribe = subscribeToOrders(() => loadAll())
    // Por las dudas, también cada 30 segundos (y actualiza los minutos).
    const timer = setInterval(loadAll, 30000)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [loadAll])

  async function handleTableClick(table, order) {
    setErrorMsg('')
    try {
      if (order) {
        setEditingOrderId(order.id)
      } else {
        const created = await openOrder(table.id)
        setEditingOrderId(created.id)
      }
    } catch (err) {
      setErrorMsg(err.message)
      loadAll()
    }
  }

  const ordersByTable = Object.fromEntries(
    orders.filter((o) => o.table_id).map((o) => [o.table_id, o])
  )
  const occupied = tables.filter((t) => ordersByTable[t.id]).length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-carbon">Mesas</h2>
          <p className="mt-1 text-sm text-carbon/60">
            {occupied} de {tables.length} ocupadas. Tocá una mesa para abrirla o ver su pedido.
          </p>
        </div>
        <button onClick={() => setAdminOpen(true)} className={btnSecondary}>
          Administrar mesas
        </button>
      </div>

      {!cashOpen && (
        <p className="mt-4 rounded-md bg-estado-preparacion/10 px-4 py-3 text-sm text-carbon">
          La caja está cerrada: se pueden tomar pedidos, pero para cobrar hay que{' '}
          <Link to="/caja" className="font-medium text-brasa underline">
            abrir la caja
          </Link>
          .
        </p>
      )}

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-carbon/60">
        {Object.entries(ESTADOS).map(([key, e]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${e.className}`} />
            {e.label}
          </span>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : tables.length === 0 ? (
        <div className={`mt-6 ${emptyBox}`}>No hay mesas cargadas. Agregalas desde "Administrar mesas".</div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tables.map((t) => {
            const order = ordersByTable[t.id]
            const estado = ESTADOS[order?.status ?? 'libre'] ?? ESTADOS.abierto
            return (
              <button
                key={t.id}
                onClick={() => handleTableClick(t, order)}
                className="overflow-hidden rounded-lg border border-carbon/10 bg-white text-left shadow-sm hover:shadow"
              >
                <div className={`h-1.5 ${estado.className}`} />
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl">{t.number}</span>
                    <span className="text-xs text-carbon/50">{t.seats} lugares</span>
                  </div>
                  <p className="mt-1 text-xs font-medium">{estado.label}</p>
                  {order ? (
                    <p className="mt-2 text-sm">
                      {money(order.total)}
                      <span className="ml-2 text-xs text-carbon/50">{elapsedLabel(order.opened_at)}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-carbon/30">—</p>
                  )}
                </div>
              </button>
            )
          })}
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

      {adminOpen && (
        <TablesAdminModal
          onClose={() => {
            setAdminOpen(false)
            loadAll()
          }}
        />
      )}
    </div>
  )
}
