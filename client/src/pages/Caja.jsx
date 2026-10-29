import { useEffect, useState } from 'react'
import {
  closeCashSession,
  getCashSessions,
  getCashSummary,
  getOpenCashSession,
  openCashSession
} from '../lib/api/cash.js'
import { dateTimeLabel, money, paymentLabel } from '../lib/format.js'
import { btnPrimary, card, inputClass, labelClass } from '../lib/ui.js'

export default function Caja() {
  const [session, setSession] = useState(null)
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadAll() {
    setErrorMsg('')
    try {
      const [open, past] = await Promise.all([getOpenCashSession(), getCashSessions()])
      setSession(open)
      setHistory(past)
      setSummary(open ? await getCashSummary(open.id) : null)
    } catch (err) {
      setErrorMsg('No se pudo cargar la caja: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const value = Number(amount)
    if (amount === '' || !(value >= 0)) return setErrorMsg('Ingresá un monto válido')
    if (session) {
      const diff = value - Number(summary?.esperado ?? 0)
      const msg =
        diff === 0
          ? '¿Cerrar la caja? La cuenta da justo.'
          : `¿Cerrar la caja con una diferencia de ${money(diff)} (${diff > 0 ? 'sobra' : 'falta'})?`
      if (!confirm(msg)) return
    }
    setBusy(true)
    setErrorMsg('')
    try {
      if (session) await closeCashSession(value, notes)
      else await openCashSession(value, notes)
      setAmount('')
      setNotes('')
      await loadAll()
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-carbon/50">Cargando...</p>

  return (
    <div>
      <h2 className="text-2xl text-carbon">Caja</h2>
      <p className="mt-1 text-sm text-carbon/60">
        Abrí la caja al empezar el turno con el efectivo inicial, y cerrala al final contando la plata.
      </p>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {session && summary && (
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Caja abierta</h3>
              <span className="text-xs text-carbon/50">desde {dateTimeLabel(session.opened_at)}</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Efectivo inicial" value={money(summary.opening_amount)} />
              <Row
                label={`Ventas del turno (${summary.ventas_cantidad})`}
                value={money(summary.ventas_total)}
              />
              {summary.por_metodo.map((m) => (
                <Row key={m.metodo} label={`· ${paymentLabel(m.metodo)}`} value={money(m.total)} muted />
              ))}
              <Row label="Gastos pagados con la caja" value={`− ${money(summary.gastos_caja)}`} />
              <div className="border-t border-carbon/10 pt-2">
                <Row label="Efectivo que debería haber" value={money(summary.esperado)} strong />
              </div>
            </dl>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`${card} space-y-3 p-5`}>
          <h3 className="text-lg">{session ? 'Cerrar caja' : 'Abrir caja'}</h3>
          <div>
            <label className={labelClass}>
              {session ? 'Efectivo contado en la caja' : 'Efectivo inicial (cambio)'}
            </label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {session && amount !== '' && summary && (
            <DifferenceHint diff={Number(amount) - Number(summary.esperado)} />
          )}
          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? 'Guardando...' : session ? 'Cerrar caja' : 'Abrir caja'}
          </button>
        </form>
      </div>

      <h3 className="mt-10 text-lg">Cierres anteriores</h3>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-carbon/50">Todavía no hay cierres.</p>
      ) : (
        <div className={`mt-3 overflow-x-auto ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon/10 text-left text-xs text-carbon/50">
                <th className="px-4 py-3">Apertura</th>
                <th className="px-4 py-3">Cierre</th>
                <th className="px-4 py-3 text-right">Inicial</th>
                <th className="px-4 py-3 text-right">Esperado</th>
                <th className="px-4 py-3 text-right">Contado</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-b border-carbon/5 last:border-0">
                  <td className="px-4 py-3">{dateTimeLabel(s.opened_at)}</td>
                  <td className="px-4 py-3">{dateTimeLabel(s.closed_at)}</td>
                  <td className="px-4 py-3 text-right">{money(s.opening_amount)}</td>
                  <td className="px-4 py-3 text-right">{money(s.expected_amount)}</td>
                  <td className="px-4 py-3 text-right">{money(s.counted_amount)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      Number(s.difference) < 0 ? 'text-estado-ocupada' : Number(s.difference) > 0 ? 'text-estado-libre' : ''
                    }`}
                  >
                    {money(s.difference)}
                  </td>
                  <td className="px-4 py-3 text-carbon/60">{s.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, strong, muted }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-carbon/50' : ''}`}>
      <dt>{label}</dt>
      <dd className={strong ? 'font-display text-xl' : 'font-medium'}>{value}</dd>
    </div>
  )
}

function DifferenceHint({ diff }) {
  if (diff === 0) return <p className="text-sm text-estado-libre">La cuenta da justo.</p>
  return (
    <p className={`text-sm ${diff < 0 ? 'text-estado-ocupada' : 'text-estado-libre'}`}>
      {diff < 0 ? 'Faltan' : 'Sobran'} {money(Math.abs(diff))}
    </p>
  )
}
