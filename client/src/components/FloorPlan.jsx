import { useRef, useState } from 'react'
import { elapsedLabel, money } from '../lib/format.js'

// Plano del local: cada zona (Salón, Patio...) es un recuadro y las mesas
// son cuadraditos adentro, con el color de su estado. En modo edición se
// arrastran para acomodarlas como están en el local.

// Mesas sin posición guardada: se acomodan en filas, en orden de número.
function autoPositions(tables) {
  const n = tables.length
  const cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n * 1.8))))
  const rows = Math.max(1, Math.ceil(n / cols))
  return Object.fromEntries(
    tables.map((t, i) => [
      t.id,
      { x: 10 + ((i % cols) + 0.5) * (80 / cols), y: 10 + (Math.floor(i / cols) + 0.5) * (80 / rows) }
    ])
  )
}

function groupByZone(tables) {
  const zones = new Map()
  for (const t of [...tables].sort((a, b) => a.number - b.number)) {
    const zone = t.zone || 'Salón'
    if (!zones.has(zone)) zones.set(zone, [])
    zones.get(zone).push(t)
  }
  return [...zones.entries()]
}

export default function FloorPlan({ tables, ordersByTable, estados, editing, onTableClick, onMove }) {
  return (
    <div className="space-y-6">
      {groupByZone(tables).map(([zone, zoneTables]) => (
        <Zone
          key={zone}
          name={zone}
          tables={zoneTables}
          ordersByTable={ordersByTable}
          estados={estados}
          editing={editing}
          onTableClick={onTableClick}
          onMove={onMove}
        />
      ))}
    </div>
  )
}

function Zone({ name, tables, ordersByTable, estados, editing, onTableClick, onMove }) {
  const areaRef = useRef(null)
  const [dragging, setDragging] = useState(null) // { id, x, y }
  const auto = autoPositions(tables)

  function positionOf(t) {
    if (dragging?.id === t.id) return dragging
    if (t.pos_x != null && t.pos_y != null) return { x: Number(t.pos_x), y: Number(t.pos_y) }
    return auto[t.id]
  }

  function pointToPercent(e) {
    const rect = areaRef.current.getBoundingClientRect()
    const clamp = (v) => Math.min(90, Math.max(10, v))
    return {
      x: Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100) * 10) / 10,
      y: Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100) * 10) / 10
    }
  }

  function handlePointerDown(e, t) {
    if (!editing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging({ id: t.id, ...pointToPercent(e) })
  }

  function handlePointerMove(e, t) {
    if (dragging?.id !== t.id) return
    setDragging({ id: t.id, ...pointToPercent(e) })
  }

  function handlePointerUp(t) {
    if (dragging?.id !== t.id) return
    onMove(t, dragging.x, dragging.y)
    setDragging(null)
  }

  return (
    <div>
      <h3 className="mb-2 text-lg">{name}</h3>
      <div
        ref={areaRef}
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 bg-white sm:aspect-[16/9] ${
          editing ? 'border-dashed border-brasa' : 'border-carbon/10'
        }`}
        style={{
          backgroundImage: 'radial-gradient(rgba(31,26,23,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {tables.map((t) => {
          const order = ordersByTable[t.id]
          const estado = estados[order?.status ?? 'libre'] ?? estados.abierto
          const pos = positionOf(t)
          const big = t.seats >= 6
          const free = !order
          return (
            <button
              key={t.id}
              onClick={() => !editing && onTableClick(t, order)}
              onPointerDown={(e) => handlePointerDown(e, t)}
              onPointerMove={(e) => handlePointerMove(e, t)}
              onPointerUp={() => handlePointerUp(t)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, touchAction: editing ? 'none' : 'auto' }}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg text-center shadow-sm transition-shadow hover:shadow-md ${
                big ? 'h-14 w-[72px] sm:h-24 sm:w-36' : 'h-14 w-14 sm:h-24 sm:w-24'
              } ${free ? 'border-2 border-estado-libre bg-white text-carbon' : `${estado.className} text-white`} ${
                editing ? 'cursor-move ring-2 ring-brasa/40' : ''
              } ${dragging?.id === t.id ? 'z-10 scale-105 shadow-lg' : ''}`}
              title={`Mesa ${t.number} · ${t.seats} lugares · ${estado.label}`}
            >
              <span className="font-display text-lg leading-none sm:text-3xl">{t.number}</span>
              {order ? (
                <>
                  <span className="mt-1 text-[10px] font-medium leading-tight sm:text-xs">{money(order.total)}</span>
                  <span className="hidden text-[10px] opacity-80 sm:block">{elapsedLabel(order.opened_at)}</span>
                </>
              ) : (
                <span className="mt-1 text-[10px] text-carbon/50 sm:text-xs">{t.seats} lug.</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
