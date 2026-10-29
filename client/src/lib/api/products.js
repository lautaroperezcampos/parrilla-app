import { supabase } from '../supabaseClient'

// Todas las funciones que hablan con la tabla "products" y "stock_movements"
// viven acá, para no repetir código de conexión en cada pantalla.

export async function getCategories(type = 'producto') {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .order('name')
  if (error) throw error
  return data
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(id, changes) {
  // El stock nunca se cambia editando el producto: solo con movimientos,
  // así queda registrado en el historial.
  const { stock, ...rest } = changes
  const { data, error } = await supabase
    .from('products')
    .update(rest)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  // No lo borramos de verdad: lo marcamos inactivo.
  // Así, si ya se vendió alguna vez, esa venta vieja no queda rota.
  const { error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', id)
  if (error) throw error
}

// type: 'entrada' | 'salida' | 'ajuste'. En 'ajuste', quantity es el
// stock contado (el nuevo total). Se hace todo junto en la base.
export async function registerStockMovement({ productId, type, quantity, reason }) {
  const { data, error } = await supabase.rpc('register_stock_movement', {
    p_product_id: productId,
    p_type: type,
    p_quantity: quantity,
    p_reason: reason || null
  })
  if (error) throw error
  return data
}

export async function getStockMovements(productId) {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}
