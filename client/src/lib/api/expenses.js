import { supabase } from '../supabaseClient'

// Gastos y proveedores.

export async function getExpenses({ from, to, categoryId, supplierId }) {
  let query = supabase
    .from('expenses')
    .select('*, categories(name), suppliers(name), cash_sessions(status)')
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(1000)
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (supplierId) query = query.eq('supplier_id', supplierId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createExpense(expense) {
  const { data, error } = await supabase.rpc('create_expense', {
    p_date: expense.date,
    p_description: expense.description,
    p_amount: expense.amount,
    p_category_id: expense.category_id || null,
    p_supplier_id: expense.supplier_id || null,
    p_payment_method: expense.payment_method,
    p_paid_from_cash: expense.paid_from_cash,
    p_notes: expense.notes || null,
    p_product_id: expense.product_id || null,
    p_quantity: expense.product_id ? expense.quantity : null
  })
  if (error) throw error
  return data
}

// Solo datos descriptivos: si se pagó con la caja o qué entró al stock
// no se cambia después de creado.
export async function updateExpense(id, expense) {
  const { error } = await supabase
    .from('expenses')
    .update({
      date: expense.date,
      description: expense.description.trim(),
      amount: expense.amount,
      category_id: expense.category_id || null,
      supplier_id: expense.supplier_id || null,
      ...(expense.paid_from_cash ? {} : { payment_method: expense.payment_method }),
      notes: expense.notes || null
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function getSuppliers({ includeInactive = false } = {}) {
  let query = supabase.from('suppliers').select('*').order('name')
  if (!includeInactive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function saveSupplier(id, supplier) {
  const payload = {
    name: supplier.name.trim(),
    phone: supplier.phone || null,
    products_sold: supplier.products_sold || null,
    notes: supplier.notes || null
  }
  const { error } = id
    ? await supabase.from('suppliers').update(payload).eq('id', id)
    : await supabase.from('suppliers').insert(payload)
  if (error) throw error
}

export async function deactivateSupplier(id) {
  const { error } = await supabase.from('suppliers').update({ active: false }).eq('id', id)
  if (error) throw error
}

// Total comprado y última compra de cada proveedor.
export async function getSupplierTotals() {
  const { data, error } = await supabase
    .from('expenses')
    .select('supplier_id, amount, date')
    .not('supplier_id', 'is', null)
  if (error) throw error
  const totals = {}
  for (const e of data) {
    const t = (totals[e.supplier_id] ??= { total: 0, count: 0, last: null })
    t.total += Number(e.amount)
    t.count += 1
    if (!t.last || e.date > t.last) t.last = e.date
  }
  return totals
}
