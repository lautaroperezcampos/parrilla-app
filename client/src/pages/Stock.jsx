import { useEffect, useState } from 'react'
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  registerStockMovement
} from '../lib/api/products.js'
import ProductFormModal from '../components/ProductFormModal.jsx'
import StockMovementModal from '../components/StockMovementModal.jsx'

export default function Stock() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const [editingProduct, setEditingProduct] = useState(null) // null=cerrado, {}=nuevo, {...}=editar
  const [movement, setMovement] = useState(null) // { product, type }

  async function loadAll() {
    setLoading(true)
    setErrorMsg('')
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      setErrorMsg('No se pudo cargar el stock: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleSaveProduct(formData) {
    if (editingProduct?.id) {
      await updateProduct(editingProduct.id, formData)
    } else {
      await createProduct(formData)
    }
    setEditingProduct(null)
    await loadAll()
  }

  async function handleDelete(product) {
    if (!confirm(`¿Seguro que querés eliminar "${product.name}"?`)) return
    await deleteProduct(product.id)
    await loadAll()
  }

  async function handleConfirmMovement(quantity, reason) {
    await registerStockMovement({
      productId: movement.product.id,
      type: movement.type,
      quantity,
      reason,
      currentStock: movement.product.stock
    })
    setMovement(null)
    await loadAll()
  }

  function estadoStock(p) {
    if (p.stock <= 0) return { label: 'Sin stock', className: 'bg-estado-ocupada/10 text-estado-ocupada' }
    if (p.stock <= p.min_stock) return { label: 'Stock bajo', className: 'bg-estado-preparacion/10 text-estado-preparacion' }
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-carbon">Stock</h2>
          <p className="mt-1 text-sm text-carbon/60">
            Productos, cantidades disponibles y movimientos.
          </p>
        </div>
        <button
          onClick={() => setEditingProduct({})}
          className="rounded-md bg-brasa px-4 py-2.5 text-sm font-medium text-white hover:bg-brasa-dark"
        >
          + Nuevo producto
        </button>
      </div>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : products.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-carbon/20 p-10 text-center text-sm text-carbon/50">
          Todavía no cargaste ningún producto. Tocá "+ Nuevo producto" para empezar.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-carbon/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon/10 text-left text-xs text-carbon/50">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Precio venta</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const estado = estadoStock(p)
                return (
                  <tr key={p.id} className="border-b border-carbon/5 last:border-0">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-carbon/60">{p.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.stock} {p.unit}
                    </td>
                    <td className="px-4 py-3">${p.sale_price}</td>
                    <td className="px-4 py-3">
                      {estado && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estado.className}`}>
                          {estado.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => setMovement({ product: p, type: 'entrada' })}
                          className="rounded border border-carbon/15 px-2 py-1 hover:bg-crema"
                        >
                          + Entrada
                        </button>
                        <button
                          onClick={() => setMovement({ product: p, type: 'salida' })}
                          className="rounded border border-carbon/15 px-2 py-1 hover:bg-crema"
                        >
                          − Salida
                        </button>
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="rounded border border-carbon/15 px-2 py-1 hover:bg-crema"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded border border-carbon/15 px-2 py-1 text-estado-ocupada hover:bg-crema"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingProduct !== null && (
        <ProductFormModal
          product={editingProduct.id ? editingProduct : null}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {movement && (
        <StockMovementModal
          product={movement.product}
          type={movement.type}
          onConfirm={handleConfirmMovement}
          onClose={() => setMovement(null)}
        />
      )}
    </div>
  )
}