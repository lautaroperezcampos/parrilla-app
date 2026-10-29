import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { addDays, dateLabel, money } from '../lib/format.js'

// Colores de las series (validados para daltonismo): ventas = brasa,
// gastos = azul. El texto queda siempre en el color de texto normal.
const COLOR_VENTAS = '#D9531E'
const COLOR_GASTOS = '#2F6FB0'
const AXIS = { fontSize: 11, fill: 'rgba(31,26,23,0.55)' }

function shortMoney(value) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${value}`
}

const tooltipProps = {
  formatter: (value, name) => [money(value), name],
  contentStyle: { borderRadius: 6, border: '1px solid rgba(31,26,23,0.1)', fontSize: 12 },
  cursor: { fill: 'rgba(31,26,23,0.05)' }
}

// Ventas y gastos por día, con todos los días del rango (aunque estén en cero).
export function SalesExpensesChart({ from, to, ventasPorDia, gastosPorDia }) {
  const ventas = Object.fromEntries(ventasPorDia.map((d) => [d.dia, Number(d.total)]))
  const gastos = Object.fromEntries(gastosPorDia.map((d) => [d.dia, Number(d.total)]))
  const data = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    data.push({ dia: dateLabel(day), Ventas: ventas[day] ?? 0, Gastos: gastos[day] ?? 0 })
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(31,26,23,0.08)" />
        <XAxis dataKey="dia" tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={shortMoney} width={48} />
        <Tooltip {...tooltipProps} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Ventas" fill={COLOR_VENTAS} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Gastos" fill={COLOR_GASTOS} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Barras horizontales de una sola serie (medios de pago, categorías).
// rows: [{ label, total }]
export function HorizontalBars({ rows, name, color = COLOR_VENTAS }) {
  if (rows.length === 0) return <p className="text-sm text-carbon/50">Sin datos en este período.</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 34 + 20)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={110} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="total" name={name} fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
