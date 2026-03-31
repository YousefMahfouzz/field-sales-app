import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { supabase } from '../lib/supabase'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, addStock, deleteProduct } = useProducts()
  const product = products.find(p => p.id === id)

  const [movements, setMovements] = useState([])
  const [showAddStock, setShowAddStock] = useState(false)
  const [form, setForm] = useState({ qty: '', costPerUnit: '', source: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [previewAvg, setPreviewAvg] = useState(null)

  useEffect(() => {
    if (!id) return
    supabase.from('stock_movements').select('*')
      .eq('product_id', id).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setMovements(data || []))
  }, [id])

  // Live preview of new avg cost as user types
  useEffect(() => {
    if (!product || !form.qty || !form.costPerUnit) { setPreviewAvg(null); return }
    const qty = parseInt(form.qty) || 0
    const cpu = parseFloat(form.costPerUnit) || 0
    const curQty = product.stock_qty || 0
    const curAvg = product.avg_cost ?? product.cost ?? 0
    const totalQty = curQty + qty
    if (totalQty > 0 && qty > 0) {
      const newAvg = ((curQty * curAvg) + (qty * cpu)) / totalQty
      setPreviewAvg(Math.round(newAvg * 100) / 100)
    } else {
      setPreviewAvg(null)
    }
  }, [form.qty, form.costPerUnit, product])

  if (!product) return (
    <div className="page" style={{ textAlign:'center', paddingTop:80 }}>
      <p className="text-muted">Product not found.</p>
      <button className="btn btn-ghost" onClick={() => navigate('/products')} style={{ marginTop:16 }}>Back</button>
    </div>
  )

  const effectiveCost = product.avg_cost ?? product.cost ?? 0
  const profit = product.sell_price - effectiveCost
  const margin = product.sell_price > 0 ? ((profit / product.sell_price) * 100) : 0
  const stockCostValue = (product.stock_qty || 0) * effectiveCost
  const stockSellValue = (product.stock_qty || 0) * product.sell_price
  const stockColor = product.stock_qty <= 0 ? 'var(--red)' : product.stock_qty <= 5 ? 'var(--amber)' : 'var(--green)'

  const handleAddStock = async () => {
    const qty = parseInt(form.qty)
    if (!qty || qty <= 0) return
    setLoading(true)
    try {
      const cpu = form.costPerUnit ? parseFloat(form.costPerUnit) : null
      await addStock(product.id, qty, form.note, cpu, form.source || null)
      const { data } = await supabase.from('stock_movements').select('*')
        .eq('product_id', id).order('created_at', { ascending: false }).limit(30)
      setMovements(data || [])
      setShowAddStock(false)
      setForm({ qty:'', costPerUnit:'', source:'', note:'' })
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:18, flex:1, textAlign:'center' }}>{product.name}</h1>
        <button onClick={() => navigate(`/products/${id}/edit`)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer' }}>✏️</button>
      </div>

      <div className="page" style={{ paddingTop:14 }}>

        {/* Image + name card */}
        <div className="card" style={{ marginBottom:10 }}>
          <div className="flex gap-12 items-center" style={{ marginBottom:14 }}>
            <div style={{ width:72, height:72, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--gray-light)', fontSize:32 }}>
              {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : '📦'}
            </div>
            <div style={{ flex:1 }}>
              <h2 style={{ fontSize:18 }}>{product.name}</h2>
              {product.brand && <p className="text-xs text-muted">by {product.brand}</p>}
              {product.source && <p className="text-xs text-muted">Source: {product.source}</p>}
              {product.category && <p className="text-xs text-muted">{product.category}</p>}
              {product.description && <p className="text-sm text-muted" style={{ marginTop:4 }}>{product.description}</p>}
            </div>
          </div>

          {/* Pricing grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', marginBottom:12 }}>
            {[
              { label:'Avg Cost', value:`$${effectiveCost.toFixed(2)}`, sub: product.avg_cost != null && product.avg_cost !== product.cost ? `(orig $${product.cost.toFixed(2)})` : null, color:'var(--text)' },
              { label:'Sell Price', value:`$${product.sell_price.toFixed(2)}`, color:'var(--green)' },
              { label:'Profit/unit', value:`$${profit.toFixed(2)}`, sub:`${margin.toFixed(0)}% margin`, color: profit >= 0 ? 'var(--green)' : 'var(--red)' },
            ].map((col, i) => (
              <div key={i} style={{ textAlign:'center', padding:'12px 4px', borderLeft: i>0 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{col.label}</p>
                <p style={{ fontWeight:800, fontSize:15, color:col.color }}>{col.value}</p>
                {col.sub && <p style={{ fontSize:10, color:'var(--text-muted)' }}>{col.sub}</p>}
              </div>
            ))}
          </div>

          {/* Stock + value */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>Current Stock</p>
              <p style={{ fontWeight:900, fontSize:32, color:stockColor, lineHeight:1 }}>
                {product.stock_qty}
                <span style={{ fontSize:14, fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>{product.unit}s</span>
              </p>
              <div style={{ marginTop:6, display:'flex', gap:12 }}>
                <div>
                  <p style={{ fontSize:10, color:'var(--text-muted)' }}>Cost value</p>
                  <p style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>${stockCostValue.toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ fontSize:10, color:'var(--text-muted)' }}>Sell value</p>
                  <p style={{ fontWeight:700, fontSize:13, color:'var(--green)' }}>${stockSellValue.toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ fontSize:10, color:'var(--text-muted)' }}>Potential profit</p>
                  <p style={{ fontWeight:700, fontSize:13, color: stockSellValue - stockCostValue >= 0 ? 'var(--blue)' : 'var(--red)' }}>
                    ${(stockSellValue - stockCostValue).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddStock(true)}>+ Add Stock</button>
          </div>
        </div>

        {/* Stock history */}
        <p className="section-header">Stock History</p>
        {movements.length === 0 && <p className="text-sm text-muted" style={{ marginBottom:16 }}>No stock movements yet.</p>}
        {movements.map(m => {
          const isIn = m.type === 'in'
          const isSold = m.type === 'sold' || m.type === 'out'
          return (
            <div key={m.id} className="card" style={{ marginBottom:8, padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                      background: isIn ? 'var(--green-light)' : isSold ? 'var(--red-light)' : 'var(--gray-light)',
                      color: isIn ? 'var(--green)' : isSold ? 'var(--red)' : 'var(--gray)',
                    }}>
                      {isIn ? '📥 In' : isSold ? '🛒 Sold' : '🔄 Adj'}
                    </span>
                    <span style={{ fontWeight:700, fontSize:16, color: isIn ? 'var(--green)' : 'var(--red)' }}>
                      {isIn ? '+' : '-'}{Math.abs(m.qty)} {product.unit}s
                    </span>
                  </div>
                  {m.cost_per_unit != null && (
                    <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                      💵 ${m.cost_per_unit.toFixed(2)}/unit
                      {m.total_cost != null && ` · $${m.total_cost.toFixed(2)} total`}
                    </p>
                  )}
                  {m.source && <p style={{ fontSize:12, color:'var(--text-muted)' }}>📦 {m.source}</p>}
                  {m.note && <p style={{ fontSize:12, color:'var(--text-muted)' }}>{m.note}</p>}
                </div>
                <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'right', flexShrink:0, marginLeft:8 }}>
                  {new Date(m.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}<br/>
                  {new Date(m.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
            </div>
          )
        })}

        {/* Danger zone */}
        <p className="section-header" style={{ color:'var(--red)' }}>Danger Zone</p>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)', borderColor:'var(--red)' }}
          onClick={async () => {
            if (window.confirm('Delete this product?')) {
              await deleteProduct(id)
              navigate('/products')
            }
          }}>
          🗑️ Delete Product
        </button>
      </div>

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="modal-overlay" onClick={() => setShowAddStock(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom:4 }}>Add Stock</h2>
            <p className="text-sm text-muted" style={{ marginBottom:16 }}>{product.name}</p>

            {/* Qty */}
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" type="number" min="1" value={form.qty}
                onChange={e => setForm(f=>({...f, qty:e.target.value}))}
                placeholder="e.g. 50" autoFocus style={{ fontSize:20, textAlign:'center' }} />
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[10,25,50,100].map(n => (
                <button key={n} type="button" className="btn btn-ghost btn-sm" style={{ flex:1 }}
                  onClick={() => setForm(f=>({...f, qty:String(n)}))}>
                  {n}
                </button>
              ))}
            </div>

            {/* Cost this batch */}
            <div className="form-group">
              <label className="form-label">
                Cost per unit this time
                <span className="text-muted" style={{ fontWeight:400, fontSize:12 }}> (optional)</span>
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontWeight:700 }}>$</span>
                <input className="form-input" type="number" min="0" step="0.01"
                  value={form.costPerUnit}
                  onChange={e => setForm(f=>({...f, costPerUnit:e.target.value}))}
                  placeholder={`Last: $${effectiveCost.toFixed(2)}`}
                  style={{ paddingLeft:26 }} />
              </div>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                Leave blank to use current avg cost (${effectiveCost.toFixed(2)})
              </p>
            </div>

            {/* Live avg preview */}
            {previewAvg !== null && (
              <div style={{ background:'var(--blue-light)', borderRadius:10, padding:'10px 14px', marginBottom:14, border:'1px solid #bfdbfe' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--blue-dark)' }}>
                  📊 New average cost: ${previewAvg.toFixed(2)}/unit
                </p>
                <p style={{ fontSize:12, color:'var(--blue)', marginTop:2 }}>
                  Was ${effectiveCost.toFixed(2)} · New profit: ${(product.sell_price - previewAvg).toFixed(2)}/unit · {product.sell_price > 0 ? ((product.sell_price - previewAvg)/product.sell_price*100).toFixed(0) : 0}% margin
                </p>
              </div>
            )}

            {/* Source */}
            <div className="form-group">
              <label className="form-label">Source / Supplier <span className="text-muted" style={{ fontWeight:400, fontSize:12 }}>(optional)</span></label>
              <input className="form-input" value={form.source}
                onChange={e => setForm(f=>({...f, source:e.target.value}))}
                placeholder="e.g. Walmart, Alibaba, Costco" />
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">Note <span className="text-muted" style={{ fontWeight:400, fontSize:12 }}>(optional)</span></label>
              <input className="form-input" value={form.note}
                onChange={e => setForm(f=>({...f, note:e.target.value}))}
                placeholder="e.g. New delivery, better deal" />
            </div>

            {/* Total cost preview */}
            {form.qty && form.costPerUnit && (
              <div style={{ background:'var(--gray-light)', borderRadius:8, padding:'8px 12px', marginBottom:14 }}>
                <p className="text-sm">
                  💰 Total spend: <strong>${(parseInt(form.qty||0)*parseFloat(form.costPerUnit||0)).toFixed(2)}</strong>
                </p>
              </div>
            )}

            <button className="btn btn-success btn-full" onClick={handleAddStock}
              disabled={loading || !form.qty}>
              {loading ? 'Saving...' : `Add ${form.qty||0} ${product.unit}s to stock`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
