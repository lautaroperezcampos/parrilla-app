import { addDays, firstOfMonthISO, parseISODate, toISODate, todayISO } from '../lib/format.js'
import { inputClass } from '../lib/ui.js'

// Atajos de período + fechas "desde / hasta". value = { from, to } en "YYYY-MM-DD".
function presets() {
  const today = todayISO()
  const firstThisMonth = firstOfMonthISO()
  const lastMonth = parseISODate(firstThisMonth)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  return [
    { label: 'Hoy', from: today, to: today },
    { label: 'Ayer', from: addDays(today, -1), to: addDays(today, -1) },
    { label: '7 días', from: addDays(today, -6), to: today },
    { label: 'Este mes', from: firstThisMonth, to: today },
    { label: 'Mes pasado', from: toISODate(lastMonth), to: addDays(firstThisMonth, -1) }
  ]
}

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1.5">
        {presets().map((p) => {
          const active = p.from === value.from && p.to === value.to
          return (
            <button
              key={p.label}
              onClick={() => onChange({ from: p.from, to: p.to })}
              className={`rounded-full px-3 py-1.5 text-xs ${
                active ? 'bg-carbon text-crema' : 'bg-white text-carbon/70 ring-1 ring-carbon/10'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          className={`${inputClass} w-auto`}
          value={value.from}
          max={value.to}
          onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
        />
        <span className="text-xs text-carbon/50">a</span>
        <input
          type="date"
          className={`${inputClass} w-auto`}
          value={value.to}
          min={value.from}
          onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  )
}
