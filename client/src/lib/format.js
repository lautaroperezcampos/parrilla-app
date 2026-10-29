// Formatos y fechas usados en toda la app. Las fechas se manejan en la
// hora local del dispositivo (Argentina), no en UTC.

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
})

export function money(value) {
  return moneyFormatter.format(Number(value) || 0)
}

export function qty(value) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

// "2026-10-29" de un objeto Date, en hora local.
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(isoDate, days) {
  const d = parseISODate(isoDate)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function parseISODate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function firstOfMonthISO(date = new Date()) {
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
}

// Rango [desde 00:00, hasta el día siguiente 00:00) en timestamps, para
// filtrar columnas de fecha y hora (paid_at, opened_at...).
export function dayRangeToTimestamps(fromISO, toISO) {
  return {
    start: parseISODate(fromISO).toISOString(),
    end: parseISODate(addDays(toISO, 1)).toISOString()
  }
}

export function dateLabel(isoDate) {
  return parseISODate(isoDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export function dateTimeLabel(timestamp) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function timeLabel(timestamp) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

// "hace 25 min", "hace 1 h 10 min"
export function elapsedLabel(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' }
]

export function paymentLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? '—'
}
