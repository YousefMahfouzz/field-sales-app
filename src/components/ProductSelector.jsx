import { useState } from 'react'

export default function ProductSelector({ products, onAdd, addedItems = [] }) {
  const [search, setSearch] = useState('')
  const [qty, setQty] = useState({})
  const [price, setPrice] = useState({})

  // Show ALL products — not just in-stock (rep decides what to sell)
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (product) => {
    const q = parseInt(qty[product.id]) || 1
    const p = parseFloat(price[product.id] ?? product.sell_price) || product.sell_price
    onAdd({ product, qty: q, unit_price: p, unit_cost: product.cost })
    setQty(prev => ({ ...prev, [product.id]: '' }))
  }

  const isAdded = (productId) => addedItems.some(i => i.product_id === productId)

  return (
    <div>
      <input
        type="search" placeholder="Search products..." value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, marginBottom: 10, background: 'var(--gray-light)' }}
      />

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p className="text-sm text-muted">
            {products.length === 0
              ? '📦 No products yet — add products in the Products tab first.'
              : 'No products match your search.'}
          </p>
        </div>
      )}

      {filtered.map(product => {
        const added = isAdded(product.id)
        const addedItem = addedItems.find(i => i.product_id === product.id)
        return (
          <div key={product.id} style={{
            border: `1.5px solid ${added ? '#bbf7d0' : 'var(--border)'}`,
            borderRadius: 10, padding: '10px 12px', marginBottom: 8,
            background: added ? '#f0fdf4' : 'white',
          }}>
            <div className="flex gap-8 items-center" style={{ marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--gray-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</p>
                  {added && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '1px 7px', borderRadius: 10 }}>✓ ×{addedItem?.qty}</span>}
                </div>
                <p className="text-xs" style={{ color: 'var(--green)' }}>
                  ${product.sell_price?.toFixed(2)} / {product.unit}
                  {product.stock_qty > 0
                    ? <span style={{ color: 'var(--text-muted)' }}> · {product.stock_qty} in stock</span>
                    : <span style={{ color: 'var(--amber)' }}> · ⚠️ Out of stock</span>}
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-center">
              <div style={{ flex: 1 }}>
                <p className="text-xs text-muted" style={{ marginBottom: 3 }}>Qty</p>
                <input
                  type="number" min="1"
                  value={qty[product.id] || ''}
                  onChange={e => setQty(prev => ({ ...prev, [product.id]: e.target.value }))}
                  placeholder="1"
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 15 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p className="text-xs text-muted" style={{ marginBottom: 3 }}>Price ($)</p>
                <input
                  type="number" min="0" step="0.01"
                  value={price[product.id] ?? product.sell_price}
                  onChange={e => setPrice(prev => ({ ...prev, [product.id]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 15 }}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleAdd(product)} style={{ flexShrink: 0, marginTop: 18 }}>
                {added ? '+ More' : 'Add'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
