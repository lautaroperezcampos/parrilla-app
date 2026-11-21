import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import {
  addOrderItem,
  cancelOrder,
  discardEmptyOrder,
  getOrder,
  markOrderSent,
  payOrder,
  removeOrderItem,
  setOrderAdjustment,
  setOrderNotes,
  setOrderStatus,
  updateOrderItemQuantity
} from '../lib/api/orders.js'
import { getProducts } from '../lib/api/products.js'
import { adjustmentLabel, money, qty, PAYMENT_METHODS } from '../lib/format.js'
import { printBill, printComanda, STATIONS } from '../lib/print.js'
import { btnPrimary, btnSecondary, btnSmall, inputClass } from '../lib/ui.js'

const STATUS_STEPS = [
  { value: 'abierto', label: 'Tomando pedido' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'listo', label: 'Listo' },
  { value: 'pagando', label: 'Pidió la cuenta' }
]

// Cómo se agrupan los ítems en pantalla y en la cuenta. Lo que no tiene
// estación (bebidas y otros) no sale en ninguna comanda.
const GROUPS = [
  { station: 'parrilla', label: 'Parrilla' },
  { station: 'cocina', label: 'Cocina' },
  { station: null, label: 'Bebidas' }
]

function stationOf(item) {
  return item.products?.print_station ?? null
}

function pendingOf(item) {
  return Number(item.quantity) - Number(item.sent_quantity ?? 0)
}

function groupItems(items) {
  return GROUPS.map((g) => ({ ...g, items: items.filter((i) => stationOf(i) === g.station) })).filter(
    (g) => g.items.length > 0
  )
}

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
  const [adjusting, setAdjusting] = useState(false)

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
      return true
    } catch (err) {
      setErrorMsg(err.message)
      return false
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
    if (!(newQuantity > 0)) {
      if (stationOf(item) && Number(item.sent_quantity) > 0) {
        const ok = confirm(
          `"${item.product_name}" ya se mandó a ${STATIONS[stationOf(item)].toLowerCase()}. ¿Sacarlo igual? Avisá para que no lo preparen.`
        )
        if (!ok) return
      }
      return run(() => removeOrderItem(item.id))
    }
    return run(() => updateOrderItemQuantity(item.id, newQuantity))
  }

  // Imprime una comanda por estación con lo nuevo desde la última vez.
  async function handleSendComanda() {
    const comandas = Object.keys(STATIONS)
      .map((station) => ({
        station,
        lines: order.order_items
          .filter((i) => stationOf(i) === station && pendingOf(i) !== 0)
          .map((i) => ({ name: i.product_name, quantity: pendingOf(i) }))
      }))
      .filter((c) => c.lines.length > 0)

    if (comandas.length === 0) {
      setErrorMsg('No hay nada nuevo para mandar a la parrilla ni a la cocina.')
      return
    }
    setErrorMsg('')
    for (const c of comandas) printComanda({ ...c, order })

    if (confirm('¿Salieron bien las comandas?\n\nAceptar: quedan como enviadas.\nCancelar: se pueden volver a imprimir.')) {
      run(() => markOrderSent(orderId))
    }
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
                groupItems(order.order_items).map((group) => (
                <div key={group.label}>
                <p className="bg-carbon/5 px-3 py-1 text-xs font-medium text-carbon/60">
                  {group.label}
                  {!group.station && <span className="font-normal"> · no sale en comanda</span>}
                </p>
                <ul className="divide-y divide-carbon/5">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.product_name}</p>
                        <p className="text-xs text-carbon/50">
                          {qty(item.quantity)} × {money(item.unit_price)}
                          {group.station && pendingOf(item) > 0 && (
                            <span className="ml-1.5 font-medium text-brasa">· sin enviar {qty(pendingOf(item))}</span>
                          )}
                          {group.station && pendingOf(item) < 0 && (
                            <span className="ml-1.5 font-medium text-estado-ocupada">· anular {qty(-pendingOf(item))}</span>
                          )}
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
                </div>
                ))
              )}
              <div className="space-y-1 border-t border-carbon/10 px-3 py-3">
                {adjustmentLabel(order) && (
                  <>
                    <div className="flex justify-between text-sm text-carbon/60">
                      <span>Subtotal</span>
                      <span>{money(order.subtotal)}</span>
                    </div>
                    <div
                      className={`flex justify-between text-sm ${
                        Number(order.adjustment_value) < 0 ? 'text-estado-libre' : 'text-brasa'
                      }`}
                    >
                      <span>{adjustmentLabel(order)}</span>
                      <span>
                        {Number(order.total) >= Number(order.subtotal) ? '+ ' : '− '}
                        {money(Math.abs(order.total - order.subtotal))}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-carbon/60">Total</span>
                  <span className="font-display text-xl">{money(order.total)}</span>
                </div>
              </div>
            </div>

            {adjusting ? (
              <AdjustmentPanel
                order={order}
                busy={busy}
                onApply={(kind, value) =>
                  run(() => setOrderAdjustment(orderId, kind, value)).then((ok) => ok && setAdjusting(false))
                }
                onClose={() => setAdjusting(false)}
              />
            ) : (
              <button
                disabled={busy || order.order_items.length === 0}
                onClick={() => setAdjusting(true)}
                className="self-start text-sm text-brasa underline disabled:opacity-50"
              >
                {adjustmentLabel(order) ? 'Cambiar descuento / recargo' : '+ Descuento / recargo'}
              </button>
            )}

            <NotesInput
              key={order.id}
              initial={order.notes ?? ''}
              onSave={(notes) => run(() => setOrderNotes(orderId, notes))}
            />

            {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={busy || order.order_items.length === 0}
                onClick={handleSendComanda}
                className={btnSecondary}
              >
                Enviar comanda
              </button>
              <button
                disabled={busy || order.order_items.length === 0}
                onClick={() => printBill({ order, groups: groupItems(order.order_items) })}
                className={btnSecondary}
              >
                Imprimir cuenta
              </button>
            </div>

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

// Descuento o recargo, por porcentaje o por monto fijo.
function AdjustmentPanel({ order, busy, onApply, onClose }) {
  const current = Number(order.adjustment_value)
  const [mode, setMode] = useState(current > 0 ? 'recargo' : 'descuento')
  const [kind, setKind] = useState(order.adjustment_kind ?? 'porcentaje')
  const [value, setValue] = useState(order.adjustment_kind ? String(Math.abs(current)) : '')
  const [errorMsg, setErrorMsg] = useState('')

  const amount = Number(String(value).replace(',', '.'))
  const subtotal = Number(order.subtotal)
  const delta = kind === 'porcentaje' ? (subtotal * amount) / 100 : amount
  const preview = Math.max(0, Math.round(subtotal + (mode === 'descuento' ? -delta : delta)))

  function handleApply() {
    if (!(amount > 0)) return setErrorMsg('Ingresá un valor mayor a cero')
    if (kind === 'porcentaje' && amount > 100) return setErrorMsg('El porcentaje no puede pasar de 100')
    setErrorMsg('')
    onApply(kind, mode === 'descuento' ? -amount : amount)
  }

  const toggle = (active) =>
    `flex-1 rounded-md px-3 py-1.5 text-sm ${active ? 'bg-carbon text-crema' : 'bg-white text-carbon/70 ring-1 ring-carbon/10'}`

  return (
    <div className="space-y-2 rounded-md bg-crema p-3">
      <div className="flex gap-2">
        <button className={toggle(mode === 'descuento')} onClick={() => setMode('descuento')}>
          Descuento
        </button>
        <button className={toggle(mode === 'recargo')} onClick={() => setMode('recargo')}>
          Recargo
        </button>
      </div>
      <div className="flex gap-2">
        <button className={toggle(kind === 'porcentaje')} onClick={() => setKind('porcentaje')}>
          Porcentaje (%)
        </button>
        <button className={toggle(kind === 'monto')} onClick={() => setKind('monto')}>
          Monto ($)
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-carbon/60">{kind === 'porcentaje' ? '%' : '$'}</span>
        <input
          inputMode="decimal"
          autoFocus
          className={inputClass}
          placeholder={kind === 'porcentaje' ? 'Ej: 10' : 'Ej: 2000'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
      </div>
      {amount > 0 && (
        <p className="text-sm text-carbon/70">
          Total con {mode}: <strong>{money(preview)}</strong>
        </p>
      )}
      {errorMsg && <p className="text-sm text-estado-ocupada">{errorMsg}</p>}
      <div className="flex gap-2">
        <button disabled={busy} onClick={handleApply} className={`${btnPrimary} flex-1`}>
          Aplicar
        </button>
        {order.adjustment_kind && (
          <button disabled={busy} onClick={() => onApply(null, null)} className={btnSecondary}>
            Quitar
          </button>
        )}
        <button onClick={onClose} className={btnSecondary}>
          Volver
        </button>
      </div>
    </div>
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
