import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import DateRangeFilter from '../components/DateRangeFilter.jsx'
import { HorizontalBars, SalesExpensesChart } from '../components/Charts.jsx'
import { getReport } from '../lib/api/cash.js'
import { firstOfMonthISO, money, paymentLabel, qty, todayISO } from '../lib/format.js'
import { card } from '../lib/ui.js'

export default function Reportes() {
  const [range, setRange] = useState({ from: firstOfMonthISO(), to: todayISO() })
  const [report, setReport] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    setErrorMsg('')
    getReport(range.from, range.to)
      .then((r) => !cancelled && setReport(r))
      .catch((err) => !cancelled && setErrorMsg('No se pudo cargar el reporte: ' + err.message))
    return () => {
      cancelled = true
    }
  }, [range])

  return (
    <div>
      <h2 className="text-2xl text-carbon">Reportes</h2>
      <p className="mt-1 text-sm text-carbon/60">Cómo viene el negocio en el período elegido.</p>

      <div className="mt-6">
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      {!report ? (
        !errorMsg && <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : (
        <ReportBody report={report} range={range} />
      )}
    </div>
  )
}

function ReportBody({ report, range }) {
  const ventas = Number(report.ventas_total)
  const gastos = Number(report.gastos_total)
  const costo = Number(report.costo_mercaderia)
  const ticket = report.ventas_cantidad > 0 ? ventas / report.ventas_cantidad : 0

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        <StatCard label={`Ventas (${report.ventas_cantidad})`} value={money(ventas)} accent />
        <StatCard label="Gastos" value={money(gastos)} />
        <StatCard label="Ventas − gastos" value={money(ventas - gastos)} />
        <StatCard label="Ticket promedio" value={money(ticket)} />
        <StatCard
          label="Margen sobre costo"
          value={ventas > 0 && costo > 0 ? `${Math.round(((ventas - costo) / ventas) * 100)}%` : '—'}
        />
      </div>
      <p className="mt-2 text-xs text-carbon/50">
        "Margen sobre costo" usa el precio de compra cargado en cada producto
        {costo > 0 ? ` (costo de lo vendido: ${money(costo)})` : ''}. Si un producto no tiene precio de compra, no
        se cuenta.
      </p>

      <div className={`mt-6 ${card} p-5`}>
        <h3 className="text-lg">Ventas y gastos por día</h3>
        <div className="mt-3">
          <SalesExpensesChart
            from={range.from}
            to={range.to}
            ventasPorDia={report.ventas_por_dia}
            gastosPorDia={report.gastos_por_dia}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className={`${card} p-5`}>
          <h3 className="text-lg">Productos más vendidos</h3>
          {report.top_productos.length === 0 ? (
            <p className="mt-2 text-sm text-carbon/50">Sin ventas en este período.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-carbon/50">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-right">Cantidad</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.top_productos.map((p) => (
                  <tr key={p.nombre} className="border-t border-carbon/5">
                    <td className="py-1.5">{p.nombre}</td>
                    <td className="py-1.5 text-right">{qty(p.cantidad)}</td>
                    <td className="py-1.5 text-right">{money(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={`${card} p-5`}>
          <h3 className="text-lg">Medios de pago</h3>
          <div className="mt-3">
            <HorizontalBars
              name="Ventas"
              rows={report.por_metodo.map((m) => ({ label: paymentLabel(m.metodo), total: Number(m.total) }))}
            />
          </div>
        </div>

        <div className={`${card} p-5 lg:col-span-2`}>
          <h3 className="text-lg">Gastos por categoría</h3>
          <div className="mt-3">
            <HorizontalBars
              name="Gastos"
              color="#2F6FB0"
              rows={report.gastos_por_categoria.map((c) => ({ label: c.categoria, total: Number(c.total) }))}
            />
          </div>
        </div>
      </div>
    </>
  )
}
