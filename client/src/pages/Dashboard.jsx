import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard.jsx'
import { SalesExpensesChart } from '../components/Charts.jsx'
import { getCashSummary, getOpenCashSession, getReport } from '../lib/api/cash.js'
import { getActiveOrders, getTables } from '../lib/api/orders.js'
import { getProducts } from '../lib/api/products.js'
import { addDays, money, qty, todayISO } from '../lib/format.js'
import { card } from '../lib/ui.js'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      const today = todayISO()
      const weekStart = addDays(today, -6)
      const [todayReport, weekReport, cash, tables, orders, products] = await Promise.all([
        getReport(today, today),
        getReport(weekStart, today),
        getOpenCashSession(),
        getTables(),
        getActiveOrders(),
        getProducts()
      ])
      const cashSummary = cash ? await getCashSummary(cash.id) : null
      const lowStock = products.filter((p) => p.track_stock && Number(p.stock) <= Number(p.min_stock))
      setData({
        today,
        weekStart,
        todayReport,
        weekReport,
        cashSummary,
        tablesCount: tables.length,
        occupied: orders.filter((o) => o.table_id).length,
        lowStock
      })
    }
    load().catch((err) => setErrorMsg('No se pudo cargar el resumen: ' + err.message))
  }, [])

  if (errorMsg) return <p className="text-sm text-estado-ocupada">{errorMsg}</p>
  if (!data) return <p className="text-sm text-carbon/50">Cargando...</p>

  const { todayReport, weekReport, cashSummary, lowStock } = data
  const profit = Number(todayReport.ventas_total) - Number(todayReport.gastos_total)

  return (
    <div>
      <h2 className="text-2xl text-carbon">Hoy</h2>
      <p className="mt-1 text-sm text-carbon/60">Resumen del día.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard
          label={`Ventas de hoy (${todayReport.ventas_cantidad})`}
          value={money(todayReport.ventas_total)}
          accent
        />
        <StatCard label="Gastos de hoy" value={money(todayReport.gastos_total)} />
        <StatCard label="Ventas − gastos" value={money(profit)} />
        <StatCard
          label="Efectivo en caja"
          value={cashSummary ? money(cashSummary.esperado) : 'Caja cerrada'}
        />
        <StatCard label="Mesas ocupadas" value={`${data.occupied} / ${data.tablesCount}`} />
        <StatCard label="Stock bajo" value={`${lowStock.length} productos`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className={`${card} p-5`}>
          <h3 className="text-lg">Últimos 7 días</h3>
          <div className="mt-3">
            <SalesExpensesChart
              from={data.weekStart}
              to={data.today}
              ventasPorDia={weekReport.ventas_por_dia}
              gastosPorDia={weekReport.gastos_por_dia}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${card} p-5`}>
            <h3 className="text-lg">Lo más vendido hoy</h3>
            {todayReport.top_productos.length === 0 ? (
              <p className="mt-2 text-sm text-carbon/50">Todavía no hay ventas hoy.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {todayReport.top_productos.slice(0, 5).map((p) => (
                  <li key={p.nombre} className="flex justify-between gap-2">
                    <span className="truncate">
                      {qty(p.cantidad)} × {p.nombre}
                    </span>
                    <span className="text-carbon/60">{money(p.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${card} p-5`}>
            <h3 className="text-lg">Reponer</h3>
            {lowStock.length === 0 ? (
              <p className="mt-2 text-sm text-carbon/50">Todo el stock está bien.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {lowStock.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className={Number(p.stock) <= 0 ? 'text-estado-ocupada' : 'text-estado-preparacion'}>
                      {qty(p.stock)} {p.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/stock" className="mt-3 inline-block text-xs text-brasa underline">
              Ir a Stock
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
