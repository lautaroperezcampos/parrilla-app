import { supabase } from '../supabaseClient'

// Mesas, pedidos y ventas. Un pedido que se cobra ES la venta.

const ACTIVE_STATUSES = '(pagado,cancelado)'

export async function getTables({ includeInactive = false } = {}) {
  let query = supabase.from('tables').select('*').order('number')
  if (!includeInactive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTable({ number, seats }) {
  const { error } = await supabase.from('tables').insert({ number, seats })
  if (error) {
    if (error.code === '23505') throw new Error(`Ya existe la mesa ${number}`)
    throw error
  }
}

export async function updateTable(id, changes) {
  const { error } = await supabase.from('tables').update(changes).eq('id', id)
  if (error) throw error
}

// Pedidos que todavía no se cobraron ni cancelaron (de mesa y de mostrador).
export async function getActiveOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(id)')
    .not('status', 'in', ACTIVE_STATUSES)
    .order('opened_at')
  if (error) throw error
  return data
}

export async function getOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, tables(number), order_items(*)')
    .eq('id', id)
    .order('id', { referencedTable: 'order_items' })
    .single()
  if (error) throw error
  return data
}

// tableId null = venta de mostrador.
export async function openOrder(tableId) {
  const { data, error } = await supabase
    .from('orders')
    .insert({ table_id: tableId })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Esa mesa ya tiene un pedido abierto. Actualizá la pantalla.')
    throw error
  }
  return data
}

export async function setOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .not('status', 'in', ACTIVE_STATUSES)
  if (error) throw error
}

export async function setOrderNotes(id, notes) {
  const { error } = await supabase.from('orders').update({ notes: notes || null }).eq('id', id)
  if (error) throw error
}

export async function cancelOrder(id) {
  return setOrderStatus(id, 'cancelado')
}

// Borra un pedido que se abrió pero nunca tuvo productos.
export async function discardEmptyOrder(id) {
  const { count, error: countError } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', id)
  if (countError) throw countError
  if (count > 0) return
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

export async function addOrderItem(orderId, product) {
  const { error } = await supabase.from('order_items').insert({
    order_id: orderId,
    product_id: product.id,
    product_name: product.name,
    quantity: 1,
    unit_price: product.sale_price,
    unit_cost: product.cost_price
  })
  if (error) throw error
}

export async function updateOrderItemQuantity(itemId, quantity) {
  const { error } = await supabase.from('order_items').update({ quantity }).eq('id', itemId)
  if (error) throw error
}

export async function removeOrderItem(itemId) {
  const { error } = await supabase.from('order_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function payOrder(orderId, paymentMethod) {
  const { data, error } = await supabase.rpc('pay_order', {
    p_order_id: orderId,
    p_payment_method: paymentMethod
  })
  if (error) throw error
  return data
}

export async function voidOrder(orderId, reason) {
  const { data, error } = await supabase.rpc('void_order', {
    p_order_id: orderId,
    p_reason: reason || null
  })
  if (error) throw error
  return data
}

// Ventas cobradas o anuladas en un rango de fechas y horas.
export async function getSales({ start, end, paymentMethod }) {
  let query = supabase
    .from('orders')
    .select('*, tables(number)')
    .in('status', ['pagado', 'cancelado'])
    .not('paid_at', 'is', null)
    .gte('paid_at', start)
    .lt('paid_at', end)
    .order('paid_at', { ascending: false })
    .limit(1000)
  if (paymentMethod) query = query.eq('payment_method', paymentMethod)
  const { data, error } = await query
  if (error) throw error
  return data
}

// Escucha cambios en pedidos e ítems (de cualquier dispositivo) y avisa.
export function subscribeToOrders(onChange) {
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
