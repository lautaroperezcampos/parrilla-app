// Tarjeta simple para mostrar un número clave (ventas de hoy, caja, etc).
// value ya viene formateado como texto desde quien use el componente.
export default function StatCard({ label, value, accent = false }) {
  return (
    <div className="rounded-lg border border-carbon/10 bg-white p-5">
      <p className="text-sm text-carbon/60">{label}</p>
      <p
        className={`mt-2 font-display text-2xl ${
          accent ? 'text-brasa' : 'text-carbon'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
