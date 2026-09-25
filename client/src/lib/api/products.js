import { supabase } from '../supabaseClient'

// Todas las funciones que hablan con la tabla "products" y "stock_movements"
// viven acá, para no repetir código de conexión en cada pantalla.

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', 'producto')
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
  const { data, error } = await supabase
    .from('products')
    .update(changes)
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

export async function registerStockMovement({ productId, type, quantity, reason, currentStock }) {
  const stockBefore = currentStock
  const stockAfter = type === 'entrada' ? stockBefore + quantity : stockBefore - quantity

  if (stockAfter < 0) {
    throw new Error('No podés sacar más stock del que hay disponible')
  }

  const { error: moveError } = await supabase.from('stock_movements').insert({
    product_id: productId,
    type,
    quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    reason
  })
  if (moveError) throw moveError

  const { data, error } = await supabase
    .from('products')
    .update({ stock: stockAfter })
    .eq('id', productId)
    .select()
    .single()
  if (error) throw error
  return data
}