import StatCard from '../components/StatCard.jsx'

// Por ahora los valores están en cero: en la Fase 5 los vamos a
// calcular con datos reales de Supabase (ventas, gastos, stock, etc).
export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl text-carbon">Hoy</h2>
      <p className="mt-1 text-sm text-carbon/60">
        Resumen del día — esto se va a completar solo cuando carguemos ventas
        y gastos en las próximas fases.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Ventas de hoy" value="$0" accent />
        <StatCard label="Gastos de hoy" value="$0" />
        <StatCard label="Ganancia estimada" value="$0" />
        <StatCard label="Dinero en caja" value="$0" />
        <StatCard label="Mesas ocupadas" value="0 / 0" />
        <StatCard label="Stock bajo" value="0 productos" />
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-carbon/20 p-8 text-center text-sm text-carbon/50">
        Los gráficos de ventas, gastos y productos más vendidos van a
        aparecer acá en la Fase 5, cuando ya tengamos datos cargados.
      </div>
    </div>
  )
}
