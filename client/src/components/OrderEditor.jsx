import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import {
  addOrderItem,
  cancelOrder,
  discardEmptyOrder,
  getOrder,
  payOrder,
  removeOrderItem,
  setOrderNotes,
  setOrderStatus,
  updateOrderItemQuantity
} from '../lib/api/orders.js'
import { getProducts } from '../lib/api/products.js'
import { money, qty, PAYMENT_METHODS } from '../lib/format.js'
import { btnPrimary, btnSecondary, btnSmall, inputClass } from '../lib/ui.js'

const STATUS_STEPS = [
  { value: 'abierto', label: 'Tomando pedido' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'listo', label: 'Listo' },
  { value: 'pagando', label: 'Pidió la cuenta' }
]

// Pantalla para cargar productos a un pedido (de mesa o de mostrador),
// cambiar su estado y cobrarlo.
export default function OrderEditor({ orderId, onClose }) {
  const [order, setOrder] = useState(null)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [paying, setPaying] = useState(false)

  async function reload() {
    setOrder(await getOrder(orderId))
  }

  useEffect(() => {
    Promise.all([getOrder(orderId), getProducts()])
      .then(([o, p]) => {
        setOrder(o)
        setProducts(p.filter((prod) => prod.is_sellable))
      })
      .catch((err) => setErrorMsg('No se pudo cargar el pedido: ' + err.message))
  }, [orderId])

  // Ejecuta una acción, muestra el error si falla y recarga el pedido.
  async function run(action) {
    setBusy(true)
    setErrorMsg('')
    try {
      await action()
      await reload()
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleClose() {
    // Si se abrió la mesa pero no se cargó nada, no dejamos un pedido vacío.
    try {
      await discardEmptyOrder(orderId)
    } catch {
      // Si falla no pasa nada: queda como pedido vacío y se puede cancelar.
    }
    onClose()
  }

  function handleAdd(product) {
    const existing = order.order_items.find((i) => i.product_id === product.id)
    run(() =>
      existing
        ? updateOrderItemQuantity(existing.id, Number(existing.quantity) + 1)
        : addOrderItem(orderId, product)
    )
  }

  function handleQuantity(item, newQuantity) {
    if (!(newQuantity > 0)) return run(() => removeOrderItem(item.id))
    return run(() => updateOrderItemQuantity(item.id, newQuantity))
  }

  async function handlePay(method) {
    setBusy(true)
    setErrorMsg('')
    try {
      await payOrder(orderId, method)
      onClose()
    } catch (err) {
      setErrorMsg(err.message)
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!confirm('¿Cancelar este pedido? No se cobra y la mesa queda libre.')) return
    setBusy(true)
    try {
      await cancelOrder(orderId)
      onClose()
    } catch (err) {
      setErrorMsg(err.message)
      setBusy(false)
    }
  }

  const categories = useMemo(() => {
    const names = new Set(products.map((p) => p.categories?.name).filter(Boolean))
    return [...names].sort()
  }, [products])

  const visibleProducts = products.filter(
    (p) =>
      (!category || p.categories?.name === category) &&
      p.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const title = !order
    ? 'Pedido'
    : order.table_id
      ? `Mesa ${order.tables?.number}`
      : `Mostrador · pedido #${order.id}`

  const closed = order && ['pagado', 'cancelado'].includes(order.status)

  return (
    <Modal title={title} onClose={handleClose} size="xl">
      {!order ? (
        <p className="text-sm text-carbon/50">{errorMsg || 'Cargando...'}</p>
      ) : closed ? (
        <p className="text-sm text-carbon/60">Este pedido ya está cerrado.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_340px]">
          {/* Productos para agregar */}
          <div>
            <input
              className={inputClass}
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['', ...categories].map((c) => (
                <button
                  key={c || 'todas'}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    category === c ? 'bg-carbon text-crema' : 'bg-carbon/5 text-carbon/70'
                  }`}
                >
                  {c || 'Todas'}
                </button>
              ))}
            </div>
            {products.length === 0 ? (
              <p className="mt-4 text-sm text-carbon/50">
                No hay productos para vender. Cargalos en Stock (marcá "Se vende en la carta").
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {visibleProducts.map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    onClick={() => handleAdd(p)}
                    className="rounded-md border border-carbon/10 bg-crema/40 p-3 text-left hover:border-brasa disabled:opacity-60"
                  >
                    <span className="block text-sm font-medium leading-tight">{p.name}</span>
                    <span className="mt-1 block text-xs text-carbon/60">{money(p.sale_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalle del pedido */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_STEPS.map((s) => (
                <button
                  key={s.value}
                  disabled={busy}
                  onClick={() => run(() => setOrderStatus(orderId, s.value))}
                  className={`rounded-full px-3 py-1 text-xs ${
                    order.status === s.value ? 'bg-brasa text-white' : 'bg-carbon/5 text-carbon/70'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="rounded-md border border-carbon/10">
              {order.order_items.length === 0 ? (
                <p className="p-4 text-sm text-carbon/50">Tocá un producto para agregarlo.</p>
              ) : (
                <ul className="divide-y divide-carbon/5">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.product_name}</p>
                        <p className="text-xs text-carbon/50">
                          {qty(item.quantity)} × {money(item.unit_price)}
                        </p>
                      </div>
                      <button
                        disabled={busy}
                        className={btnSmall}
                        onClick={() => handleQuantity(item, Number(item.quantity) - 1)}
                        aria-label="Restar uno"
                      >
                        −
                      </button>
                      <QuantityInput
                        value={item.quantity}
                        disabled={busy}
                        onCommit={(v) => handleQuantity(item, v)}
                      />
                      <button
                        disabled={busy}
                        className={btnSmall}
                        onClick={() => handleQuantity(item, Number(item.quantity) + 1)}
                        aria-label="Sumar uno"
                      >
                        +
                      </button>
                      <span className="w-20 text-right font-medium">
                        {money(item.quantity * item.unit_price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between border-t border-carbon/10 px-3 py-3">
                <span className="text-sm text-carbon/60">Total</span>
                <span className="font-display text-xl">{money(order.total)}</span>
              </div>
            </div>

            <NotesInput
              key={order.id}
              initial={order.notes ?? ''}
              onSave={(notes) => run(() => setOrderNotes(orderId, notes))}
            />

            {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}

            {paying ? (
              <div className="rounded-md bg-crema p-3">
                <p className="text-sm font-medium">¿Cómo paga? ({money(order.total)})</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      disabled={busy}
                      onClick={() => handlePay(m.value)}
                      className={btnPrimary}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPaying(false)}
                  className="mt-2 w-full text-xs text-carbon/60 underline"
                >
                  Volver
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy} onClick={handleCancel} className={btnSecondary}>
                  Cancelar pedido
                </button>
                <button
                  disabled={busy || order.order_items.length === 0}
                  onClick={() => setPaying(true)}
                  className={btnPrimary}
                >
                  Cobrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// Permite escribir cantidades con decimales (ej. 0.5 kg de vacío).
function QuantityInput({ value, disabled, onCommit }) {
  const [text, setText] = useState(String(Number(value)))
  useEffect(() => setText(String(Number(value))), [value])

  function commit() {
    const n = Number(text.replace(',', '.'))
    if (text.trim() === '' || Number.isNaN(n)) {
      setText(String(Number(value)))
      return
    }
    if (n !== Number(value)) onCommit(n)
  }

  return (
    <input
      inputMode="decimal"
      disabled={disabled}
      className="w-12 rounded border border-carbon/15 px-1 py-1 text-center text-xs"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

function NotesInput({ initial, onSave }) {
  const [notes, setNotes] = useState(initial)
  return (
    <input
      className={inputClass}
      placeholder="Notas (ej: sin sal, punto jugoso)"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={() => notes !== initial && onSave(notes)}
    />
  )
}
