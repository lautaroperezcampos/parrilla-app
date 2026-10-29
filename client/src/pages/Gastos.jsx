import { useCallback, useEffect, useState } from 'react'
import ExpenseFormModal from '../components/ExpenseFormModal.jsx'
import DateRangeFilter from '../components/DateRangeFilter.jsx'
import { createExpense, deleteExpense, getExpenses, getSuppliers, updateExpense } from '../lib/api/expenses.js'
import { getCategories, getProducts } from '../lib/api/products.js'
import { getOpenCashSession } from '../lib/api/cash.js'
import { dateLabel, firstOfMonthISO, money, paymentLabel, todayISO } from '../lib/format.js'
import { btnPrimary, btnSmall, card, emptyBox, inputClass } from '../lib/ui.js'

export default function Gastos() {
  const [range, setRange] = useState({ from: firstOfMonthISO(), to: todayISO() })
  const [categoryId, setCategoryId] = useState('')
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [cashOpen, setCashOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [editing, setEditing] = useState(null) // null=cerrado, {}=nuevo, {...}=editar

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      setExpenses(await getExpenses({ from: range.from, to: range.to, categoryId }))
    } catch (err) {
      setErrorMsg('No se pudieron cargar los gastos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [range, categoryId])

  async function loadOptions() {
    const [cats, sups, prods, cash] = await Promise.all([
      getCategories('gasto'),
      getSuppliers(),
      getProducts(),
      getOpenCashSession()
    ])
    setCategories(cats)
    setSuppliers(sups)
    setProducts(prods)
    setCashOpen(Boolean(cash))
  }

  useEffect(() => {
    loadOptions().catch((err) => setErrorMsg(err.message))
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  async function handleSave(form) {
    if (editing?.id) await updateExpense(editing.id, form)
    else await createExpense(form)
    setEditing(null)
    await Promise.all([loadExpenses(), loadOptions()])
  }

  async function handleDelete(expense) {
    if (!confirm(`¿Eliminar el gasto "${expense.description}"? (si sumó stock, ese stock no se descuenta)`)) return
    try {
      await deleteExpense(expense.id)
      await loadExpenses()
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  async function handleOpenNew() {
    // Refresca si la caja está abierta justo antes de cargar.
    try {
      setCashOpen(Boolean(await getOpenCashSession()))
    } catch {
      // se usa el último valor conocido
    }
    setEditing({})
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-carbon">Gastos</h2>
          <p className="mt-1 text-sm text-carbon/60">Compras, servicios, sueldos y todo lo que sale.</p>
        </div>
        <button onClick={handleOpenNew} className={btnPrimary}>
          + Nuevo gasto
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        <select
          className={`${inputClass} w-auto`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm">
        <span className="text-carbon/60">Total: </span>
        <strong>{money(total)}</strong> ({expenses.length} gastos)
      </p>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : expenses.length === 0 ? (
        <div className={`mt-4 ${emptyBox}`}>No hay gastos en este período.</div>
      ) : (
        <div className={`mt-4 overflow-x-auto ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon/10 text-left text-xs text-carbon/50">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const locked = e.cash_sessions?.status === 'cerrada'
                return (
                  <tr key={e.id} className="border-b border-carbon/5 last:border-0">
                    <td className="px-4 py-3">{dateLabel(e.date)}</td>
                    <td className="px-4 py-3 font-medium">{e.description}</td>
                    <td className="px-4 py-3 text-carbon/60">{e.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-carbon/60">{e.suppliers?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-carbon/60">
                      {e.paid_from_cash ? 'Caja' : paymentLabel(e.payment_method)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{money(e.amount)}</td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span className="text-xs text-carbon/40" title="Se pagó desde una caja ya cerrada">
                          Caja cerrada
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditing(e)} className={btnSmall}>
                            Editar
                          </button>
                          <button onClick={() => handleDelete(e)} className={`${btnSmall} text-estado-ocupada`}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <ExpenseFormModal
          expense={editing.id ? editing : null}
          categories={categories}
          suppliers={suppliers}
          products={products}
          cashOpen={cashOpen}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
