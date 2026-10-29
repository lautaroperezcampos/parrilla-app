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
import StockHistoryModal from '../components/StockHistoryModal.jsx'
import { money, qty } from '../lib/format.js'
import { btnPrimary, btnSmall, card, emptyBox, inputClass } from '../lib/ui.js'

export default function Stock() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)

  const [editingProduct, setEditingProduct] = useState(null) // null=cerrado, {}=nuevo, {...}=editar
  const [movement, setMovement] = useState(null) // { product, type }
  const [historyOf, setHistoryOf] = useState(null)

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
    try {
      await deleteProduct(product.id)
      await loadAll()
    } catch (err) {
      setErrorMsg('No se pudo eliminar: ' + err.message)
    }
  }

  async function handleConfirmMovement(quantity, reason) {
    await registerStockMovement({
      productId: movement.product.id,
      type: movement.type,
      quantity,
      reason
    })
    setMovement(null)
    await loadAll()
  }

  function estadoStock(p) {
    if (!p.track_stock) return null
    if (p.stock <= 0) return { label: 'Sin stock', className: 'bg-estado-ocupada/10 text-estado-ocupada' }
    if (p.stock <= p.min_stock) return { label: 'Stock bajo', className: 'bg-estado-preparacion/10 text-estado-preparacion' }
    return null
  }

  const visible = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.trim().toLowerCase()) && (!onlyLow || estadoStock(p))
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-carbon">Stock</h2>
          <p className="mt-1 text-sm text-carbon/60">
            Productos, cantidades disponibles y movimientos.
          </p>
        </div>
        <button onClick={() => setEditingProduct({})} className={btnPrimary}>
          + Nuevo producto
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-carbon/70">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Solo stock bajo
        </label>
      </div>

      {errorMsg && <p className="mt-4 text-sm text-estado-ocupada">{errorMsg}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-carbon/50">Cargando...</p>
      ) : products.length === 0 ? (
        <div className={`mt-6 ${emptyBox}`}>
          Todavía no cargaste ningún producto. Tocá "+ Nuevo producto" para empezar.
        </div>
      ) : (
        <div className={`mt-4 overflow-x-auto ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon/10 text-left text-xs text-carbon/50">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Compra</th>
                <th className="px-4 py-3">Venta</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const estado = estadoStock(p)
                return (
                  <tr key={p.id} className="border-b border-carbon/5 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {p.name}
                      {!p.is_sellable && <span className="ml-2 text-xs text-carbon/40">(insumo)</span>}
                    </td>
                    <td className="px-4 py-3 text-carbon/60">{p.categories?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {p.track_stock ? `${qty(p.stock)} ${p.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-carbon/60">{money(p.cost_price)}</td>
                    <td className="px-4 py-3">{p.is_sellable ? money(p.sale_price) : '—'}</td>
                    <td className="px-4 py-3">
                      {estado && (
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${estado.className}`}>
                          {estado.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {p.track_stock && (
                          <>
                            <button onClick={() => setMovement({ product: p, type: 'entrada' })} className={btnSmall}>
                              + Entrada
                            </button>
                            <button onClick={() => setMovement({ product: p, type: 'salida' })} className={btnSmall}>
                              − Salida
                            </button>
                            <button onClick={() => setMovement({ product: p, type: 'ajuste' })} className={btnSmall}>
                              Ajustar
                            </button>
                            <button onClick={() => setHistoryOf(p)} className={btnSmall}>
                              Historial
                            </button>
                          </>
                        )}
                        <button onClick={() => setEditingProduct(p)} className={btnSmall}>
                          Editar
                        </button>
                        <button onClick={() => handleDelete(p)} className={`${btnSmall} text-estado-ocupada`}>
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

      {historyOf && <StockHistoryModal product={historyOf} onClose={() => setHistoryOf(null)} />}
    </div>
  )
}
